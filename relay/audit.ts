import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const AUDIT_DIR = "./data/audit";

export interface AuditEntry {
  id: string;
  sessionId: string;
  tool: string;
  input: Record<string, unknown>;
  output: string;
  status: "success" | "error" | "blocked";
  durationMs: number;
  timestamp: string;
}

export function recordAudit(
  entry: Omit<AuditEntry, "id" | "timestamp">
): AuditEntry {
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });

  const full: AuditEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  const file = join(AUDIT_DIR, `${entry.sessionId}.jsonl`);
  appendFileSync(file, JSON.stringify(full) + "\n");
  return full;
}
