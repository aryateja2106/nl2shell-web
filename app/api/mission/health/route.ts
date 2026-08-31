import { NextResponse } from "next/server";
import { pingSidecar } from "@/lib/mission/local-sidecar";

export const runtime = "nodejs";

export async function GET() {
  const ping = await pingSidecar();
  return NextResponse.json({
    ok: ping.ok,
    sidecar: ping,
    hostExec: process.env.MISSION_HOST_EXEC === "1",
  });
}
