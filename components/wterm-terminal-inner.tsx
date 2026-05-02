"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Terminal, useTerminal } from "@wterm/react";
import { BashShell } from "@wterm/just-bash";
import "@wterm/react/css";
import { ArrowLeft } from "lucide-react";

const GREETING = [
  "NL2Shell — try commands in the browser",
  "Powered by wterm + just-bash (sandboxed JS shell, not your real OS).",
  "",
  "Tip: generate a command on the home page, then use “Open in terminal”.",
  "",
];

export default function WTermTerminalInner() {
  const { ref, write, focus } = useTerminal();
  const searchParams = useSearchParams();
  const shellRef = useRef<BashShell | null>(null);
  const injectedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      shellRef.current = null;
      injectedRef.current = false;
      setReady(false);
    };
  }, []);

  const handleReady = useCallback(() => {
    shellRef.current = null;
    setReady(false);
    const shell = new BashShell({
      greeting: GREETING,
    });
    shellRef.current = shell;
    void shell.attach(write).then(() => {
      setReady(true);
      queueMicrotask(() => focus());
    });
  }, [write, focus]);

  const handleData = useCallback((data: string) => {
    void shellRef.current?.handleInput(data);
  }, []);

  useEffect(() => {
    if (!ready || injectedRef.current) return;
    const raw = searchParams.get("cmd") ?? searchParams.get("paste");
    if (!raw?.trim()) return;
    injectedRef.current = true;
    const cmd = raw.trim();
    void (async () => {
      try {
        await shellRef.current?.handleInput(`${cmd}\r`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to run command");
      }
      window.history.replaceState(null, "", "/terminal");
    })();
  }, [ready, searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col pt-20">
      <header className="border-b border-border/40 px-4 py-3 flex items-center gap-4 shrink-0">
        <Link
          href="/#translate"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to translate
        </Link>
        <h1 className="text-sm font-semibold tracking-tight">Web terminal</h1>
        <span className="text-[11px] font-mono text-muted-foreground/60 ml-auto">
          wterm · just-bash
        </span>
      </header>

      {error && (
        <p className="text-sm text-destructive px-4 py-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex-1 min-h-[480px] p-4 md:p-6">
        <div className="h-full max-w-5xl mx-auto rounded-xl border border-[var(--terminal-border)] overflow-hidden shadow-lg">
          <Terminal
            ref={ref}
            onReady={handleReady}
            onData={handleData}
            autoResize
            cursorBlink
            wasmUrl="/wterm.wasm"
            className="h-[min(70vh,640px)] w-full text-sm"
          />
        </div>
      </div>
    </div>
  );
}
