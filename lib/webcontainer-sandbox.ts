"use client";

import { WebContainer } from "@webcontainer/api";

const BOOT_TIMEOUT_MS = 55_000;

function bootTimeoutMessage(): string {
  const isolated =
    typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
  if (!isolated) {
    return (
      "WebContainer did not start in time. This site needs cross-origin isolation " +
      "(SharedArrayBuffer). If this keeps happening, use “Open in terminal” for an in-browser shell, " +
      "or run commands on your machine."
    );
  }
  return (
    "WebContainer boot timed out. Try again, use the web terminal (/terminal), " +
    "or run the command locally."
  );
}

function withBootTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(bootTimeoutMessage()));
    }, BOOT_TIMEOUT_MS);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

let container: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function bootSandbox(): Promise<void> {
  if (container) return;
  if (bootPromise) {
    await bootPromise;
    return;
  }

  bootPromise = (async () => {
    const wc = await withBootTimeout(WebContainer.boot());
    await wc.mount({
      workspace: { directory: {} },
    });
    return wc;
  })();

  try {
    container = await bootPromise;
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
