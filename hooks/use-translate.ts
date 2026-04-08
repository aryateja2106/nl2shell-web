"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrowserEngineStatus } from "@/lib/browser-engine";

export type InferenceMode = "cloud" | "browser" | "auto";
export type { BrowserEngineStatus };

interface TranslateResult {
  command: string;
  meta: string;
}

interface TranslateState {
  result: TranslateResult | null;
  isLoading: boolean;
  error: string | null;
  browserStatus: BrowserEngineStatus;
}

async function translateViaCloud(query: string): Promise<TranslateResult> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query.trim() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Translation failed");
  return { command: data.command, meta: data.meta };
}

async function translateViaBrowser(query: string): Promise<TranslateResult> {
  const engine = await import("@/lib/browser-engine");
  const command = await engine.generate(query.trim());
  if (!command)
    throw new Error(
      "Browser model returned an empty response. Try Cloud mode.",
    );
  return { command, meta: "Generated locally in your browser" };
}

export function useTranslate(mode: InferenceMode = "cloud") {
  const [state, setState] = useState<TranslateState>({
    result: null,
    isLoading: false,
    error: null,
    browserStatus: { stage: "idle" },
  });

  useEffect(() => {
    if (mode === "cloud") return;

    let unsubscribe: (() => void) | null = null;
    import("@/lib/browser-engine")
      .then((engine) => {
        setState((s) => ({ ...s, browserStatus: engine.getStatus() }));
        unsubscribe = engine.onStatusChange((status) => {
          setState((s) => ({ ...s, browserStatus: status }));
        });
      })
      .catch(() => {});
    return () => unsubscribe?.();
  }, [mode]);

  const translate = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setState((s) => ({ ...s, result: null, isLoading: true, error: null }));

      try {
        let result: TranslateResult;

        if (mode === "browser") {
          result = await translateViaBrowser(query);
        } else if (mode === "auto") {
          const engine = await import("@/lib/browser-engine").catch(
            () => null,
          );
          result = engine?.isReady()
            ? await translateViaBrowser(query)
            : await translateViaCloud(query);
        } else {
          result = await translateViaCloud(query);
        }

        setState((s) => ({ ...s, result, isLoading: false, error: null }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Translation failed";
        setState((s) => ({
          ...s,
          result: null,
          isLoading: false,
          error:
            err instanceof TypeError
              ? "Network error. Please check your connection."
              : message,
        }));
      }
    },
    [mode],
  );

  const reset = useCallback(() => {
    setState((s) => ({ ...s, result: null, isLoading: false, error: null }));
  }, []);

  return { ...state, translate, reset };
}
