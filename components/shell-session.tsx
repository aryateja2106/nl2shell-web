"use client";

import { useCallback, useState } from "react";
import { Cloud, Loader2, Monitor, Terminal, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "@/components/voice-input";
import { CommandOutput } from "@/components/command-output";
import { ExecutionOutput } from "@/components/execution-output";
import { ExamplePrompts } from "@/components/example-prompts";
import { AILoader } from "@/components/ai-loader";
import { useTranslate, type InferenceMode } from "@/hooks/use-translate";
import { useWebContainer } from "@/hooks/use-webcontainer";

const SANDBOX_ENABLED = process.env.NEXT_PUBLIC_SANDBOX_ENABLED !== "false";

const MODES: { value: InferenceMode; label: string; icon: typeof Cloud }[] = [
  { value: "cloud", label: "Cloud", icon: Cloud },
  { value: "browser", label: "Browser", icon: Monitor },
  { value: "auto", label: "Auto", icon: Zap },
];

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
  const [mode, setMode] = useState<InferenceMode>("cloud");
  const { result, isLoading, error, browserStatus, translate, reset } =
    useTranslate(mode);
  const sandbox = useWebContainer();

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !isLoading) {
      setLastQuery(trimmed);
      translate(trimmed);
    }
  }, [input, isLoading, translate]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInput(text);
      setLastQuery(text.trim());
      translate(text);
    },
    [translate],
  );

  const handleExampleSelect = useCallback(
    (example: string) => {
      setInput(example);
      setLastQuery(example.trim());
      translate(example);
    },
    [translate],
  );

  const handleClear = useCallback(() => {
    if (result && lastQuery) {
      setHistory((prev) =>
        [
          {
            query: lastQuery,
            command: result.command,
            meta: result.meta,
            timestamp: Date.now(),
          },
          ...prev,
        ].slice(0, 20),
      );
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

  const showBrowserProgress =
    isLoading &&
    mode !== "cloud" &&
    (browserStatus.stage === "downloading" ||
      browserStatus.stage === "loading");

  return (
    <div className="space-y-6">
      {/* Input card */}
      <Card className="glass-card border-border/40">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="nl-input"
                className="text-sm font-medium text-foreground/80"
              >
                Describe what you want to do
              </label>

              {/* Mode selector */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-background/50 border border-border/30">
                {MODES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-md transition-colors ${
                      mode === value
                        ? "bg-[#2ea44f]/15 text-[#2ea44f]"
                        : "text-muted-foreground/50 hover:text-muted-foreground/80"
                    }`}
                    aria-pressed={mode === value}
                  >
                    <Icon className="size-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

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

            {/* Browser engine status */}
            {showBrowserProgress && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/60">
                <Loader2 className="size-3 animate-spin" />
                {browserStatus.stage === "downloading" ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span>Downloading model...</span>
                    {typeof browserStatus.progress === "number" && (
                      <>
                        <div className="flex-1 max-w-[200px] h-1 bg-border/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2ea44f] rounded-full transition-all duration-300"
                            style={{ width: `${browserStatus.progress}%` }}
                          />
                        </div>
                        <span>{browserStatus.progress}%</span>
                      </>
                    )}
                  </div>
                ) : (
                  <span>Initializing model...</span>
                )}
              </div>
            )}

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
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Terminal className="mr-2 size-4" />
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

            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5" role="alert">
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-destructive text-sm" aria-hidden="true">
                &#9888;
              </span>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && !showBrowserProgress && <AILoader />}

      {/* Command output */}
      {result && (
        <CommandOutput
          command={result.command}
          meta={result.meta}
          query={lastQuery}
          onExecute={sandbox.execute}
          isExecuting={sandbox.isExecuting}
          sandboxEnabled={SANDBOX_ENABLED}
        />
      )}

      {/* Sandbox execution status */}
      {sandbox.isExecuting && !sandbox.output && (
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono text-muted-foreground/60">
          <Loader2 className="size-3 animate-spin" />
          <span>
            {sandbox.isBooting ? "Booting sandbox..." : "Executing..."}
          </span>
        </div>
      )}

      {/* Sandbox execution output */}
      {sandbox.output && result && (
        <ExecutionOutput
          result={sandbox.output}
          command={result.command}
          history={sandbox.history.slice(0, -1)}
        />
      )}

      {/* Sandbox error */}
      {sandbox.error && (
        <Card className="border-yellow-500/30 bg-yellow-500/5" role="alert">
          <CardContent>
            <div className="flex items-start gap-2">
              <span
                className="text-yellow-500 text-sm mt-0.5"
                aria-hidden="true"
              >
                &#9888;
              </span>
              <div>
                <p className="text-sm text-yellow-500/90">{sandbox.error}</p>
                {result && (
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    You can copy the command above and run it in your own
                    terminal.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Translation history */}
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
