"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import type { ExecutionResult } from "@/types/sandbox";

interface SandboxState {
  output: ExecutionResult | null;
  isExecuting: boolean;
  error: string | null;
  activeSessionId: string | null;
}

const SESSION_KEY = "leshell-session-id";

export function useSandbox() {
  const [state, setState] = useState<SandboxState>({
    output: null,
    isExecuting: false,
    error: null,
    activeSessionId: null,
  });

  // Hydrate session from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      setState((prev) => ({ ...prev, activeSessionId: stored }));
    }
  }, []);
  const abortRef = useRef<AbortController | null>(null);

  const ensureSession = useCallback(async (): Promise<string> => {
    // Return existing session if available
    if (state.activeSessionId) return state.activeSessionId;

    const res = await fetch("/api/session", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Session creation failed" }));
      throw new Error(body.error || "Failed to create sandbox session");
    }
    const data = await res.json();
    const id = data.id as string;

    localStorage.setItem(SESSION_KEY, id);
    setState((prev) => ({ ...prev, activeSessionId: id }));
    return id;
  }, [state.activeSessionId]);

  const execute = useCallback(
    async (command: string) => {
      if (!command.trim()) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        output: null,
        isExecuting: true,
        error: null,
      }));

      try {
        const sessionId = await ensureSession();

        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, command }),
          signal: abortRef.current.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          setState((prev) => ({
            ...prev,
            output: null,
            isExecuting: false,
            error: data.error || "Execution failed",
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          output: data as ExecutionResult,
          isExecuting: false,
          error: null,
        }));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          output: null,
          isExecuting: false,
          error:
            err instanceof Error
              ? err.message
              : "Sandbox unavailable. Is the relay server running?",
        }));
      }
    },
    [ensureSession]
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setState({
      output: null,
      isExecuting: false,
      error: null,
      activeSessionId: null,
    });
  }, []);

  const clearOutput = useCallback(() => {
    setState((prev) => ({ ...prev, output: null, error: null }));
  }, []);

  return {
    ...state,
    execute,
    clearSession,
    clearOutput,
  };
}
