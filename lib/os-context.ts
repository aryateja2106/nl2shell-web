import { execSync } from "child_process";

export interface OSContext {
  os: "linux" | "macos" | "windows";
  arch: "arm64" | "x86_64" | "unknown";
  distro?: string;
  packageManager: string;
  shell: string;
  user: string;
  isRoot: boolean;
  hasDocker: boolean;
  hasSudo: boolean;
}

function tryExec(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 3000, stdio: ["pipe", "pipe", "pipe"] })
      .trim();
  } catch {
    return null;
  }
}

function detectOS(): "linux" | "macos" | "windows" {
  switch (process.platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}

function detectArch(): "arm64" | "x86_64" | "unknown" {
  switch (process.arch) {
    case "arm64":
      return "arm64";
    case "x64":
      return "x86_64";
    default:
      return "unknown";
  }
}

function detectDistro(os: "linux" | "macos" | "windows"): string | undefined {
  if (os === "macos") {
    const ver = tryExec("sw_vers -productVersion");
    return ver ? `macOS ${ver}` : undefined;
  }
  if (os === "linux") {
    const release = tryExec("cat /etc/os-release");
    if (release) {
      const match = release.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
      if (match) return match[1];
    }
  }
  return undefined;
}

function detectPackageManager(): string {
  const managers = [
    { cmd: "which brew", name: "brew" },
    { cmd: "which apt", name: "apt" },
    { cmd: "which dnf", name: "dnf" },
    { cmd: "which pacman", name: "pacman" },
    { cmd: "which apk", name: "apk" },
  ];
  for (const { cmd, name } of managers) {
    if (tryExec(cmd)) return name;
  }
  return "unknown";
}

function detectUser(): string {
  return process.env.USER || tryExec("whoami") || "unknown";
}

export async function gatherOSContext(): Promise<OSContext> {
  const os = detectOS();
  const arch = detectArch();
  const distro = detectDistro(os);
  const packageManager = detectPackageManager();
  const shell = process.env.SHELL || "bash";
  const user = detectUser();
  const isRoot = user === "root" || process.getuid?.() === 0;
  const hasDocker = tryExec("which docker") !== null;
  const hasSudo = tryExec("which sudo") !== null;

  return { os, arch, distro, packageManager, shell, user, isRoot, hasDocker, hasSudo };
}

export function formatContextPrompt(ctx: OSContext): string {
  const osPart = ctx.distro
    ? `${ctx.distro} (${ctx.os === "macos" ? "Darwin" : ctx.os} ${ctx.arch})`
    : `${ctx.os} (${ctx.arch})`;

  const userPart = ctx.isRoot
    ? `${ctx.user} (root)`
    : ctx.hasSudo
    ? `${ctx.user} (non-root, sudo available)`
    : `${ctx.user} (non-root)`;

  const dockerPart = ctx.hasDocker ? "available" : "not available";

  const lines = [
    `OS: ${osPart}`,
    `Package manager: ${ctx.packageManager}`,
    `Shell: ${ctx.shell.split("/").pop() ?? ctx.shell}`,
    `User: ${userPart}`,
    `Docker: ${dockerPart}`,
  ];

  return lines.join("\n");
}
