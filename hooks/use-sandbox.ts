"use client";

import { useCallback, useState, useRef, useSyncExternalStore } from "react";
import type { ExecutionResult } from "@/types/sandbox";

interface SandboxState {
  output: ExecutionResult | null;
  isExecuting: boolean;
  error: string | null;
}

const SESSION_KEY = "leshell-session-id";

// Hydration-safe localStorage access using useSyncExternalStore
function subscribeSessionStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function getSessionSnapshot() {
  return localStorage.getItem(SESSION_KEY);
}
function getSessionServerSnapshot() {
  return null;
}

export function useSandbox() {
  const activeSessionId = useSyncExternalStore(
    subscribeSessionStorage,
    getSessionSnapshot,
    getSessionServerSnapshot
  );

  const [state, setState] = useState<SandboxState>({
    output: null,
    isExecuting: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const ensureSession = useCallback(async (): Promise<string> => {
    // Return existing session if available
    const stored = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    if (stored) return stored;

    const res = await fetch("/api/session", { method: "POST" }).catch(() => null);
    if (!res) {
      throw new Error("Sandbox is currently offline. Translation still works — try running the command locally instead.");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Session creation failed" }));
      throw new Error(body.error || "Failed to create sandbox session");
    }
    const data = await res.json();
    const id = data.id as string;

    localStorage.setItem(SESSION_KEY, id);
    // Notify useSyncExternalStore subscribers
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
    return id;
  }, []);

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
        const message = err instanceof Error ? err.message : String(err);
        const isNetworkError = err instanceof TypeError;
        setState((prev) => ({
          ...prev,
          output: null,
          isExecuting: false,
          error: isNetworkError
            ? "Sandbox is currently offline. Translation still works — try running the command locally instead."
            : message,
        }));
      }
    },
    [ensureSession]
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
    setState({
      output: null,
      isExecuting: false,
      error: null,
    });
  }, []);

  const clearOutput = useCallback(() => {
    setState((prev) => ({ ...prev, output: null, error: null }));
  }, []);

  return {
    ...state,
    activeSessionId,
    execute,
    clearSession,
    clearOutput,
  };
}
