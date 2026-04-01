import { NextResponse } from "next/server";

export const maxDuration = 60;

const RELAY_URL = process.env.SANDBOX_RELAY_URL || "http://localhost:4000";

// Stricter rate limit for execution: 10/min per IP
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
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

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many execution requests. Please wait." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: { sessionId?: string; command?: string; timeout_ms?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.sessionId || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  if (!body.command || typeof body.command !== "string") {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }

  if (body.command.length > 4096) {
    return NextResponse.json({ error: "Command too long (max 4096 chars)" }, { status: 400 });
  }

  try {
    const res = await fetch(`${RELAY_URL}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: body.sessionId,
        command: body.command,
        timeout_ms: body.timeout_ms ?? 30000,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Execution failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Sandbox relay unavailable. Is it running?" },
      { status: 503 }
    );
  }
}
