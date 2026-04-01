"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DangerWarning } from "@/components/danger-warning";
import { FeedbackButtons } from "@/components/feedback-buttons";
import { isDangerous, getDangerReason } from "@/lib/safety";

interface CommandOutputProps {
  command: string;
  meta?: string;
  query?: string;
  onExecute?: (command: string) => void;
  isExecuting?: boolean;
  sandboxEnabled?: boolean;
}

export function CommandOutput({ command, meta, query, onExecute, isExecuting, sandboxEnabled }: CommandOutputProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dangerous = isDangerous(command);
  const dangerReason = getDangerReason(command);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = command;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {dangerous && dangerReason && <DangerWarning reason={dangerReason} />}

      <div className="relative group terminal-glow rounded-xl border border-[var(--terminal-border)] overflow-hidden">
        {/* Window chrome */}
        <div className="h-8 bg-[#161b22] flex items-center justify-between px-3 border-b border-[var(--terminal-border)]">
          <div className="flex items-center gap-2" aria-hidden="true">
            <div className="size-2.5 rounded-full bg-[#ff5f57]" />
            <div className="size-2.5 rounded-full bg-[#febc2e]" />
            <div className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1">
            {sandboxEnabled && onExecute && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 px-2 text-[10px] font-mono text-[#2ea44f]/70 hover:text-[#2ea44f] hover:bg-[#2ea44f]/10 transition-colors"
                onClick={() => onExecute(command)}
                disabled={isExecuting}
                aria-label="Run command in sandbox"
              >
                {isExecuting ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <>
                    <PlayIcon className="size-3 mr-1" />
                    Run
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 text-muted-foreground/50 hover:text-foreground transition-colors"
              onClick={handleCopy}
              aria-label={copied ? "Copied to clipboard" : "Copy command to clipboard"}
            >
              {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
            </Button>
          </div>
        </div>

        <pre className="terminal-output p-4 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap break-all rounded-none border-0">
          <code>{command}</code>
        </pre>
      </div>

      {/* Meta + Feedback row */}
      <div className="flex items-center justify-between gap-4">
        {meta ? (
          <p className="text-[11px] text-muted-foreground/50 font-mono">
            {meta.replace(/\*\*/g, "").replace(/\|/g, " · ")}
          </p>
        ) : (
          <div />
        )}
        <FeedbackButtons query={query || ""} command={command} />
      </div>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
