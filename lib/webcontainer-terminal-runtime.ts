"use client";

import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import {
  assertCrossOriginIsolatedForWebContainer,
  webContainerEnvironmentLine,
} from "@/lib/webcontainer-diagnostics";
import { demoFilesToWorkspaceTree } from "@/lib/webcontainer-mount-tree";
import {
  WEBCONTAINER_NPMRC,
  WEBCONTAINER_USER_BASHRC,
  WEBCONTAINER_USER_PROFILE,
} from "@/lib/webcontainer-seed-env";

/** StackBlitz cold start can exceed 1m on slow networks; boot also waits for any prior teardown. */
const BOOT_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, err: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(err)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export interface WebContainerTerminalSession {
  wc: WebContainer;
  process: WebContainerProcess;
  teardown: () => void;
}

/**
 * Boots an isolated WebContainer (do not share with lib/webcontainer-sandbox singleton),
 * mounts demo files under workspace/home/user, spawns bash with a PTY.
 */
export async function startWebContainerTerminalSession(
  demoFiles: Record<string, string>,
  terminalSize: { cols: number; rows: number },
): Promise<WebContainerTerminalSession> {
  assertCrossOriginIsolatedForWebContainer();

  const { teardownSandbox } = await import("@/lib/webcontainer-sandbox");
  await teardownSandbox();

  const { WebContainer } = await import("@webcontainer/api");

  const bootTimeoutMsg =
    "WebContainer boot timed out (no response from StackBlitz). " +
    `Current page: ${webContainerEnvironmentLine()}. ` +
    "Use HTTPS or localhost, allow third-party cookies for this site, pause ad-blockers for stackblitz.com / webcontainer-api.io, " +
    "and try a private window. If another tab already started WebContainer here, close it or reload this page. " +
    "Details: https://webcontainers.io/guides/troubleshooting";

  const wc = await withTimeout(
    WebContainer.boot(),
    BOOT_TIMEOUT_MS,
    bootTimeoutMsg,
  );

  const tree = demoFilesToWorkspaceTree({
    ...demoFiles,
    "/home/user/.npmrc": WEBCONTAINER_NPMRC,
    "/home/user/.profile": WEBCONTAINER_USER_PROFILE,
    "/home/user/.bashrc": WEBCONTAINER_USER_BASHRC,
    "/home/user/.npm-cache/.keep": "\n",
    "/home/user/.npm/_logs/.keep": "\n",
  });
  await wc.mount({
    workspace: {
      directory: {
        ".npmrc": { file: { contents: WEBCONTAINER_NPMRC } },
        ...tree,
        "package.json": {
          file: {
            contents: JSON.stringify(
              {
                name: "nl2shell-wc-workspace",
                version: "0.0.0",
                private: true,
                description:
                  "WebContainer workspace for NL2Shell — run npm install here for real packages.",
              },
              null,
              2,
            ),
          },
        },
      },
    },
  });

  const process = await wc.spawn("bash", ["-il"], {
    terminal: {
      cols: terminalSize.cols,
      rows: terminalSize.rows,
    },
    env: {
      HOME: "/workspace/home/user",
      TERM: "xterm-256color",
      NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/",
    },
    cwd: "/workspace/home/user",
  });

  const teardown = () => {
    try {
      process.kill();
    } catch {
      /* ignore */
    }
    try {
      wc.teardown();
    } catch {
      /* ignore */
    }
  };

  return { wc, process, teardown };
}
