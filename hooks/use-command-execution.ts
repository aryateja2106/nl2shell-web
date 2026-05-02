"use client";

import { useMemo } from "react";
import { useWebContainer } from "@/hooks/use-webcontainer";
import { useSandbox } from "@/hooks/use-sandbox";

export type SandboxBackend = "webcontainer" | "relay" | "off";

function getBackend(): SandboxBackend {
  const v = process.env.NEXT_PUBLIC_SANDBOX_BACKEND?.toLowerCase();
  if (v === "relay" || v === "off" || v === "webcontainer") return v;
  return "webcontainer";
}

export interface CommandExecutionApi {
  backend: SandboxBackend;
  execute: (command: string) => void | Promise<void>;
  isExecuting: boolean;
  isBooting: boolean;
  isReady: boolean;
  output: import("@/types/sandbox").ExecutionResult | null;
  error: string | null;
  history: Array<{
    command: string;
    stdout: string;
    exitCode: number;
    timestamp: number;
  }>;
  clearOutput: () => void;
}

export function useCommandExecution(): CommandExecutionApi {
  const wc = useWebContainer();
  const relay = useSandbox();
  const backend = useMemo(() => getBackend(), []);

  if (backend === "relay") {
    return {
      backend: "relay",
      execute: relay.execute,
      isExecuting: relay.isExecuting,
      isBooting: false,
      isReady: true,
      output: relay.output,
      error: relay.error,
      history: relay.history,
      clearOutput: relay.clearOutput,
    };
  }

  if (backend === "off") {
    return {
      backend: "off",
      execute: async () => {},
      isExecuting: false,
      isBooting: false,
      isReady: false,
      output: null,
      error: null,
      history: [],
      clearOutput: () => {},
    };
  }

  return {
    backend: "webcontainer",
    execute: wc.execute,
    isExecuting: wc.isExecuting,
    isBooting: wc.isBooting,
    isReady: wc.isReady,
    output: wc.output,
    error: wc.error,
    history: wc.history,
    clearOutput: wc.clearOutput,
  };
}
