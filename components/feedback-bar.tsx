"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThumbsUp, ThumbsDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackBarProps {
  query: string;
  command: string;
  className?: string;
}

type State = "idle" | "submitted" | "dismissed";

export function FeedbackBar({ query, command, className }: FeedbackBarProps) {
  const [state, setState] = useState<State>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (state === "dismissed") return null;

  const handleFeedback = async (rating: "up" | "down") => {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, command, rating }),
      });
    } catch {
      // Non-critical — don't block UX on network failure
    }
    setState("submitted");
    timeoutRef.current = setTimeout(() => setState("dismissed"), 2000);
  };

  const handleDismiss = () => setState("dismissed");

  return (
    <AnimatePresence mode="wait">
      {state === "idle" && (
        <motion.div
          key="idle"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground",
            className
          )}
        >
          <span>Was this helpful?</span>
          <button
            type="button"
            onClick={() => handleFeedback("up")}
            aria-label="Thumbs up"
            className="transition-colors hover:text-emerald-500"
          >
            <ThumbsUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFeedback("down")}
            aria-label="Thumbs down"
            className="transition-colors hover:text-destructive"
          >
            <ThumbsDown className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss feedback"
            className="transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </motion.div>
      )}

      {state === "submitted" && (
        <motion.div
          key="submitted"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground",
            className
          )}
        >
          <Check className="size-3.5 text-emerald-500" />
          <span>Thanks!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
