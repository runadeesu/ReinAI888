import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./storage/uploads");

export async function saveFile(userId: string, fileName: string, buffer: Buffer): Promise<string> {
  const userDir = path.join(UPLOAD_ROOT, userId);
  await fs.mkdir(userDir, { recursive: true });

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${crypto.randomUUID()}-${safeName}`;
  const fullPath = path.join(userDir, uniqueName);

  await fs.writeFile(fullPath, buffer);

  return path.relative(UPLOAD_ROOT, fullPath);
}

export async function readFile(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(UPLOAD_ROOT, storagePath);
  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid storage path");
  }
  return fs.readFile(fullPath);
}

export async function deleteFile(storagePath: string): Promise<void> {
  const fullPath = path.join(UPLOAD_ROOT, storagePath);
  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid storage path");
  }
  await fs.rm(fullPath, { force: true });
}
