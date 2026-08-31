"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Terminal, Mic } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import type { EnvironmentProbe } from "@/lib/mission/env-probe";

type ExecMode = "sandbox" | "host";

type TranslateResult = {
  command: string;
  explanation: string;
  risk: string;
  meta: string;
  env: EnvironmentProbe;
};

export default function MissionPage() {
  const [input, setInput] = useState("");
  const [env, setEnv] = useState<EnvironmentProbe | null>(null);
  const [health, setHealth] = useState<{
    ok: boolean;
    sidecar?: { baseURL: string; model: string; error?: string };
  } | null>(null);
  const [mode, setMode] = useState<ExecMode>("sandbox");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mission/probe")
      .then((r) => r.json())
      .then(setEnv)
      .catch(() => setEnv(null));
    fetch("/api/mission/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  const translate = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;
      setLoading(true);
      setError(null);
      setResult(null);
      setOutput("");
      try {
        const res = await fetch("/api/mission/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, env: env || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Translate failed");
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [env],
  );

  const runConfirmed = useCallback(async () => {
    if (!result?.command) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mission/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: result.command,
          confirmed: true,
          mode,
          dangerAck: result.risk === "danger",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Run failed");
      setOutput(
        [
          data.stdout || "",
          data.stderr || "",
          data.note ? `# ${data.note}` : "",
          `exit ${data.exitCode}`,
        ]
          .filter(Boolean)
          .join(""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [result, mode]);

  const onVoice = useCallback(
    (text: string) => {
      setInput(text);
      translate(text);
    },
    [translate],
  );

  return (
    <main className="min-h-screen bg-[#0b0f0c] text-[#c8e6c9] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2e4432] pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b9b72]">
              NL2Shell
            </p>
            <h1 className="mt-1 flex items-center gap-2 font-mono text-2xl text-[#e8f5e9]">
              <Terminal className="size-6" />
              Mission Control
            </h1>
            <p className="mt-1 text-sm text-[#8fbc8f]">
              Local-first NL→shell. Probe environment, preview command, confirm
              run.
            </p>
          </div>
          <Link
            href="/voice"
            className="text-sm text-[#8fbc8f] underline-offset-4 hover:underline"
          >
            Voice demo →
          </Link>
        </header>

        <section className="grid gap-3 sm:grid-cols-3 font-mono text-xs">
          <div className="rounded border border-[#2e4432] bg-[#111814] p-3">
            <div className="text-[#6b9b72]">ENV</div>
            <div className="mt-1 text-[#e8f5e9]">
              {env
                ? `${env.osId} · ${env.arch} · ${env.packageManager}`
                : "probing…"}
            </div>
            {env && (
              <div className="mt-1 text-[#6b9b72]">
                ssh:{env.hasSsh ? "✓" : "–"} tmux:{env.hasTmux ? "✓" : "–"} vnc:
                {env.hasVnc ? "✓" : "–"}
              </div>
            )}
          </div>
          <div className="rounded border border-[#2e4432] bg-[#111814] p-3">
            <div className="text-[#6b9b72]">SIDECAR</div>
            <div className="mt-1 text-[#e8f5e9]">
              {health?.ok ? "online" : "offline / fallback"}
            </div>
            <div className="mt-1 truncate text-[#6b9b72]">
              {health?.sidecar?.model || "—"}
            </div>
          </div>
          <div className="rounded border border-[#2e4432] bg-[#111814] p-3">
            <div className="text-[#6b9b72]">EXEC MODE</div>
            <div className="mt-2 flex gap-2">
              {(["sandbox", "host"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded px-2 py-1 ${
                    mode === m
                      ? "bg-[#2ea44f] text-black"
                      : "bg-[#1a241c] text-[#8fbc8f]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded border border-[#2e4432] bg-[#111814] p-4 space-y-3">
          <label className="block font-mono text-xs text-[#6b9b72]">
            NATURAL LANGUAGE
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                translate(input);
              }
            }}
            rows={3}
            placeholder="e.g. install htop · create a tmux session · check if VNC is listening"
            className="w-full resize-none rounded border border-[#2e4432] bg-[#0b0f0c] p-3 font-mono text-sm text-[#e8f5e9] outline-none focus:border-[#2ea44f]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => translate(input)}
              className="inline-flex items-center gap-2 rounded bg-[#2ea44f] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Terminal className="size-4" />
              )}
              Translate
            </button>
            <div className="flex items-center gap-2 text-xs text-[#6b9b72]">
              <Mic className="size-3.5" />
              Web Speech (Nemotron via Macparakeet when bridged)
            </div>
            <VoiceInput onTranscript={onVoice} disabled={loading} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              "what environment am I on",
              "install htop",
              "create a tmux session named mission",
              "check if VNC is listening",
              "show my ssh keys",
            ].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setInput(ex);
                  translate(ex);
                }}
                className="rounded border border-[#2e4432] px-2 py-1 text-[#8fbc8f] hover:border-[#2ea44f]"
              >
                {ex}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p className="rounded border border-red-900/50 bg-red-950/30 p-3 font-mono text-sm text-red-300">
            {error}
          </p>
        )}

        {result && (
          <section className="rounded border border-[#2e4432] bg-[#111814] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#6b9b72]">
                COMMAND PREVIEW · risk={result.risk} · {result.meta}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="rounded border border-[#2e4432] px-3 py-1.5 text-sm text-[#8fbc8f]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={runConfirmed}
                  className="rounded bg-[#2ea44f] px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
                >
                  Confirm run
                </button>
              </div>
            </div>
            <pre className="overflow-x-auto rounded bg-[#0b0f0c] p-3 font-mono text-sm text-[#7ee787]">
              {result.command}
            </pre>
            {result.explanation && (
              <p className="text-sm text-[#8fbc8f]">{result.explanation}</p>
            )}
          </section>
        )}

        <section className="rounded border border-[#2e4432] bg-[#0b0f0c] p-4">
          <div className="mb-2 font-mono text-xs text-[#6b9b72]">TERMINAL</div>
          <pre className="min-h-[160px] whitespace-pre-wrap font-mono text-sm text-[#c8e6c9]">
            {output || "$  Waiting for confirmed command…"}
          </pre>
        </section>
      </div>
    </main>
  );
}
