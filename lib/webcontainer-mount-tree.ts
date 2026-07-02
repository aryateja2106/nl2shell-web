import type { FileSystemTree } from "@webcontainer/api";

const PREFIX = "home/user";

function ensureDir(tree: FileSystemTree, segments: string[]): FileSystemTree {
  let cursor = tree;
  for (const seg of segments) {
    if (!cursor[seg]) {
      cursor[seg] = { directory: {} };
    }
    const node = cursor[seg];
    if (!("directory" in node)) {
      throw new Error(`webcontainer mount conflict at ${seg}`);
    }
    cursor = node.directory;
  }
  return cursor;
}

/**
 * Build nested tree for paths under `/home/user/` → mounted as `workspace/home/user/...`.
 */
export function demoFilesToWorkspaceTree(
  files: Record<string, string>,
): FileSystemTree {
  const inner: FileSystemTree = {};

  for (const [absPath, contents] of Object.entries(files)) {
    const normalized = absPath.replace(/^\/+/, "");
    if (!normalized.startsWith(PREFIX)) continue;
    const rest = normalized.slice(PREFIX.length).replace(/^\/+/, "");
    if (!rest) continue;
    const segments = rest.split("/").filter(Boolean);
    if (segments.length === 0) continue;
    const fileName = segments.pop()!;
    const parent =
      segments.length > 0 ? ensureDir(inner, segments) : inner;
    parent[fileName] = { file: { contents } };
  }

  return {
    home: {
      directory: {
        user: { directory: inner },
      },
    },
  };
}
