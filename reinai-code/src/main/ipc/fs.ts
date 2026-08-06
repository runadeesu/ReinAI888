import path from "node:path";
import fs from "node:fs/promises";
import type { FileEntry } from "../../shared/types.js";

// Every file operation the agent performs is resolved against a project
// root and re-verified to stay inside it — a coding agent that can read the
// project must not be able to read `../../.ssh/id_rsa` because the model
// hallucinated a relative path with too many `..` segments.
export function resolveInRoot(root: string, relPath: string): string {
  const resolved = path.resolve(root, relPath || ".");
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new Error(`パスがプロジェクトフォルダの外を指しています: ${relPath}`);
  }
  return resolved;
}

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "release"]);

export async function listDirectory(root: string, relPath: string): Promise<FileEntry[]> {
  const target = resolveInRoot(root, relPath);
  const entries = await fs.readdir(target, { withFileTypes: true });
  return entries
    .filter((e) => !IGNORED_DIRS.has(e.name) && !e.name.startsWith("."))
    .map((e) => ({
      name: e.name,
      relPath: path.join(relPath, e.name),
      isDirectory: e.isDirectory(),
    }))
    .sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));
}

const MAX_READ_BYTES = 512 * 1024;

export async function readFile(root: string, relPath: string): Promise<string> {
  const target = resolveInRoot(root, relPath);
  const stat = await fs.stat(target);
  if (stat.size > MAX_READ_BYTES) {
    throw new Error(`ファイルが大きすぎます (${Math.round(stat.size / 1024)}KB > 512KB上限): ${relPath}`);
  }
  return fs.readFile(target, "utf-8");
}

export async function writeFile(root: string, relPath: string, content: string): Promise<void> {
  const target = resolveInRoot(root, relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf-8");
}
