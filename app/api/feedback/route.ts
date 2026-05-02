import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { saveFeedback } from "@/lib/supabase";

// Simple rate limit: 10 feedback submissions per IP per minute
const feedbackRateMap = new Map<string, { count: number; resetAt: number }>();
const FEEDBACK_LIMIT = 10;
const WINDOW_MS = 60_000;

// Periodic cleanup to prevent memory leaks in long-lived processes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of feedbackRateMap) {
    if (now > entry.resetAt) feedbackRateMap.delete(key);
  }
}, WINDOW_MS);

function isFeedbackRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = feedbackRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    feedbackRateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > FEEDBACK_LIMIT;
}

export async function POST(request: Request) {
  // x-real-ip is set by Vercel and cannot be spoofed by the client
  const ip = request.headers.get("x-real-ip") || "unknown";

  if (isFeedbackRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const body = await request.json();
    const {
      query,
      command,
      rating,
      correction,
      source,
      executed,
      terminal_output_excerpt,
    } = body as {
      query?: string;
      command?: string;
      rating?: string;
      correction?: string;
      source?: string;
      executed?: boolean;
      terminal_output_excerpt?: string;
    };

    if (
      !query ||
      !command ||
      typeof rating !== "string" ||
      !["up", "down"].includes(rating) ||
      typeof query !== "string" ||
      typeof command !== "string" ||
      query.length > 1000 ||
      command.length > 2000
    ) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    }

    if (correction && (typeof correction !== "string" || correction.length > 2000)) {
      return NextResponse.json({ error: "Invalid correction" }, { status: 400 });
    }

    const src =
      typeof source === "string" ? source.slice(0, 64) : undefined;
    const excerpt =
      typeof terminal_output_excerpt === "string"
        ? terminal_output_excerpt.slice(0, 8000)
        : undefined;

    logger.info("feedback", {
      query: query.slice(0, 500),
      command: command.slice(0, 1000),
      rating,
      ...(correction && { correction: correction.slice(0, 1000) }),
      ...(src && { source: src }),
      ...(typeof executed === "boolean" && { executed }),
      ...(excerpt && { terminal_output_excerpt: excerpt.slice(0, 2000) }),
    });

    if (src || typeof executed === "boolean" || excerpt) {
      logger.info("feedback_rl", {
        source: src ?? "translate",
        executed: executed ?? null,
        query: query.slice(0, 500),
        command: command.slice(0, 1000),
        rating,
        correction: correction?.slice(0, 1000) ?? null,
        terminal_output_excerpt: excerpt?.slice(0, 4000) ?? null,
      });
    }

    // Persist to Supabase if configured (best-effort, non-blocking)
    saveFeedback({
      query,
      command,
      rating: rating as "up" | "down",
      correction,
      ip,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    logger.error("feedback_error", { message: "Failed to process feedback" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
