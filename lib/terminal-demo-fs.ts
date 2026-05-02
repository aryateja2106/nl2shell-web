import type { NetworkConfig } from "just-bash";

/** localStorage key for merged demo files under /home/user */
export const TERMINAL_VFS_STORAGE_KEY = "nl2shell-demo-vfs-v1";

/** Fake SSH / host material — obviously synthetic, not real secrets */
const FAKE_PUBKEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFAKEKEYNL2SHELLDEMOONLYNOTREALEXAMPLE== demo@nl2shell.invalid\n";

export const DEMO_INITIAL_FILES: Record<string, string> = {
  "/home/user/README.txt": `NL2Shell demo home
==================
This is a simulated home directory in your browser (just-bash).

Try:
  ls              list files
  cd Desktop      go to Desktop
  mkdir work && cd work && echo hi > note.txt
  cat ~/.ssh/config
  curl https://httpbin.org/get

Use the NL2Shell bar above to turn English into a command, then run it here.
`,

  "/home/user/Desktop/README.txt": `Desktop
You can create files here; they can be saved in browser storage (see header).
`,

  "/home/user/work/README.md": `# work

Practice mkdir, cd, and echo redirection here.
`,

  "/home/user/Documents/notes.md": `# Notes

- Disk check: du -sh .
- List with sizes: ls -lah
`,

  "/home/user/projects/demo-app/package.json": `{
  "name": "demo-app",
  "version": "0.0.0-demo",
  "private": true,
  "description": "Toy package.json for NL2Shell browser demo only. npm install does not run a real registry here."
}
`,

  "/home/user/projects/demo-app/README.md": `# demo-app

This is a fake project tree for trying ls, cat, and grep.
`,

  "/home/user/projects/demo-app/src/main.ts": `export function hello(): string {
  return "hello from demo-app";
}
`,

  "/home/user/demo/etc-hosts-sample": `# Sample hosts file (NOT /etc/hosts — demo only)
127.0.0.1   localhost
192.0.2.10  fake-gitlab.example.invalid
192.0.2.11  fake-build.example.invalid
`,

  "/home/user/.ssh/id_ed25519.pub": FAKE_PUBKEY,

  "/home/user/.ssh/config": `# NL2Shell DEMO ONLY — not your real SSH config
Host fake-gitlab
  HostName fake-gitlab.example.invalid
  User git
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new

Host fake-build
  HostName fake-build.example.invalid
  User deploy
  Port 22
`,

  "/home/user/.ssh/known_hosts": `fake-gitlab.example.invalid ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKnownHostsDemoLineNotReal==
`,

  "/home/user/.profile": `# ~/.profile (demo)
export EDITOR=nano
export DEMO=1
`,
};

/** Allow-list for curl/wget inside just-bash (fetch from the browser page). */
export const TERMINAL_DEMO_NETWORK: NetworkConfig = {
  allowedUrlPrefixes: [
    "https://httpbin.org",
    "https://jsonplaceholder.typicode.com",
  ],
  allowedMethods: ["GET", "HEAD"],
  maxRedirects: 10,
  timeoutMs: 25_000,
  maxResponseSize: 2 * 1024 * 1024,
};

export function loadStoredVfsOverlay(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TERMINAL_VFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === "string" && k.startsWith("/home/user") && typeof v === "string") {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function clearStoredVfs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TERMINAL_VFS_STORAGE_KEY);
}

const MAX_STORE_BYTES = 500_000;

export async function snapshotHomeUserFiles(
  getAllPaths: () => string[],
  readFile: (path: string) => Promise<string>,
  stat: (path: string) => Promise<{ isFile: boolean; isDirectory: boolean; size: number }>,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const paths = getAllPaths().filter((p) => p.startsWith("/home/user"));
  for (const p of paths) {
    try {
      const s = await stat(p);
      if (!s.isFile || s.size > 256_000) continue;
      out[p] = await readFile(p);
    } catch {
      /* skip */
    }
  }
  return out;
}

export function persistVfsJson(files: Record<string, string>): boolean {
  const json = JSON.stringify(files);
  if (json.length > MAX_STORE_BYTES) {
    console.warn("[nl2shell] demo VFS snapshot too large; not saving");
    return false;
  }
  try {
    localStorage.setItem(TERMINAL_VFS_STORAGE_KEY, json);
    return true;
  } catch {
    console.warn("[nl2shell] localStorage full; demo VFS not saved");
    return false;
  }
}
