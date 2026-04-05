"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DangerWarning } from "@/components/danger-warning";
import { FeedbackBar } from "@/components/feedback-bar";
import { isDangerous, getDangerReason } from "@/lib/safety";

interface CommandOutputProps {
  command: string;
  meta?: string;
  query?: string;
  onExecute?: (command: string) => void;
  isExecuting?: boolean;
  sandboxEnabled?: boolean;
  inferenceSource?: "cloud" | "browser";
}

export function CommandOutput({ command, meta, query, onExecute, isExecuting, sandboxEnabled, inferenceSource }: CommandOutputProps) {
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
                    <Play className="size-3 mr-1" />
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
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
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
            {inferenceSource === "browser" && (
              <span className="ml-2 text-[#28c840]/70"> · your data stayed local</span>
            )}
          </p>
        ) : (
          <div />
        )}
        <FeedbackBar query={query || ""} command={command} />
      </div>
    </div>
  );
}

