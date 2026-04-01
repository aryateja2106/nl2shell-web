import type {
  SandboxSession,
  ExecutionResult,
  SessionCreateResponse,
} from "@/types/sandbox";

const RELAY_URL =
  process.env.NEXT_PUBLIC_SANDBOX_RELAY_URL ||
  process.env.SANDBOX_RELAY_URL ||
  "http://localhost:4000";

async function relayFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${RELAY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Relay error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function createSession(): Promise<SessionCreateResponse> {
  return relayFetch<SessionCreateResponse>("/session", { method: "POST" });
}

export async function getSession(id: string): Promise<SandboxSession> {
  return relayFetch<SandboxSession>(`/session/${id}`);
}

export async function listSessions(): Promise<SandboxSession[]> {
  return relayFetch<SandboxSession[]>("/session");
}

export async function deleteSession(id: string): Promise<void> {
  await relayFetch(`/session/${id}`, { method: "DELETE" });
}

export async function resumeSession(id: string): Promise<SandboxSession> {
  return relayFetch<SandboxSession>(`/session/${id}/resume`, {
    method: "POST",
  });
}

export async function executeCommand(
  sessionId: string,
  command: string,
  timeoutMs?: number
): Promise<ExecutionResult> {
  return relayFetch<ExecutionResult>("/exec", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      command,
      timeout_ms: timeoutMs ?? 30000,
    }),
  });
}

export function isSandboxEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SANDBOX_ENABLED === "true";
}
