/** Runtime hints for WebContainer / SharedArrayBuffer issues (user-facing strings). */

export function webContainerEnvironmentLine(): string {
  if (typeof globalThis === "undefined") return "crossOriginIsolated=(ssr)";
  const iso =
    "crossOriginIsolated" in globalThis
      ? String(globalThis.crossOriginIsolated)
      : "n/a";
  const sab =
    typeof SharedArrayBuffer !== "undefined"
      ? "SharedArrayBuffer=ok"
      : "SharedArrayBuffer=missing";
  return `crossOriginIsolated=${iso}, ${sab}`;
}

/**
 * WebContainer needs a cross-origin isolated document. Fail fast instead of waiting on boot().
 */
export function assertCrossOriginIsolatedForWebContainer(): void {
  if (typeof globalThis === "undefined") return;
  if (!("crossOriginIsolated" in globalThis)) return;
  if (globalThis.crossOriginIsolated !== false) return;
  throw new Error(
    "WebContainer cannot start: this document is not cross-origin isolated (SharedArrayBuffer is blocked). " +
      "The site must send Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp " +
      "on the HTML response. If you use a reverse proxy or CDN, forward those headers unchanged. " +
      "Third-party scripts without Cross-Origin-Resource-Policy can also prevent isolation. " +
      `Diagnostics: ${webContainerEnvironmentLine()}. ` +
      "See https://webcontainers.io/guides/troubleshooting",
  );
}
