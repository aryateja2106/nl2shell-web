import { NextResponse } from "next/server";

export const maxDuration = 60;

const RELAY_URL = process.env.SANDBOX_RELAY_URL || "http://localhost:4000";

// Rate limit: 20 requests/min per IP (MCP endpoint)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(key);
  }
}, RATE_WINDOW_MS);

function getClientIp(request: Request): string {
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
}

function jsonRpcResult(id: unknown, result: unknown) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    result,
  });
}

// Tool definitions
const TOOLS = [
  {
    name: "leshell_translate",
    description:
      "Translate a natural language description into a shell command. Returns the best matching bash command for the given request.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language description of the shell operation to perform",
        },
        os_context: {
          type: "string",
          description: "Optional OS context string (e.g. 'OS: macOS 15.3 (arm64)')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "leshell_execute",
    description:
      "Execute a shell command inside an isolated Docker sandbox container. Requires an active session ID.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Active sandbox session UUID",
        },
        command: {
          type: "string",
          description: "Shell command to execute",
        },
        timeout_ms: {
          type: "number",
          description: "Execution timeout in milliseconds (default: 30000, max: 60000)",
        },
      },
      required: ["sessionId", "command"],
    },
  },
  {
    name: "leshell_explain",
    description:
      "Explain what a shell command does in plain English. Returns a human-readable description of the command's behavior.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to explain",
        },
      },
      required: ["command"],
    },
  },
];

async function handleTranslate(
  args: { query?: unknown; os_context?: unknown },
  requestUrl: string
): Promise<unknown> {
  const query = args.query;
  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("query is required and must be a non-empty string");
  }

  const base = new URL(requestUrl).origin;
  const res = await fetch(`${base}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query.trim() }),
  });

  const data = (await res.json()) as { command?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Translation failed");
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ command: data.command }),
      },
    ],
  };
}

async function handleExecute(args: {
  sessionId?: unknown;
  command?: unknown;
  timeout_ms?: unknown;
}): Promise<unknown> {
  const { sessionId, command, timeout_ms } = args;

  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("sessionId is required");
  }
  if (!command || typeof command !== "string") {
    throw new Error("command is required");
  }

  const res = await fetch(`${RELAY_URL}/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      command,
      timeout_ms: typeof timeout_ms === "number" ? Math.min(timeout_ms, 60000) : 30000,
    }),
  });

  const data = (await res.json()) as {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || "Execution failed");
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          stdout: data.stdout ?? "",
          stderr: data.stderr ?? "",
          exitCode: data.exitCode ?? -1,
        }),
      },
    ],
  };
}

async function handleExplain(
  args: { command?: unknown },
  requestUrl: string
): Promise<unknown> {
  const command = args.command;
  if (!command || typeof command !== "string" || !command.trim()) {
    throw new Error("command is required and must be a non-empty string");
  }

  // Use the translate endpoint with an explain-framing prompt
  const query = `explain what this command does: ${command.trim()}`;
  const base = new URL(requestUrl).origin;

  const res = await fetch(`${base}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const data = (await res.json()) as { command?: string; error?: string };

  // The model returns a command here; we surface it as-is since the fine-tuned
  // model interprets "explain ..." queries as explanation text.
  const explanation = res.ok && data.command
    ? data.command
    : `Runs: ${command.trim()}`;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ explanation }),
      },
    ],
  };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error: invalid JSON");
  }

  if (body.jsonrpc !== "2.0") {
    return jsonRpcError(body.id ?? null, -32600, "Invalid Request: jsonrpc must be '2.0'");
  }

  const { id, method, params } = body;

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2024-11-05",
      serverInfo: {
        name: "leshell",
        version: "1.0.0",
      },
      capabilities: {
        tools: {},
      },
    });
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const callParams = params as { name?: string; arguments?: Record<string, unknown> } | undefined;

    if (!callParams?.name) {
      return jsonRpcError(id, -32602, "Invalid params: tool name is required");
    }

    const toolArgs = callParams.arguments ?? {};

    try {
      let result: unknown;

      switch (callParams.name) {
        case "leshell_translate":
          result = await handleTranslate(toolArgs, request.url);
          break;
        case "leshell_execute":
          result = await handleExecute(toolArgs);
          break;
        case "leshell_explain":
          result = await handleExplain(toolArgs, request.url);
          break;
        default:
          return jsonRpcError(id, -32601, `Unknown tool: ${callParams.name}`);
      }

      return jsonRpcResult(id, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool execution failed";
      return jsonRpcResult(id, {
        content: [{ type: "text", text: message }],
        isError: true,
      });
    }
  }

  return jsonRpcError(id, -32601, `Method not found: ${method ?? "(none)"}`);
}

// MCP clients may probe with GET to discover the endpoint
export async function GET() {
  return NextResponse.json({
    name: "leshell",
    version: "1.0.0",
    description: "LeShell MCP endpoint — translate, execute, and explain shell commands",
    protocol: "MCP Streamable HTTP (JSON-RPC 2.0)",
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}
