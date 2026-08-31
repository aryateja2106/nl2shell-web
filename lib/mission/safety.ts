export type SafetyLevel = "safe" | "caution" | "danger";

export type SafetyResult = {
  ok: boolean;
  level: SafetyLevel;
  reasons: string[];
};

const DANGER = [
  /rm\s+-rf\s+\/\s*$/i,
  /rm\s+-rf\s+\/\s*;/i,
  /rm\s+-rf\s+~\/?\s*$/i,
  /mkfs\./i,
  /dd\s+if=\/dev\/(zero|random)/i,
  /:\(\)\s*\{\s*:\|:&\s*\}\s*;\s*:/,
  /chmod\s+-R\s+777\s+\//i,
];

const CAUTION = [
  /curl\s+[^|]+\|\s*(ba)?sh/i,
  /wget\s+[^|]+\|\s*(ba)?sh/i,
  /\bsudo\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /systemctl\s+(stop|disable|mask)/i,
];

export function checkCommandSafety(command: string): SafetyResult {
  const cmd = command.trim();
  const reasons: string[] = [];
  let level: SafetyLevel = "safe";

  for (const re of DANGER) {
    if (re.test(cmd)) {
      reasons.push(`Danger pattern: ${re}`);
      level = "danger";
    }
  }
  if (level !== "danger") {
    for (const re of CAUTION) {
      if (re.test(cmd)) {
        reasons.push(`Caution: ${re}`);
        level = "caution";
      }
    }
  }

  return { ok: level !== "danger", level, reasons };
}
