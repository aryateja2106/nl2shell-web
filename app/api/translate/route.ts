import { Client } from "@gradio/client";
import { NextResponse } from "next/server";
import { cleanResponse } from "@/lib/clean-response";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

// In-memory rate limiter: max 30 requests per IP per minute
// Note: on Vercel serverless, this resets per cold start. For production,
// upgrade to Upstash @upstash/ratelimit with Redis for cross-instance limiting.
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

// Periodic cleanup to prevent memory leaks in long-lived processes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(key);
  }
}, RATE_WINDOW_MS);

function getClientIp(request: Request): string {
  // Vercel sets x-real-ip from actual connection (cannot be spoofed by client)
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
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
  const start = performance.now();
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    logger.warn("rate_limited", { ip });
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const query = body.query;
    const temperature = Math.min(Math.max(Number(body.temperature) || 0.1, 0), 2);
    const maxTokens = Math.min(Math.max(Number(body.maxTokens) || 128, 1), 512);

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length > 500) {
      return NextResponse.json(
        { error: "Query too long (max 500 characters)" },
        { status: 400 }
      );
    }

    logger.info("translate_start", { query: trimmedQuery, ip });

    const client = await Client.connect("AryaYT/nl2shell-demo", {
      token: (process.env.HF_TOKEN as `hf_${string}`) || undefined,
    });

    const result = await client.predict("/generate", {
      user_request: trimmedQuery,
      temperature,
      max_new_tokens: maxTokens,
    });

    const data = result.data as [string, string];
    const command = cleanResponse(data[0] || "");
    const meta = data[1] || "";
    const durationMs = Math.round(performance.now() - start);

    if (!command) {
      logger.warn("translate_empty", { query: trimmedQuery, durationMs });
      return NextResponse.json(
        { error: "Model returned empty response" },
        { status: 502 }
      );
    }

    logger.info("translate_success", {
      query: trimmedQuery,
      command,
      durationMs,
    });

    return NextResponse.json({ command, meta });
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : "Translation failed";

    logger.error("translate_error", { message, durationMs, ip });

    if (message.includes("timeout") || message.includes("504")) {
      return NextResponse.json(
        { error: "Model is warming up. Please try again in a few seconds." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Translation failed. Please try again." },
      { status: 500 }
    );
  }
}
