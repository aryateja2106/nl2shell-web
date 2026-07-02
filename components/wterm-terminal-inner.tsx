"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Terminal, useTerminal } from "@wterm/react";
import { BashShell } from "@wterm/just-bash";
import "@wterm/react/css";
import { ArrowLeft } from "lucide-react";
import { TerminalTranslateStrip } from "@/components/terminal-translate-strip";
import { WebContainerTerminalPanel } from "@/components/webcontainer-terminal-panel";
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
  "There is no Node.js or npm here (by design). For real npm, npx, or global CLIs, use the WebContainer tab above.",
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

const TERMINAL_URL_CMD_KEY = "nl2shell:terminal:url-cmd-pending";

type TerminalBackend = "demo" | "webcontainer";

export default function WTermTerminalInner() {
  const { ref, write, focus } = useTerminal();
  const [initialUrlCommand, setInitialUrlCommand] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const live = (params.get("cmd") ?? params.get("paste"))?.trim();
      if (live) {
        sessionStorage.setItem(TERMINAL_URL_CMD_KEY, live);
        queueMicrotask(() => {
          setInitialUrlCommand(live);
        });
        window.history.replaceState(null, "", "/terminal");
        window.setTimeout(() => {
          try {
            sessionStorage.removeItem(TERMINAL_URL_CMD_KEY);
          } catch {
            /* ignore */
          }
        }, 10_000);
        return;
      }
      const pending = sessionStorage.getItem(TERMINAL_URL_CMD_KEY);
      if (pending?.trim()) {
        queueMicrotask(() => {
          setInitialUrlCommand(pending.trim());
        });
        sessionStorage.removeItem(TERMINAL_URL_CMD_KEY);
      }
    } catch {
      /* private mode / quota */
    }
  }, []);
  const shellRef = useRef<BashShell | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<TerminalBackend>("demo");
  const [wcSessionReady, setWcSessionReady] = useState(false);
  const wcInjectRef = useRef<((cmd: string) => Promise<void>) | null>(null);

  const setBackendAndClearError = useCallback((b: TerminalBackend) => {
    setError(null);
    setBackend(b);
  }, []);

  const handleWcInjectReady = useCallback(
    (fn: ((cmd: string) => Promise<void>) | null) => {
      wcInjectRef.current = fn;
    },
    [],
  );

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

  const injectCommand = useCallback(
    async (command: string) => {
      const cmd = command.trim();
      if (!cmd) return;
      try {
        setError(null);
        if (backend === "demo") {
          await shellRef.current?.handleInput(`${cmd}\r`);
          schedulePersist();
          return;
        }
        const run = wcInjectRef.current;
        if (!run) {
          setError("WebContainer session is not ready. Start a session below.");
          return;
        }
        await run(cmd);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to run command");
      }
    },
    [backend, schedulePersist],
  );

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
          wterm · demo FS · WebContainer
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border/50 p-0.5 bg-muted/30">
            <Button
              type="button"
              variant={backend === "demo" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setBackendAndClearError("demo")}
            >
              Demo FS
            </Button>
            <Button
              type="button"
              variant={backend === "webcontainer" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setBackendAndClearError("webcontainer")}
            >
              WebContainer
            </Button>
          </div>
          {backend === "demo" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleResetDemo}
            >
              Reset demo files
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-5xl w-full mx-auto px-4 py-4 space-y-4 flex-1 flex flex-col min-h-0">
        {backend === "demo" && (
          <p className="text-xs text-muted-foreground rounded-lg border border-border/40 bg-muted/20 px-3 py-2 leading-relaxed">
            <span className="font-medium text-foreground/85">Demo FS</span> is a small
            in-browser bash toy: files and allow-listed <code className="text-[11px]">curl</code> only.
            It is <strong className="font-medium text-foreground/90">not</strong> macOS, Linux, or Homebrew,
            and it has <strong className="font-medium text-foreground/90">no npm</strong>. To try{" "}
            <code className="text-[11px]">npm install</code>, CLIs, or the Anthropic Node tools, switch to{" "}
            <span className="font-medium text-foreground/85">WebContainer</span>, then{" "}
            <span className="font-medium text-foreground/85">Start WebContainer session</span> and wait for the
            prompt (often 30–90s the first time; slow networks may need longer).
          </p>
        )}

        <TerminalTranslateStrip
          onRunCommand={injectCommand}
          disabled={
            backend === "demo" ? !ready : !wcSessionReady
          }
          initialUrlCommand={initialUrlCommand}
        />

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {backend === "demo" ? (
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
        ) : (
          <WebContainerTerminalPanel
            onInjectReady={handleWcInjectReady}
            onSessionReady={setWcSessionReady}
          />
        )}
      </div>
    </div>
  );
}
