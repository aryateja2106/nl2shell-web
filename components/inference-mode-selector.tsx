"use client";

import { Cloud, Cpu, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InferenceMode } from "@/hooks/use-inference";
import type { ModelStatus } from "@/hooks/use-local-inference";

interface InferenceModeSelectorProps {
  mode: InferenceMode;
  onModeChange: (mode: InferenceMode) => void;
  isBrowserInferenceAvailable: boolean;
  modelStatus: ModelStatus;
}

const modes: {
  value: InferenceMode;
  label: string;
  icon: typeof Cloud;
}[] = [
  { value: "cloud", label: "Cloud", icon: Cloud },
  { value: "browser", label: "Browser", icon: Cpu },
  { value: "auto", label: "Auto", icon: Zap },
];

export function InferenceModeSelector({
  mode,
  onModeChange,
  isBrowserInferenceAvailable,
  modelStatus,
}: InferenceModeSelectorProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border/40 bg-background/50 p-0.5">
      {modes.map(({ value, label, icon: Icon }) => {
        const isActive = mode === value;
        const isDisabled =
          (value === "browser" || value === "auto") && !isBrowserInferenceAvailable;

        return (
          <button
            key={value}
            onClick={() => !isDisabled && onModeChange(value)}
            disabled={isDisabled}
            title={
              isDisabled
                ? "Browser inference is not available in this browser"
                : value === "browser" && modelStatus === "ready"
                  ? "Model loaded — inference runs locally"
                  : value === "browser"
                    ? "Run model in your browser via WebGPU"
                    : value === "auto"
                      ? "Use browser if model loaded, otherwise cloud"
                      : "Use cloud API (HuggingFace)"
            }
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
              isActive
                ? "bg-foreground/10 text-foreground shadow-sm"
                : "text-muted-foreground/60 hover:text-muted-foreground",
              isDisabled && "opacity-30 cursor-not-allowed",
            )}
          >
            <Icon className="size-3" />
            <span>{label}</span>
            {value === "browser" && modelStatus === "ready" && (
              <span className="size-1.5 rounded-full bg-[#28c840]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
