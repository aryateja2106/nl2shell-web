import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { v4 as uuidv4 } from "uuid";
import {
  createContainer,
  execInContainer,
  stopContainer,
  removeContainer,
  restartContainer,
  isContainerRunning,
} from "./container-manager.js";
import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  updateLastActive,
  updateStatus,
} from "./session-store.js";
import { isBlocked, getBlockReason } from "./security.js";
import { recordAudit } from "./audit.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env["RELAY_PORT"] ?? "4000", 10);
const CORS_ORIGIN = process.env["CORS_ORIGIN"] ?? "*";
const API_KEY = process.env["RELAY_API_KEY"] ?? null;

// Rate limiting: 10 exec/min per session
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const execCounts = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const record = execCounts.get(sessionId);

  if (!record || now - record.windowStart > RATE_WINDOW_MS) {
    execCounts.set(sessionId, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) return false;

  record.count += 1;
  return true;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Hono();

// CORS
app.use(
  "*",
  cors({
    origin: CORS_ORIGIN,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Optional API key auth
app.use("*", async (c, next) => {
  if (!API_KEY) return next();

  const authHeader = c.req.header("Authorization");
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /health
app.get("/health", (c) => {
  const sessions = listSessions();
  return c.json({
    status: "ok",
    sessions: sessions.length,
    version: "0.1.0",
  });
});

// POST /session — create a new sandbox session
app.post("/session", async (c) => {
  const sessionId = uuidv4();

  try {
    const container = createContainer(sessionId);
    const session = createSession(
      sessionId,
      container.containerName,
      container.volumeName
    );

    return c.json(
      {
        id: session.id,
        status: session.status,
        createdAt: new Date(session.created_at).toISOString(),
      },
      201
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[relay] createContainer failed:", message);
    return c.json({ error: "Failed to create sandbox container", detail: message }, 500);
  }
});

// GET /session/:id — session metadata
app.get("/session/:id", (c) => {
  const id = c.req.param("id");
  const session = getSession(id);

  if (!session) return c.json({ error: "Session not found" }, 404);

  return c.json({
    id: session.id,
    status: session.status,
    containerName: session.container_name,
    createdAt: new Date(session.created_at).toISOString(),
    lastActive: new Date(session.last_active).toISOString(),
  });
});

// DELETE /session/:id — stop and remove container
app.delete("/session/:id", (c) => {
  const id = c.req.param("id");
  const session = getSession(id);

  if (!session) return c.json({ error: "Session not found" }, 404);

  try {
    stopContainer(session.container_name);
    removeContainer(session.container_name, session.volume_name);
    deleteSession(id);
    execCounts.delete(id);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[relay] deleteSession failed:", message);
    return c.json({ error: "Failed to remove container", detail: message }, 500);
  }
});

// POST /session/:id/resume — restart stopped container
app.post("/session/:id/resume", (c) => {
  const id = c.req.param("id");
  const session = getSession(id);

  if (!session) return c.json({ error: "Session not found" }, 404);

  try {
    restartContainer(session.container_name);
    updateStatus(id, "running");
    updateLastActive(id);

    return c.json({ id, status: "running" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[relay] resumeSession failed:", message);
    return c.json({ error: "Failed to resume container", detail: message }, 500);
  }
});

// POST /exec — execute a command in a session's container
app.post("/exec", async (c) => {
  let body: { sessionId?: unknown; command?: unknown; timeout_ms?: unknown };

  try {
    body = await c.req.json<typeof body>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { sessionId, command, timeout_ms } = body;

  if (typeof sessionId !== "string" || !sessionId) {
    return c.json({ error: "sessionId is required and must be a string" }, 400);
  }
  if (typeof command !== "string" || !command) {
    return c.json({ error: "command is required and must be a string" }, 400);
  }

  const timeoutMs = typeof timeout_ms === "number"
    ? Math.min(Math.max(timeout_ms, 1000), 120_000)
    : 30_000;

  // Session lookup
  const session = getSession(sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);

  // Rate limiting
  if (!checkRateLimit(sessionId)) {
    return c.json(
      { error: "Rate limit exceeded: max 10 exec/min per session" },
      429
    );
  }

  // Security check
  const blockReason = getBlockReason(command);
  if (blockReason) {
    const audit = recordAudit({
      sessionId,
      tool: "exec",
      input: { command, timeout_ms: timeoutMs },
      output: blockReason,
      status: "blocked",
      durationMs: 0,
    });
    return c.json({ error: "Command blocked", reason: blockReason, auditId: audit.id }, 400);
  }

  // Container liveness check
  if (!isContainerRunning(session.container_name)) {
    updateStatus(sessionId, "stopped");
    return c.json(
      { error: "Container is not running. Use POST /session/:id/resume to restart." },
      400
    );
  }

  // Execute
  const result = execInContainer(session.container_name, command, timeoutMs);

  updateLastActive(sessionId);

  const status = result.exitCode === 0 ? "success" : "error";
  const audit = recordAudit({
    sessionId,
    tool: "exec",
    input: { command, timeout_ms: timeoutMs },
    output: result.stdout + result.stderr,
    status,
    durationMs: result.durationMs,
  });

  return c.json({
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    auditId: audit.id,
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[relay] listening on http://localhost:${info.port}`);
});
