"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, useTerminal } from "@wterm/react";
import type { WebContainerProcess } from "@webcontainer/api";
import "@wterm/react/css";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startWebContainerTerminalSession } from "@/lib/webcontainer-terminal-runtime";
import { DEMO_INITIAL_FILES } from "@/lib/terminal-demo-fs";

type Status = "idle" | "booting" | "ready" | "error";

interface WebContainerTerminalPanelProps {
  onInjectReady: (inject: ((cmd: string) => Promise<void>) | null) => void;
  /** True while a bash PTY session is accepting input (not idle/booting/error). */
  onSessionReady?: (ready: boolean) => void;
  disabled?: boolean;
}

export function WebContainerTerminalPanel({
  onInjectReady,
  onSessionReady,
  disabled = false,
}: WebContainerTerminalPanelProps) {
  const { ref, write, focus } = useTerminal();
  const sessionRef = useRef<{
    process: WebContainerProcess;
    teardown: () => void;
  } | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const termSizeRef = useRef({ cols: 80, rows: 24 });
  const [bootKey, setBootKey] = useState(0);

  const inject = useCallback(async (cmd: string) => {
    const w = writerRef.current;
    if (!w) return;
    await w.write(`${cmd}\r`);
  }, []);

  useEffect(() => {
    onInjectReady(status === "ready" ? inject : null);
    return () => {
      onInjectReady(null);
    };
  }, [status, inject, onInjectReady]);

  useEffect(() => {
    onSessionReady?.(status === "ready");
    return () => {
      onSessionReady?.(false);
    };
  }, [status, onSessionReady]);

  const pumpOutput = useCallback(
    async (proc: WebContainerProcess) => {
      const reader = proc.output.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) write(value);
        }
      } catch {
        /* stream closed */
      } finally {
        reader.releaseLock();
      }
    },
    [write],
  );

  const cleanup = useCallback(() => {
    const w = writerRef.current;
    writerRef.current = null;
    if (w) {
      void w.close().catch(() => {
        /* ignore */
      });
    }
    sessionRef.current?.teardown();
    sessionRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleStart = useCallback(async () => {
    cleanup();
    setStatus("booting");
    setMessage(null);
    try {
      const session = await startWebContainerTerminalSession(
        DEMO_INITIAL_FILES,
        termSizeRef.current,
      );
      sessionRef.current = session;
      writerRef.current = session.process.input.getWriter();
      void pumpOutput(session.process);
      setStatus("ready");
      queueMicrotask(() => focus());
    } catch (e) {
      cleanup();
      setStatus("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [cleanup, pumpOutput, focus]);

  const handleEndSession = useCallback(() => {
    cleanup();
    setStatus("idle");
    setMessage(null);
    setBootKey((k) => k + 1);
  }, [cleanup]);

  const handleData = useCallback(
    async (data: string) => {
      if (status !== "ready") return;
      const w = writerRef.current;
      if (!w) return;
      await w.write(data);
    },
    [status],
  );

  const handleResize = useCallback((cols: number, rows: number) => {
    termSizeRef.current = { cols, rows };
    try {
      sessionRef.current?.process.resize({ cols, rows });
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 space-y-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground/90">Full session</strong> uses StackBlitz{" "}
          <span className="font-mono">WebContainer</span>: real Node,{" "}
          <span className="font-mono">npm install</span>, and networking closer to a Linux devcontainer — still in your browser RAM, not a remote VM.           Only{" "}
          <strong className="text-foreground/90">one</strong> WebContainer may run per page load; starting here will stop any homepage “Run” sandbox. Multiple split terminals (tmux-style) are not wired yet — same runtime, one shell for now. If boot fails, check ad-blockers and{" "}
          <a
            className="text-sky-500/90 hover:underline"
            href="https://webcontainers.io/guides/troubleshooting"
            target="_blank"
            rel="noreferrer"
          >
            troubleshooting
          </a>
          . Reload to reset.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {status === "idle" && (
            <Button
              type="button"
              size="sm"
              className="bg-[#2ea44f] hover:bg-[#238636] text-white"
              onClick={() => void handleStart()}
              disabled={disabled}
            >
              Start WebContainer session
            </Button>
          )}
          {status === "booting" && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
              Booting WebContainer (first load is often 30–90s; slow networks may take longer)…
            </span>
          )}
          {status === "error" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setMessage(null);
                setBootKey((k) => k + 1);
                void handleStart();
              }}
            >
              Retry
            </Button>
          )}
          {status === "ready" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleEndSession}
            >
              End session
            </Button>
          )}
        </div>
        {message && status === "error" && (
          <p className="text-xs text-destructive whitespace-pre-wrap">{message}</p>
        )}
      </div>

      <div
        className={
          status !== "ready" ? "pointer-events-none opacity-60" : ""
        }
      >
        <Terminal
          key={bootKey}
          ref={ref}
          onData={handleData}
          autoResize
          cursorBlink
          wasmUrl="/wterm.wasm"
          onResize={handleResize}
          className="h-[min(70vh,640px)] w-full text-sm min-h-[480px] rounded-xl border border-[var(--terminal-border)]"
        />
      </div>

      {status === "ready" && (
        <p className="text-[10px] text-muted-foreground/70 font-mono leading-relaxed">
          Try: <code className="text-foreground/80">ls -la</code>,{" "}
          <code className="text-foreground/80">cat ~/.ssh/config</code>,{" "}
          <code className="text-foreground/80">npm install cowsay</code> then{" "}
          <code className="text-foreground/80">npx cowsay hi</code>. For Anthropic’s CLI, prefer{" "}
          <code className="text-foreground/80">npm install @anthropic-ai/claude-code</code> then{" "}
          <code className="text-foreground/80">npx claude-code</code> in this folder; use{" "}
          <code className="text-foreground/80">-g</code> only if you need a global binary.
        </p>
      )}
    </div>
  );
}
