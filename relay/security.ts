const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+(-rf?|--recursive)\s+\//i,
  /mkfs/i,
  /dd\s+if=/i,
  /:()\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/,
  /curl.*\|\s*(ba)?sh/i,
  /wget.*\|\s*(ba)?sh/i,
  /chmod\s+[0-7]*s/i,
  /chown\s+root/i,
  /nsenter/i,
  /mount\s/i,
  /umount/i,
  /shutdown/i,
  /reboot/i,
  /halt\b/i,
  /docker\b/i,
  /kubectl/i,
];

export function isBlocked(command: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(command));
}

export function getBlockReason(command: string): string | null {
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(command)) return `Command matches security pattern: ${p.source}`;
  }
  return null;
}
