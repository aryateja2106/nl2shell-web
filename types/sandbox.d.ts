export interface SandboxSession {
  id: string;
  status: "running" | "stopped" | "expired";
  createdAt: number;
  lastActive: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  auditId?: string;
}

export interface ExecRequest {
  sessionId: string;
  command: string;
  timeout_ms?: number;
}

export interface SessionCreateResponse {
  id: string;
  status: string;
  createdAt: number;
}
