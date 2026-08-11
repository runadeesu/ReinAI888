import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Lightweight JSON-file persistence for data that belongs to this Discord
// server specifically (warnings, FAQs, custom commands, scheduled posts,
// the bot's own audit log) rather than to ReinAI's product database.
// Fine for a single always-on bot process; each collection is one file
// under data/, read + rewritten whole on every write (these stay small).

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readCollection(name) {
  await ensureDataDir();
  try {
    const raw = await readFile(join(DATA_DIR, `${name}.json`), "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeCollection(name, data) {
  await ensureDataDir();
  await writeFile(join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), "utf8");
}

export async function appendRecord(collection, record) {
  const data = await readCollection(collection);
  data.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...record });
  await writeCollection(collection, data);
  return data[data.length - 1];
}

export async function listRecords(collection) {
  return readCollection(collection);
}

export async function removeRecord(collection, id) {
  const data = await readCollection(collection);
  const next = data.filter((r) => r.id !== id);
  await writeCollection(collection, next);
  return next.length !== data.length;
}

export async function updateCollection(collection, updater) {
  const data = await readCollection(collection);
  const next = updater(data);
  await writeCollection(collection, next);
  return next;
}
