export type EnvironmentProbe = {
  arch: string;
  os: string;
  osId: string;
  packageManager: string;
  homeStyle: "unix-home" | "macos-users" | "unknown";
  home: string;
  hasSsh: boolean;
  hasTmux: boolean;
  hasVnc: boolean;
  hasBrew: boolean;
  hasApt: boolean;
  hasDnf: boolean;
  paths: string[];
  hostname: string;
  runtime: "node-host" | "vercel-serverless" | "unknown";
  raw: Record<string, string>;
};

export function formatProbeBadge(env: EnvironmentProbe): string {
  return `${env.osId || env.os} · ${env.arch} · ${env.packageManager}`;
}
