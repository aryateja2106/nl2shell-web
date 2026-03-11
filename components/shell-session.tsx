"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "@/components/voice-input";
import { CommandOutput } from "@/components/command-output";
import { ExamplePrompts } from "@/components/example-prompts";
import { useTranslate } from "@/hooks/use-translate";

interface HistoryEntry {
  query: string;
  command: string;
  meta: string;
  timestamp: number;
}

export function ShellSession() {
  const [input, setInput] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const { result, isLoading, error, translate, reset } = useTranslate();

  const handleSubmit = useCallback(() => {
    if (input.trim() && !isLoading) {
      setLastQuery(input.trim());
      translate(input);
    }
  }, [input, isLoading, translate]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInput(text);
      setLastQuery(text.trim());
      translate(text);
    },
    [translate]
  );

  const handleExampleSelect = useCallback(
    (example: string) => {
      setInput(example);
      setLastQuery(example.trim());
      translate(example);
    },
    [translate]
  );

  const handleClear = useCallback(() => {
    if (result && lastQuery) {
      setHistory((prev) => [
        { query: lastQuery, command: result.command, meta: result.meta, timestamp: Date.now() },
        ...prev,
      ].slice(0, 20));
    }
    setInput("");
    setLastQuery("");
    reset();
  }, [reset, result, lastQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Input card */}
      <Card className="glass-card border-border/40">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="nl-input"
              className="text-sm font-medium text-foreground/80"
            >
              Describe what you want to do
            </label>
            <Textarea
              id="nl-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. find all Python files modified in the last 24 hours"
              rows={2}
              className="resize-none bg-background/50 border-border/40 focus:border-primary/50 transition-colors"
              disabled={isLoading}
            />
            <p className="text-[11px] text-muted-foreground/40">
              Press Enter to submit, Shift+Enter for newline
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="bg-[#2ea44f] hover:bg-[#238636] text-white transition-all hover:shadow-[0_0_16px_rgba(46,164,79,0.25)]"
              >
                {isLoading ? (
                  <>
                    <LoaderIcon className="mr-2 size-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <TerminalIcon className="mr-2 size-4" />
                    Generate
                  </>
                )}
              </Button>
              {(input || result) && (
                <Button
                  variant="ghost"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>

            <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5" role="alert">
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-destructive text-sm" aria-hidden="true">&#9888;</span>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card className="glass-card border-border/40" role="status" aria-live="polite">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex gap-1" aria-hidden="true">
                <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-sm text-muted-foreground">
                Translating to shell command...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command output */}
      {result && (
        <CommandOutput command={result.command} meta={result.meta} query={lastQuery} />
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/30" />
            <span className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-widest">
              history
            </span>
            <div className="h-px flex-1 bg-border/30" />
          </div>
          {history.map((entry) => (
            <button
              key={entry.timestamp}
              onClick={() => handleExampleSelect(entry.query)}
              className="w-full text-left rounded-lg border border-border/30 bg-card/30 px-4 py-3 transition-colors hover:border-border/60 hover:bg-card/50"
            >
              <p className="text-xs text-muted-foreground/60 mb-1 truncate">
                {entry.query}
              </p>
              <p className="text-sm font-mono text-[var(--terminal-green)]/70 truncate">
                {entry.command}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Example prompts */}
      <ExamplePrompts onSelect={handleExampleSelect} disabled={isLoading} />
    </div>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}
