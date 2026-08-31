import { execSync } from "node:child_process";
import os from "node:os";
import type { EnvironmentProbe } from "./env-probe";

function which(bin: string): boolean {
  try {
    execSync(`command -v ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function readOsRelease(): string {
  if (os.platform() === "darwin") return "macos";
  try {
    const text = execSync("cat /etc/os-release 2>/dev/null || true", {
      encoding: "utf8",
    });
    return text.match(/^ID=(.+)$/m)?.[1]?.replace(/"/g, "") || os.platform();
  } catch {
    return os.platform();
  }
}

export function probeHost(): EnvironmentProbe {
  const platform = os.platform();
  const arch = os.arch();
  const hasBrew = which("brew");
  const hasApt = which("apt-get") || which("apt");
  const hasDnf = which("dnf");
  const hasPacman = which("pacman");

  let packageManager = "unknown";
  if (platform === "darwin" || hasBrew) packageManager = "brew";
  else if (hasApt) packageManager = "apt";
  else if (hasDnf) packageManager = "dnf";
  else if (hasPacman) packageManager = "pacman";

  const home = os.homedir();
  const onVercel = Boolean(process.env.VERCEL);

  return {
    arch,
    os: platform,
    osId: readOsRelease(),
    packageManager: onVercel ? "sandbox" : packageManager,
    homeStyle: home.startsWith("/Users/")
      ? "macos-users"
      : home.startsWith("/home/")
        ? "unix-home"
        : "unknown",
    home,
    hasSsh: which("ssh"),
    hasTmux: which("tmux"),
    hasVnc: which("vncserver") || which("vncserver-x11-serviced"),
    hasBrew,
    hasApt,
    hasDnf,
    paths: (process.env.PATH || "").split(":").slice(0, 12),
    hostname: os.hostname(),
    runtime: onVercel ? "vercel-serverless" : "node-host",
    raw: {
      platform,
      release: os.release(),
      type: os.type(),
      vercel: onVercel ? "1" : "0",
    },
  };
}
