import { NextResponse } from "next/server";

const RELAY_URL = process.env.SANDBOX_RELAY_URL || "http://localhost:4000";

export async function POST() {
  try {
    const res = await fetch(`${RELAY_URL}/session`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Session creation failed" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Sandbox relay unavailable" },
      { status: 503 }
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${RELAY_URL}/session`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Sandbox relay unavailable" },
      { status: 503 }
    );
  }
}
