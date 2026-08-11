import { randomUUID } from "node:crypto";

// Discord button custom_id values are capped at 100 characters, so
// destructive-confirmation buttons can't carry a full email address or a
// list of user IDs directly. Instead we stash the payload here under a
// short token and put only the token in the custom_id. In-memory only —
// fine for these, since a confirmation prompt that outlives a bot restart
// wouldn't be safe to honor anyway.
const pending = new Map();
const TTL_MS = 5 * 60 * 1000;

export function stashPendingAction(payload) {
  const token = randomUUID().slice(0, 8);
  pending.set(token, payload);
  setTimeout(() => pending.delete(token), TTL_MS).unref?.();
  return token;
}

export function takePendingAction(token) {
  const payload = pending.get(token);
  pending.delete(token);
  return payload;
}
