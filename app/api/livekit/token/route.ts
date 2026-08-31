import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    return NextResponse.json({ demoMode: true });
  }

  const roomName = `nl2shell-voice-${Date.now()}`;
  const identity = `user-${Math.random().toString(36).slice(2, 9)}`;

  const at = new AccessToken(apiKey, apiSecret, { identity, ttl: "15m" });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json(
    { demoMode: false, url, token, roomName, identity },
    { headers: { "Cache-Control": "no-store" } },
  );
}
