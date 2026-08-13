import { config } from "./config.js";

// Same shape as api.js's botFetch, but targets REINChat instead of ReinAI —
// a separate app with its own base URL, sharing only the bot's secret.
async function reinchatFetch(path, options = {}) {
  const res = await fetch(`${config.reinchatUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Bot-Secret": config.botSecret,
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && !body.error) body.error = `${res.status} ${res.statusText}`;
  return body;
}

export function startReinChatVerification(discordId, discordUsername) {
  return reinchatFetch("/api/discord-link/start", {
    method: "POST",
    body: JSON.stringify({ discordId, discordUsername }),
  });
}

export async function fetchNewlyLinkedReinChat() {
  const result = await reinchatFetch("/api/discord-link/status");
  if (result.error) return result;
  return {
    links: result.links.map((l) => ({
      discordId: l.discord_id,
      discordUsername: l.discord_username,
      linkedAt: l.linked_at,
    })),
  };
}

export function ackLinkedReinChat(discordIds) {
  return reinchatFetch("/api/discord-link/ack", {
    method: "POST",
    body: JSON.stringify({ discordIds }),
  });
}
