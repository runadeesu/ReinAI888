import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Netlify Functions/Edge Functions have no persistent, writable local disk
// across invocations, so uploads there go to Netlify Blobs instead. Netlify
// sets NETLIFY=true in every build and runtime environment it controls.
// Locally (and on any other Node host with a real filesystem) we just write
// to UPLOAD_DIR. Both backends share the same `storagePath` key format, so
// the value stored in Attachment.storagePath is backend-agnostic.
const useNetlifyBlobs = process.env.NETLIFY === "true";

const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./storage/uploads");

function buildKey(userId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${crypto.randomUUID()}-${safeName}`;
}

async function getBlobStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore("reinai-uploads");
}

export async function saveFile(userId: string, fileName: string, buffer: Buffer): Promise<string> {
  const key = buildKey(userId, fileName);

  if (useNetlifyBlobs) {
    const store = await getBlobStore();
    await store.set(key, new Blob([new Uint8Array(buffer)]));
    return key;
  }

  const fullPath = path.join(UPLOAD_ROOT, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return key;
}

export async function readFile(storagePath: string): Promise<Buffer> {
  if (useNetlifyBlobs) {
    const store = await getBlobStore();
    const data = await store.get(storagePath, { type: "arrayBuffer" });
    if (!data) throw new Error("File not found in blob storage");
    return Buffer.from(data);
  }

  const fullPath = path.join(UPLOAD_ROOT, storagePath);
  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid storage path");
  }
  return fs.readFile(fullPath);
}

export async function deleteFile(storagePath: string): Promise<void> {
  if (useNetlifyBlobs) {
    const store = await getBlobStore();
    await store.delete(storagePath);
    return;
  }

  const fullPath = path.join(UPLOAD_ROOT, storagePath);
  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid storage path");
  }
  await fs.rm(fullPath, { force: true });
}
