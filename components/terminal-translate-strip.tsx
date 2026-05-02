"use client";

import { useCallback, useState } from "react";
import { Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "@/components/voice-input";

interface TerminalTranslateStripProps {
  onCommand: (command: string) => void | Promise<void>;
  disabled?: boolean;
}

export function TerminalTranslateStrip({
  onCommand,
  disabled = false,
}: TerminalTranslateStripProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTranslate = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q || loading || disabled) return;
      setLoading(true);
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
        setInput("");
        await onCommand(cmd);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Translation failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, disabled, onCommand],
  );

  const handleVoice = useCallback(
    (text: string) => {
      setInput(text);
      void runTranslate(text);
    },
    [runTranslate],
  );

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          NL2Shell — English to shell (cloud translate)
        </p>
      </div>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void runTranslate(input);
          }
        }}
        placeholder='e.g. "list files in my work folder" or "curl JSON placeholder posts"'
        rows={2}
        disabled={loading || disabled}
        className="resize-none bg-background/60 text-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-[#2ea44f] hover:bg-[#238636] text-white"
          disabled={!input.trim() || loading || disabled}
          onClick={() => void runTranslate(input)}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Terminal className="mr-2 size-4" />
              Generate & run
            </>
          )}
        </Button>
        <VoiceInput
          onTranscript={handleVoice}
          disabled={loading || disabled}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-[10px] text-muted-foreground/60 font-mono">
        Runs the returned command in the demo shell below. Cloud inference only on this page.
      </p>
    </div>
  );
}
