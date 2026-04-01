import { NextResponse } from "next/server";

const RELAY_URL = process.env.SANDBOX_RELAY_URL || "http://localhost:4000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const res = await fetch(`${RELAY_URL}/session/${id}`);
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Sandbox relay unavailable" }, { status: 503 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const res = await fetch(`${RELAY_URL}/session/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json({ error: data.error }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sandbox relay unavailable" }, { status: 503 });
  }
}
