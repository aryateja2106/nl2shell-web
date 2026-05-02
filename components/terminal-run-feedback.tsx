"use client";

import { useCallback, useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TerminalRunFeedbackProps {
  nlQuery: string;
  commandRun: string;
  onDismiss: () => void;
}

export function TerminalRunFeedback({
  nlQuery,
  commandRun,
  onDismiss,
}: TerminalRunFeedbackProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [correction, setCorrection] = useState("");
  const [outputNote, setOutputNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = useCallback(async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: nlQuery.slice(0, 1000),
          command: commandRun.slice(0, 2000),
          rating,
          correction: correction.trim() || undefined,
          source: "terminal_web",
          executed: true,
          terminal_output_excerpt: outputNote.trim().slice(0, 8000) || undefined,
        }),
      });
      setDone(true);
      setTimeout(onDismiss, 1600);
    } catch {
      /* network optional */
    } finally {
      setSubmitting(false);
    }
  }, [rating, correction, outputNote, nlQuery, commandRun, onDismiss]);

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-muted-foreground">
        <Check className="size-4 text-emerald-500 shrink-0" />
        Thanks — feedback recorded for model improvement.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-3">
      <p className="text-xs font-medium text-foreground/90">
        How was this command for your intent? (optional — helps training data)
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={rating === "up" ? "default" : "outline"}
          className={rating === "up" ? "bg-[#2ea44f] hover:bg-[#238636]" : ""}
          onClick={() => setRating("up")}
        >
          Good fit
        </Button>
        <Button
          type="button"
          size="sm"
          variant={rating === "down" ? "destructive" : "outline"}
          onClick={() => setRating("down")}
        >
          Poor fit
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Skip
        </Button>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase text-muted-foreground/70">
          Better command (if you have one)
        </label>
        <Textarea
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          rows={2}
          placeholder="The command that would have been correct…"
          className="resize-none text-xs font-mono bg-background/60"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase text-muted-foreground/70">
          What the terminal showed (paste excerpt — optional)
        </label>
        <Textarea
          value={outputNote}
          onChange={(e) => setOutputNote(e.target.value)}
          rows={2}
          placeholder="Paste relevant stdout/stderr for dataset / RL…"
          className="resize-none text-xs font-mono bg-background/60"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!rating || submitting}
          onClick={() => void submit()}
          className="bg-[#2ea44f] hover:bg-[#238636] text-white"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Send className="size-3.5 mr-1.5" />
              Submit feedback
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
