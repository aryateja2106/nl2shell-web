import { NextResponse } from "next/server";
import type { EnvironmentProbe } from "@/lib/mission/env-probe";
import {
  fallbackTranslate,
  isWeakCommand,
  translateWithSidecar,
} from "@/lib/mission/local-sidecar";
import { probeHost } from "@/lib/mission/probe-host";
import { checkCommandSafety } from "@/lib/mission/safety";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { query?: string; env?: EnvironmentProbe };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const env = body.env || probeHost();

  try {
    let result: {
      command: string;
      explanation: string;
      meta: string;
      raw?: string;
    };
    try {
      result = await translateWithSidecar(query, env);
    } catch {
      result = fallbackTranslate(query, env);
    }

    // Guard: never brew on Linux; replace weak tiny-model outputs
    if (
      (env.os !== "darwin" &&
        /\bbrew\b/.test(result.command) &&
        env.packageManager !== "brew") ||
      isWeakCommand(result.command, query)
    ) {
      result = fallbackTranslate(query, env);
    }

    const safety = checkCommandSafety(result.command);
    return NextResponse.json({
      command: result.command,
      explanation: result.explanation,
      risk: safety.level,
      safety,
      env,
      meta: result.meta,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
