import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Serverless hosts have no persistent, writable local disk across
// invocations, so uploads there go to the host's blob storage instead.
// Vercel sets VERCEL=1 and Netlify sets NETLIFY=true in every build and
// runtime environment they control. Locally (and on any other Node host
// with a real filesystem) we just write to UPLOAD_DIR. All backends share
// the same `storagePath` key format, so the value stored in
// Attachment.storagePath is backend-agnostic.
const useVercelBlob = process.env.VERCEL === "1";
const useNetlifyBlobs = !useVercelBlob && process.env.NETLIFY === "true";

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

  if (useVercelBlob) {
    const { put } = await import("@vercel/blob");
    await put(key, buffer, { access: "public", addRandomSuffix: false });
    return key;
  }

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
  if (useVercelBlob) {
    const { get } = await import("@vercel/blob");
    const result = await get(storagePath, { access: "public" });
    if (!result || !result.stream) throw new Error("File not found in blob storage");
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

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
  if (useVercelBlob) {
    const { del } = await import("@vercel/blob");
    await del(storagePath);
    return;
  }

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
