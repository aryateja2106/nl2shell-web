import { NextResponse } from "next/server";
import { probeHost } from "@/lib/mission/probe-host";

export const runtime = "nodejs";

export async function GET() {
  const env = probeHost();
  return NextResponse.json(env);
}
