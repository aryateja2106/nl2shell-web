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
  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (isFeedbackRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const { query, command, rating, correction } = await request.json();

    if (
      !query ||
      !command ||
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

    logger.info("feedback", {
      query: query.slice(0, 500),
      command: command.slice(0, 1000),
      rating,
      ...(correction && { correction: correction.slice(0, 1000) }),
    });

    // Persist to Supabase if configured (best-effort, non-blocking)
    saveFeedback({ query, command, rating, correction, ip }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    logger.error("feedback_error", { message: "Failed to process feedback" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
