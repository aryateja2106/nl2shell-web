"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Loader2, Play, Terminal, X, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "@/components/voice-input";
import { DangerWarning } from "@/components/danger-warning";
import { TerminalRunFeedback } from "@/components/terminal-run-feedback";
import { getDemoShellHint } from "@/lib/terminal-command-guards";
import { formatStructuredAgentBrief } from "@/lib/agent-handoff";
import {
  getDangerReason,
  isDangerous,
  looksLikeShell,
} from "@/lib/safety";

type Phase = "input" | "generating" | "preview";

interface TerminalTranslateStripProps {
  onRunCommand: (command: string) => Promise<void>;
  disabled?: boolean;
  /** Deep link: show this command in preview instead of auto-running */
  initialUrlCommand?: string | null;
}

export function TerminalTranslateStrip({
  onRunCommand,
  disabled = false,
  initialUrlCommand = null,
}: TerminalTranslateStripProps) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [editedCommand, setEditedCommand] = useState("");
  const urlSeedApplied = useRef(false);

  const [feedbackCtx, setFeedbackCtx] = useState<{
    query: string;
    command: string;
  } | null>(null);

  useEffect(() => {
    if (!initialUrlCommand?.trim() || urlSeedApplied.current) return;
    urlSeedApplied.current = true;
    const cmd = initialUrlCommand.trim();
    setLastQuery("(From shared link)");
    setEditedCommand(cmd);
    setPhase("preview");
    setError(null);
  }, [initialUrlCommand]);

  const goGenerate = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q || loading || disabled) return;
      setLoading(true);
      setPhase("generating");
      setError(null);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const data = (await res.json()) as { command?: string; error?: string };
        if (!res.ok) throw new Error(data.error || "Translation failed");
        const cmd = data.command?.trim();
        if (!cmd) throw new Error("Empty command from model");
        setLastQuery(q);
        setEditedCommand(cmd);
        setInput("");
        setPhase("preview");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Translation failed");
        setPhase("input");
      } finally {
        setLoading(false);
      }
    },
    [loading, disabled],
  );

  const handleVoice = useCallback(
    (text: string) => {
      setInput(text);
      void goGenerate(text);
    },
    [goGenerate],
  );

  const discardPreview = useCallback(() => {
    setPhase("input");
    setEditedCommand("");
    setLastQuery("");
    setError(null);
  }, []);

  const runInTerminal = useCallback(async () => {
    const cmd = editedCommand.trim();
    if (!cmd || disabled) return;
    try {
      await onRunCommand(cmd);
      setFeedbackCtx({ query: lastQuery || "(no NL query)", command: cmd });
      setPhase("input");
      setEditedCommand("");
      setLastQuery("");
    } catch {
      setError("Failed to send command to terminal");
    }
  }, [editedCommand, disabled, onRunCommand, lastQuery]);

  const copyCommand = useCallback(async () => {
    const cmd = editedCommand.trim();
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      /* ignore */
    }
  }, [editedCommand]);

  const copyAgentBrief = useCallback(async () => {
    const cmd = editedCommand.trim();
    if (!cmd) return;
    try {
      const text = formatStructuredAgentBrief({
        nlQuery: lastQuery?.trim() ? lastQuery : "(no English query recorded)",
        shellCommand: cmd,
      });
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, [editedCommand, lastQuery]);

  const dangerous = editedCommand ? isDangerous(editedCommand) : false;
  const dangerReason = editedCommand ? getDangerReason(editedCommand) : null;
  const notShell = editedCommand && !looksLikeShell(editedCommand);
  const demoHint = editedCommand ? getDemoShellHint(editedCommand) : null;

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          NL2Shell — English to shell (cloud translate)
        </p>
      </div>

      {phase !== "preview" && (
        <>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void goGenerate(input);
              }
            }}
            placeholder='e.g. "list Python files here" or "show disk usage for current folder"'
            rows={2}
            disabled={loading || disabled}
            className="resize-none bg-background/60 text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 min-h-10">
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                className="min-w-[7.5rem] bg-[#2ea44f] hover:bg-[#238636] text-white"
                disabled={!input.trim() || loading || disabled}
                onClick={() => void goGenerate(input)}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="size-4 animate-spin shrink-0"
                      aria-hidden
                    />
                    <span>Generating…</span>
                  </span>
                ) : (
                  <>
                    <Terminal className="mr-2 size-4 shrink-0" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            <VoiceInput
              onTranscript={handleVoice}
              disabled={loading || disabled}
            />
          </div>
        </>
      )}

      {phase === "preview" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#2ea44f]/90">
              Review before running
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={discardPreview}
            >
              <X className="size-3.5 mr-1" />
              Discard
            </Button>
          </div>
          {lastQuery && lastQuery !== "(From shared link)" && (
            <p className="text-[11px] text-muted-foreground/80 line-clamp-2">
              <span className="font-mono text-muted-foreground/50">You: </span>
              {lastQuery}
            </p>
          )}
          {dangerous && dangerReason && (
            <DangerWarning reason={dangerReason} />
          )}
          {notShell ? (
            <p className="text-xs text-amber-600/90 border border-amber-500/30 rounded-md px-2 py-1.5 bg-amber-500/5">
              This may not be a shell one-liner. Edit it before running, or discard and rephrase.
            </p>
          ) : null}
          {demoHint && (
            <p className="text-xs text-sky-600/90 border border-sky-500/30 rounded-md px-2 py-1.5 bg-sky-500/5">
              {demoHint}
            </p>
          )}
          <Textarea
            value={editedCommand}
            onChange={(e) => setEditedCommand(e.target.value)}
            rows={3}
            disabled={disabled}
            className="resize-none font-mono text-sm bg-[#0d1117] text-[#7ee787] border-[var(--terminal-border)]"
            aria-label="Command to run after review"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#2ea44f] hover:bg-[#238636] text-white"
              disabled={!editedCommand.trim() || disabled}
              onClick={() => void runInTerminal()}
            >
              <Play className="size-3.5 mr-1.5 shrink-0" />
              Run in terminal
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!editedCommand.trim()}
              onClick={() => void copyCommand()}
            >
              <Copy className="size-3.5 mr-1.5 shrink-0" />
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!editedCommand.trim()}
              onClick={() => void copyAgentBrief()}
              title="Markdown: goal + command + checklist for a coding agent"
            >
              <MessageSquareText className="size-3.5 mr-1.5 shrink-0" />
              Copy agent brief
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {feedbackCtx && (
        <TerminalRunFeedback
          nlQuery={feedbackCtx.query}
          commandRun={feedbackCtx.command}
          onDismiss={() => setFeedbackCtx(null)}
        />
      )}

      <p className="text-[10px] text-muted-foreground/60 font-mono leading-relaxed">
        Generate shows a draft command only. Use{" "}
        <span className="text-foreground/70">Run in terminal</span> after you
        trust it. <span className="text-foreground/70">Copy agent brief</span>{" "}
        pastes goal + command + checklist for coding agents. Feedback (below after a run) is logged for dataset quality.
      </p>
    </div>
  );
}
