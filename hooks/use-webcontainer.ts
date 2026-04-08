"use client";

import { useCallback, useRef, useState } from "react";
import type { ExecutionResult } from "@/types/sandbox";

interface WebContainerState {
  isReady: boolean;
  isBooting: boolean;
  isExecuting: boolean;
  output: ExecutionResult | null;
  error: string | null;
  history: Array<{
    command: string;
    stdout: string;
    exitCode: number;
    timestamp: number;
  }>;
}

export function useWebContainer() {
  const [state, setState] = useState<WebContainerState>({
    isReady: false,
    isBooting: false,
    isExecuting: false,
    output: null,
    error: null,
    history: [],
  });

  const sandboxRef = useRef<typeof import("@/lib/webcontainer-sandbox") | null>(
    null,
  );

  const getSandbox = useCallback(async () => {
    if (!sandboxRef.current) {
      sandboxRef.current = await import("@/lib/webcontainer-sandbox");
    }
    return sandboxRef.current;
  }, []);

  const boot = useCallback(async () => {
    setState((s) => ({ ...s, isBooting: true, error: null }));
    try {
      const sb = await getSandbox();
      await sb.bootSandbox();
      setState((s) => ({ ...s, isReady: true, isBooting: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isBooting: false,
        error:
          err instanceof Error ? err.message : "Failed to boot sandbox",
      }));
    }
  }, [getSandbox]);

  const execute = useCallback(
    async (command: string) => {
      setState((s) => ({ ...s, isExecuting: true, output: null, error: null }));
      try {
        const sb = await getSandbox();
        if (!sb.isSandboxReady()) {
          setState((s) => ({ ...s, isBooting: true }));
          await sb.bootSandbox();
          setState((s) => ({ ...s, isReady: true, isBooting: false }));
        }

        const result = await sb.execCommand(command);

        const executionResult: ExecutionResult = {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
        };

        setState((s) => ({
          ...s,
          isExecuting: false,
          output: executionResult,
          history: [
            ...s.history,
            {
              command,
              stdout: result.stdout,
              exitCode: result.exitCode,
              timestamp: Date.now(),
            },
          ],
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          isExecuting: false,
          error: err instanceof Error ? err.message : "Execution failed",
        }));
      }
    },
    [getSandbox],
  );

  const clearOutput = useCallback(() => {
    setState((s) => ({ ...s, output: null, error: null }));
  }, []);

  return { ...state, boot, execute, clearOutput };
}
