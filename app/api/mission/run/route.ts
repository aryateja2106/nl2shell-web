import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { checkCommandSafety } from "@/lib/mission/safety";

export const runtime = "nodejs";
export const maxDuration = 60;

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  let body: {
    command?: string;
    confirmed?: boolean;
    mode?: "sandbox" | "host";
    dangerAck?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const command = body.command?.trim();
  if (!command) {
    return NextResponse.json({ error: "command required" }, { status: 400 });
  }
  if (!body.confirmed) {
    return NextResponse.json(
      { error: "confirmed: true required" },
      { status: 400 },
    );
  }

  const safety = checkCommandSafety(command);
  if (safety.level === "danger" && !body.dangerAck) {
    return NextResponse.json(
      { error: "Dangerous command blocked", safety },
      { status: 403 },
    );
  }

  const mode = body.mode || "sandbox";
  const hostAllowed = process.env.MISSION_HOST_EXEC === "1";

  if (mode === "sandbox" || !hostAllowed) {
    return NextResponse.json({
      stdout: `[sandbox dry-run] ${command}\n`,
      stderr: "",
      exitCode: 0,
      mode: "sandbox",
      note:
        mode === "host" && !hostAllowed
          ? "MISSION_HOST_EXEC not enabled — dry-run only"
          : "sandbox",
    });
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "/bin/bash",
      ["-lc", command],
      { timeout: 60_000, maxBuffer: 1024 * 1024 },
    );
    return NextResponse.json({
      stdout,
      stderr,
      exitCode: 0,
      mode: "host",
      safety,
    });
  } catch (err) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
    };
    return NextResponse.json({
      stdout: e.stdout || "",
      stderr: e.stderr || e.message || String(err),
      exitCode: typeof e.code === "number" ? e.code : 1,
      mode: "host",
      safety,
    });
  }
}
