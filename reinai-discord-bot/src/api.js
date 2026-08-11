import { config } from "./config.js";

async function botFetch(path, options = {}) {
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Bot-Secret": config.botSecret,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ReinAI API ${path} -> ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export function startVerification(discordId, discordUsername) {
  return botFetch("/api/discord/verify/start", {
    method: "POST",
    body: JSON.stringify({ discordId, discordUsername }),
  });
}

export function fetchNewlyLinked() {
  return botFetch("/api/discord/verify/status");
}

export function ackLinked(discordIds) {
  return botFetch("/api/discord/verify/ack", {
    method: "POST",
    body: JSON.stringify({ discordIds }),
  });
}

export function fetchPendingAnnouncements() {
  return botFetch("/api/discord/announcements/pending");
}

export function markAnnouncementPosted(id) {
  return botFetch(`/api/discord/announcements/${id}/mark-posted`, { method: "POST" });
}
