"use client";

import { WebContainer } from "@webcontainer/api";

let container: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function bootSandbox(): Promise<void> {
  if (container) return;
  if (bootPromise) {
    await bootPromise;
    return;
  }

  bootPromise = WebContainer.boot();
  try {
    container = await bootPromise;
    await container.mount({
      workspace: { directory: {} },
    });
  } catch (err) {
    bootPromise = null;
    throw err;
  }
}

export function isSandboxReady(): boolean {
  return container !== null;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export async function execCommand(command: string): Promise<ExecResult> {
  if (!container) throw new Error("Sandbox not booted");

  const start = performance.now();
  const process = await container.spawn("sh", ["-c", command], {
    cwd: "/workspace",
  });

  let stdout = "";
  process.output.pipeTo(
    new WritableStream({
      write(chunk) {
        stdout += chunk;
      },
    }),
  );

  const exitCode = await process.exit;
  const durationMs = Math.round(performance.now() - start);

  return { stdout: stdout.trim(), stderr: "", exitCode, durationMs };
}

export async function teardownSandbox(): Promise<void> {
  if (container) {
    container.teardown();
    container = null;
    bootPromise = null;
  }
}
