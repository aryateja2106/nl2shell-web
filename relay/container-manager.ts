import { execSync, type ExecSyncOptionsWithStringEncoding } from "node:child_process";

export interface CreateContainerResult {
  containerId: string;
  containerName: string;
  volumeName: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

function run(
  cmd: string,
  options: Partial<ExecSyncOptionsWithStringEncoding> = {}
): string {
  return execSync(cmd, {
    encoding: "utf-8",
    maxBuffer: 2 * 1024 * 1024, // 2 MB
    ...options,
  }).trim();
}

export function createContainer(sessionId: string): CreateContainerResult {
  const containerName = `sandbox-${sessionId}`;
  const volumeName = `vol-${sessionId}`;

  // Create named volume first
  run(`docker volume create ${volumeName}`);

  // Create container (but don't start yet)
  const containerId = run(
    [
      "docker create",
      `--name ${containerName}`,
      `-v ${volumeName}:/agent/workspace`,
      "--network none",
      "--cap-drop ALL",
      "--security-opt no-new-privileges",
      "--memory 512m",
      "--cpus 1",
      "--pids-limit 100",
      "leshell-sandbox",
    ].join(" ")
  );

  // Start the container
  run(`docker start ${containerName}`);

  return { containerId, containerName, volumeName };
}

export function execInContainer(
  containerName: string,
  command: string,
  timeoutMs: number
): ExecResult {
  const start = Date.now();

  // Escape single quotes in the command for safe shell embedding
  const escaped = command.replace(/'/g, `'\\''`);

  // Append 2>&1 to merge stderr into stdout and pipe through head to cap output
  // This keeps output human-readable and prevents buffer overflow
  const MAX_LINES = 200;
  const wrappedCmd = `(${escaped}) 2>&1 | head -n ${MAX_LINES}`;

  try {
    const stdout = run(
      `docker exec ${containerName} bash -c '${wrappedCmd}'`,
      { timeout: timeoutMs }
    );
    const durationMs = Date.now() - start;
    return { stdout, stderr: "", exitCode: 0, durationMs };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;

    // execSync throws with .stdout / .stderr / .status on non-zero exit
    const e = err as {
      stdout?: string;
      stderr?: string;
      status?: number;
      message?: string;
    };

    return {
      stdout: e.stdout?.toString() ?? "",
      stderr: e.stderr?.toString() ?? e.message ?? "unknown error",
      exitCode: e.status ?? 1,
      durationMs,
    };
  }
}

export function stopContainer(containerName: string): void {
  try {
    run(`docker stop ${containerName}`);
  } catch {
    // Container may already be stopped — ignore
  }
}

export function removeContainer(
  containerName: string,
  volumeName: string
): void {
  try {
    run(`docker rm -f ${containerName}`);
  } catch {
    // Ignore if already removed
  }
  try {
    run(`docker volume rm ${volumeName}`);
  } catch {
    // Ignore if already removed
  }
}

export function restartContainer(containerName: string): void {
  run(`docker start ${containerName}`);
}

export function isContainerRunning(containerName: string): boolean {
  try {
    const result = run(
      `docker inspect --format='{{.State.Running}}' ${containerName}`
    );
    return result === "true";
  } catch {
    return false;
  }
}
