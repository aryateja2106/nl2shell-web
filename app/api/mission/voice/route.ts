import { NextResponse } from "next/server";
import {
  fallbackTranslate,
  isWeakCommand,
  translateWithSidecar,
} from "@/lib/mission/local-sidecar";
import { probeHost } from "@/lib/mission/probe-host";
import { checkCommandSafety } from "@/lib/mission/safety";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Accept ASR transcript from Web Speech or Nemotron/Macparakeet bridge.
 * Same pipeline as /api/mission/translate.
 */
export async function POST(request: Request) {
  let body: { transcript?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transcript = body.transcript?.trim();
  if (!transcript) {
    return NextResponse.json({ error: "transcript required" }, { status: 400 });
  }

  const env = probeHost();
  let result;
  try {
    result = await translateWithSidecar(transcript, env);
  } catch {
    result = fallbackTranslate(transcript, env);
  }

  if (
    (env.os !== "darwin" &&
      /\bbrew\b/.test(result.command) &&
      env.packageManager !== "brew") ||
    isWeakCommand(result.command, transcript)
  ) {
    result = fallbackTranslate(transcript, env);
  }

  const safety = checkCommandSafety(result.command);
  return NextResponse.json({
    transcript,
    source: body.source || "web-speech",
    command: result.command,
    explanation: result.explanation,
    risk: safety.level,
    safety,
    env,
    meta: result.meta,
  });
}
