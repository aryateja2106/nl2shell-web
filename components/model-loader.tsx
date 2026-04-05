"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface ModelLoaderProps {
  progress: number;
  progressText: string;
  className?: string;
}

export function ModelLoader({
  progress,
  progressText,
  className,
}: ModelLoaderProps) {
  return (
    <div
      className={cn("space-y-2 py-4", className)}
      role="status"
      aria-live="polite"
      aria-label="Loading model"
    >
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-border/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#2ea44f] to-[#28c840]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Status text */}
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/60">
        <span className="truncate max-w-[70%]">{progressText}</span>
        <span>{progress}%</span>
      </div>

      {progress < 10 && (
        <p className="text-[10px] text-muted-foreground/40">
          ~450MB download, cached for future visits
        </p>
      )}
    </div>
  );
}
