import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { app } from "electron";

// Keyed by a hash of the project path so re-opening the same folder resumes
// the same conversation, without needing a database for a single-user
// desktop app.
function conversationFilePath(projectRoot: string): string {
  const hash = crypto.createHash("sha256").update(projectRoot).digest("hex").slice(0, 16);
  const dir = path.join(app.getPath("userData"), "conversations");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${hash}.json`);
}

export function loadConversation(projectRoot: string): unknown[] {
  try {
    const raw = fs.readFileSync(conversationFilePath(projectRoot), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversation(projectRoot: string, conversation: unknown[]): void {
  fs.writeFileSync(conversationFilePath(projectRoot), JSON.stringify(conversation, null, 2), "utf-8");
}
