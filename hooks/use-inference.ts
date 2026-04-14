"use client";

import { useEffect, useState } from "react";
import { useTranslate } from "@/hooks/use-translate";
import { useLocalInference } from "@/hooks/use-local-inference";

export type InferenceMode = "cloud" | "browser" | "auto";

export function useInference() {
  const remote = useTranslate();
  const local = useLocalInference();
  const [mode, setMode] = useState<InferenceMode>("cloud");

  // When user switches to browser mode and model isn't ready, start loading
  useEffect(() => {
    if (
      (mode === "browser" || mode === "auto") &&
      local.isBrowserInferenceAvailable &&
      local.modelStatus === "idle"
    ) {
      local.loadModel();
    }
  }, [mode, local, local.isBrowserInferenceAvailable, local.modelStatus, local.loadModel]);

  const useBrowser =
    mode === "browser" ||
    (mode === "auto" && local.modelStatus === "ready");

  const translate = async (query: string) => {
    if (useBrowser && local.modelStatus === "ready") {
      return local.translate(query);
    }
    return remote.translate(query);
  };

  const reset = () => {
    remote.reset();
    local.reset();
  };

  const result = useBrowser ? local.result : remote.result;
  const isLoading = useBrowser ? local.isLoading : remote.isLoading;
  const error = useBrowser ? local.error : remote.error;
  const inferenceSource: "cloud" | "browser" = useBrowser ? "browser" : "cloud";

  return {
    // State
    result,
    isLoading,
    error,
    inferenceSource,

    // Mode
    mode,
    setMode,

    // Local model state
    isBrowserInferenceAvailable: local.isBrowserInferenceAvailable,
    modelStatus: local.modelStatus,
    loadProgress: local.loadProgress,
    loadProgressText: local.loadProgressText,
    loadModel: local.loadModel,
    unloadModel: local.unloadModel,

    // Actions
    translate,
    reset,
  };
}
