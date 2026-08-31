import type { EnvironmentProbe } from "./env-probe";

function sidecarBase(): string {
  return (
    process.env.NL2SHELL_SIDECAR_URL ||
    "http://127.0.0.1:11434/v1"
  ).replace(/\/$/, "");
}

function sidecarModel(): string {
  return process.env.NL2SHELL_MODEL || "qwen2.5-coder:0.5b";
}

function systemPrompt(env: EnvironmentProbe): string {
  return `You translate natural language to a single shell command for this host.
Environment:
${JSON.stringify(
  {
    arch: env.arch,
    os: env.os,
    osId: env.osId,
    packageManager: env.packageManager,
    homeStyle: env.homeStyle,
    hasSsh: env.hasSsh,
    hasTmux: env.hasTmux,
    hasVnc: env.hasVnc,
  },
  null,
  2,
)}

Rules:
- First line: the shell command only.
- Optional second line starting with #: short explanation.
- packageManager=${env.packageManager}. Never brew unless os is darwin.
- Prefer -y / --noconfirm for installs.
- No markdown fences.`;
}

function extractCommand(text: string): { command: string; explanation: string } {
  const cleaned = text
    .replace(/```(?:bash|sh|shell)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let command = (lines[0] || "").replace(/^\$\s*/, "");
  // Tiny models often put explanation after the command on the same blob —
  // keep only the first shell-looking segment.
  const shellish = command.match(
    /^((?:sudo\s+)?(?:apt(?:-get)?|dnf|pacman|brew|tmux|ssh|ss|ls|uname|mkdir|cd|echo|pgrep|systemctl)\b[^;\n]*)/,
  );
  if (shellish) command = shellish[1].trim();
  const explanation = lines
    .slice(1)
    .map((l) => l.replace(/^#\s*/, ""))
    .join(" ")
    .trim();
  return { command, explanation };
}

/** True when sidecar output is too broken to trust. */
export function isWeakCommand(command: string, query: string): boolean {
  const c = command.trim();
  if (!c || c.length < 3) return true;
  if (/\bthen\s*$/.test(c) || /\belse\s*$/.test(c) || /\bfi\s*$/.test(c))
    return true;
  if ((c.match(/"/g) || []).length % 2 === 1) return true;
  if ((c.match(/'/g) || []).length % 2 === 1) return true;
  const wantsInstall = /\binstall\b/i.test(query);
  if (wantsInstall && /\bapt/.test(c) && !/\binstall\b/.test(c)) return true;
  if (wantsInstall && !/\b(install|apt|dnf|pacman|brew)\b/i.test(c))
    return true;
  return false;
}

export async function pingSidecar(): Promise<{
  ok: boolean;
  baseURL: string;
  model: string;
  error?: string;
}> {
  const baseURL = sidecarBase();
  const model = sidecarModel();
  try {
    const res = await fetch(`${baseURL}/models`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return { ok: false, baseURL, model, error: `HTTP ${res.status}` };
    }
    return { ok: true, baseURL, model };
  } catch (e) {
    return {
      ok: false,
      baseURL,
      model,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function translateWithSidecar(
  query: string,
  env: EnvironmentProbe,
): Promise<{ command: string; explanation: string; raw: string; meta: string }> {
  const baseURL = sidecarBase();
  const model = sidecarModel();
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 128,
      messages: [
        { role: "system", content: systemPrompt(env) },
        { role: "user", content: query },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sidecar ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content || "";
  const { command, explanation } = extractCommand(raw);
  return {
    command,
    explanation,
    raw,
    meta: `local · ${model} · ${env.packageManager}/${env.arch}`,
  };
}

/** Deterministic fallback when sidecar is offline — still env-aware. */
export function fallbackTranslate(
  query: string,
  env: EnvironmentProbe,
): { command: string; explanation: string; meta: string } {
  const q = query.toLowerCase();
  const pkg =
    query.match(/install\s+([a-z0-9._+-]+)/i)?.[1] ||
    query.match(/package\s+([a-z0-9._+-]+)/i)?.[1];

  if (pkg) {
    if (env.packageManager === "brew") {
      return {
        command: `brew install ${pkg}`,
        explanation: `Install ${pkg} with Homebrew on macOS`,
        meta: "fallback · brew",
      };
    }
    if (env.packageManager === "dnf") {
      return {
        command: `sudo dnf install -y ${pkg}`,
        explanation: `Install ${pkg} with dnf`,
        meta: "fallback · dnf",
      };
    }
    if (env.packageManager === "pacman") {
      return {
        command: `sudo pacman -S --noconfirm ${pkg}`,
        explanation: `Install ${pkg} with pacman`,
        meta: "fallback · pacman",
      };
    }
    return {
      command: `sudo apt-get update && sudo apt-get install -y ${pkg}`,
      explanation: `Install ${pkg} with apt (Linux)`,
      meta: "fallback · apt",
    };
  }

  if (/\btmux\b/.test(q) && /new|start|create|session/.test(q)) {
    return {
      command: "tmux new -s mission",
      explanation: "Create a new tmux session named mission",
      meta: "fallback · tmux",
    };
  }
  if (/\btmux\b/.test(q) && /attach|join/.test(q)) {
    return {
      command: "tmux attach -t mission",
      explanation: "Attach to tmux session mission",
      meta: "fallback · tmux",
    };
  }
  if (/\bvnc\b/.test(q)) {
    return {
      command: "ss -ltn | grep 5900 || true; pgrep -a vnc || true",
      explanation: "Check if VNC is listening on :5900",
      meta: "fallback · vnc",
    };
  }
  if (/\bssh\b/.test(q)) {
    return {
      command: "ls -la ~/.ssh && ssh-add -l 2>/dev/null || true",
      explanation: "Inspect local SSH keys/agent",
      meta: "fallback · ssh",
    };
  }
  if (/architecture|what os|environment|probe|where am i/.test(q)) {
    return {
      command: `uname -a; echo PKG=${env.packageManager}; echo HOME=${env.home}`,
      explanation: "Print architecture, package manager, and home",
      meta: "fallback · probe",
    };
  }

  return {
    command: `echo ${JSON.stringify(query)}`,
    explanation: "Sidecar offline — echo fallback",
    meta: "fallback · offline",
  };
}
