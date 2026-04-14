"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ProgressReport = { progress: number; text: string };

interface TranslateResult {
  command: string;
  meta: string;
}

export type ModelStatus = "idle" | "loading" | "ready" | "error";

interface LocalInferenceState {
  isBrowserInferenceAvailable: boolean;
  modelStatus: ModelStatus;
  loadProgress: number;
  loadProgressText: string;
  result: TranslateResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useLocalInference() {
  const [state, setState] = useState<LocalInferenceState>({
    isBrowserInferenceAvailable: false,
    modelStatus: "idle",
    loadProgress: 0,
    loadProgressText: "",
    result: null,
    isLoading: false,
    error: null,
  });

  // Detect WebGPU after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter?: () => Promise<unknown> };
    };
    const hasWasm = typeof WebAssembly === "object";
    // Either capability check is sufficient here: WebGPU may run directly, and
    // WASM enables fallback. Actual runtime availability is validated at engine
    // initialization time.
    const available = hasWasm || typeof nav.gpu?.requestAdapter === "function";
    setState((s) => ({ ...s, isBrowserInferenceAvailable: available }));
  }, []);

  // Keep engine module ref to avoid re-importing
  const engineModRef = useRef<typeof import("@/lib/browser-engine") | null>(
    null,
  );

  const getEngine = useCallback(async () => {
    if (!engineModRef.current) {
      engineModRef.current = await import("@/lib/browser-engine");
    }
    return engineModRef.current;
  }, []);

  const loadModel = useCallback(async () => {
    setState((s) => ({
      ...s,
      modelStatus: "loading",
      loadProgress: 0,
      loadProgressText: "Initializing browser inference...",
      error: null,
    }));

    try {
      const eng = await getEngine();

      if (eng.isEngineReady()) {
        setState((s) => ({
          ...s,
          modelStatus: "ready",
          loadProgress: 100,
          loadProgressText: "Ready",
        }));
        return;
      }

      await eng.initEngine((report: ProgressReport) => {
        setState((s) => ({
          ...s,
          loadProgress: Math.round(report.progress * 100),
          loadProgressText: report.text,
        }));
      });

      setState((s) => ({
        ...s,
        modelStatus: "ready",
        loadProgress: 100,
        loadProgressText: "Ready",
      }));
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      let message = raw;
      if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
        message =
          "Failed to download model. Check your connection or try again.";
      }
      setState((s) => ({
        ...s,
        modelStatus: "error",
        error: message,
        loadProgress: 0,
        loadProgressText: "",
      }));
    }
  }, [getEngine]);

  const translate = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setState((s) => ({ ...s, result: null, isLoading: true, error: null }));

      try {
        const eng = await getEngine();
        const { command, meta } = await eng.generate(query.trim());

        if (!command) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: "Model returned empty response",
          }));
          return;
        }

        setState((s) => ({
          ...s,
          result: { command, meta },
          isLoading: false,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Inference failed";
        setState((s) => ({
          ...s,
          isLoading: false,
          error: message,
        }));
      }
    },
    [getEngine],
  );

  const reset = useCallback(() => {
    setState((s) => ({
      ...s,
      result: null,
      isLoading: false,
      error: null,
    }));
  }, []);

  const unloadModel = useCallback(async () => {
    const eng = await getEngine();
    await eng.unloadEngine();
    setState((s) => ({
      ...s,
      modelStatus: "idle",
      loadProgress: 0,
      loadProgressText: "",
    }));
  }, [getEngine]);

  return {
    ...state,
    loadModel,
    translate,
    reset,
    unloadModel,
  };
}
