"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Terminal, useTerminal } from "@wterm/react";
import { BashShell } from "@wterm/just-bash";
import "@wterm/react/css";
import { ArrowLeft } from "lucide-react";
import { TerminalTranslateStrip } from "@/components/terminal-translate-strip";
import { Button } from "@/components/ui/button";
import {
  DEMO_INITIAL_FILES,
  TERMINAL_DEMO_NETWORK,
  clearStoredVfs,
  loadStoredVfsOverlay,
  persistVfsJson,
} from "@/lib/terminal-demo-fs";

const GREETING = [
  "NL2Shell demo shell — commands run in a virtual filesystem (not your Mac).",
  "",
  "Try:  ls    cd Desktop    cat ~/.ssh/config    curl https://httpbin.org/get",
  "",
  "Above: describe what you want, Generate, then Run in terminal when you trust the command.",
  "",
];

function demoPrompt(cwd: string): string {
  const display = cwd.replace(/^\/home\/user/, "~") || "/";
  return `\x1b[1;32muser@nl2shell\x1b[0m:\x1b[1;34m${display}\x1b[0m$ `;
}

export default function WTermTerminalInner() {
  const { ref, write, focus } = useTerminal();
  const searchParams = useSearchParams();
  const shellRef = useRef<BashShell | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlCmdCapture = useRef<string | null | undefined>(undefined);
  if (urlCmdCapture.current === undefined) {
    const raw = searchParams.get("cmd") ?? searchParams.get("paste");
    urlCmdCapture.current = raw?.trim() ? raw.trim() : null;
  }

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlCmdCapture.current) {
      window.history.replaceState(null, "", "/terminal");
    }
  }, []);

  const [mergedFiles] = useState(() => ({
    ...DEMO_INITIAL_FILES,
    ...loadStoredVfsOverlay(),
  }));

  const flushPersist = useCallback(async () => {
    const bash = shellRef.current?.bash;
    if (!bash?.fs) return;
    try {
      const paths = bash.fs.getAllPaths();
      const data: Record<string, string> = {};
      for (const p of paths) {
        if (!p.startsWith("/home/user")) continue;
        try {
          const st = await bash.fs.stat(p);
          if (!st.isFile || st.size > 256_000) continue;
          data[p] = await bash.fs.readFile(p);
        } catch {
          /* skip */
        }
      }
      persistVfsJson(data);
    } catch {
      /* ignore */
    }
  }, []);

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      void flushPersist();
    }, 800);
  }, [flushPersist]);

  useEffect(() => {
    const onLeave = () => {
      void flushPersist();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [flushPersist]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      shellRef.current = null;
      setReady(false);
    };
  }, []);

  const handleReady = useCallback(() => {
    shellRef.current = null;
    setReady(false);
    const shell = new BashShell({
      files: mergedFiles,
      network: TERMINAL_DEMO_NETWORK,
      greeting: GREETING,
      prompt: demoPrompt,
    });
    shellRef.current = shell;
    void shell.attach(write).then(() => {
      setReady(true);
      queueMicrotask(() => focus());
    });
  }, [write, focus, mergedFiles]);

  const handleData = useCallback(
    async (data: string) => {
      await shellRef.current?.handleInput(data);
      schedulePersist();
    },
    [schedulePersist],
  );

  const injectCommand = useCallback(async (command: string) => {
    const cmd = command.trim();
    if (!cmd) return;
    try {
      await shellRef.current?.handleInput(`${cmd}\r`);
      schedulePersist();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run command");
    }
  }, [schedulePersist]);

  const handleResetDemo = useCallback(() => {
    clearStoredVfs();
    window.location.reload();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col pt-20">
      <header className="border-b border-border/40 px-4 py-3 flex flex-wrap items-center gap-4 shrink-0 gap-y-2">
        <Link
          href="/#translate"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Home translate
        </Link>
        <h1 className="text-sm font-semibold tracking-tight">Web terminal</h1>
        <span className="text-[11px] font-mono text-muted-foreground/60 hidden sm:inline">
          wterm · just-bash · demo FS
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto text-xs"
          onClick={handleResetDemo}
        >
          Reset demo files
        </Button>
      </header>

      <div className="max-w-5xl w-full mx-auto px-4 py-4 space-y-4 flex-1 flex flex-col min-h-0">
        <TerminalTranslateStrip
          onRunCommand={injectCommand}
          disabled={!ready}
          initialUrlCommand={urlCmdCapture.current ?? null}
        />

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex-1 min-h-[min(70vh,640px)] rounded-xl border border-[var(--terminal-border)] overflow-hidden shadow-lg">
          <Terminal
            ref={ref}
            onReady={handleReady}
            onData={handleData}
            autoResize
            cursorBlink
            wasmUrl="/wterm.wasm"
            className="h-full min-h-[480px] w-full text-sm"
          />
        </div>
      </div>
    </div>
  );
}
