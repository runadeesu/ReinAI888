import { config } from "./config.js";

// Returns the parsed JSON body regardless of HTTP status (404s for "user
// not found" etc. are expected outcomes for admin lookups, not exceptions)
// — callers check `.error` on the result. Only network-level failures throw.
async function botFetch(path, options = {}) {
  const res = await fetch(`${config.apiUrl}${path}`, {
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

// --- Admin: user management -------------------------------------------------

export function adminGetUser(query) {
  return botFetch(`/api/discord/admin/user?query=${encodeURIComponent(query)}`);
}

export function adminBanUser(query) {
  return botFetch("/api/discord/admin/user/ban", { method: "POST", body: JSON.stringify({ query }) });
}

export function adminUnbanUser(query) {
  return botFetch("/api/discord/admin/user/unban", { method: "POST", body: JSON.stringify({ query }) });
}

export function adminGetSessions(query) {
  return botFetch(`/api/discord/admin/user/sessions?query=${encodeURIComponent(query)}`);
}

export function adminKillSessions(query) {
  return botFetch("/api/discord/admin/user/kill-sessions", { method: "POST", body: JSON.stringify({ query }) });
}

export function adminGetAuditLog(query) {
  return botFetch(`/api/discord/admin/user/audit-log?query=${encodeURIComponent(query)}`);
}

export function adminSearchEmail(email) {
  return botFetch(`/api/discord/admin/user/search-email?email=${encodeURIComponent(email)}`);
}

export function adminSearchIp(ip) {
  return botFetch(`/api/discord/admin/user/search-ip?ip=${encodeURIComponent(ip)}`);
}

export function adminCheckAlt(query) {
  return botFetch(`/api/discord/admin/user/check-alt?query=${encodeURIComponent(query)}`);
}

export function adminDeleteUser(query) {
  return botFetch("/api/discord/admin/user/delete", { method: "POST", body: JSON.stringify({ query }) });
}

export function adminExportUser(query) {
  return botFetch(`/api/discord/admin/user/export?query=${encodeURIComponent(query)}`);
}

export function adminResetRate(query) {
  return botFetch("/api/discord/admin/user/reset-rate", { method: "POST", body: JSON.stringify({ query }) });
}

// --- Admin: system -----------------------------------------------------------

export function adminDbHealth() {
  return botFetch("/api/discord/admin/system/db-health");
}

export function adminGetMaintenance() {
  return botFetch("/api/discord/admin/system/maintenance");
}

export function adminSetMaintenance(enabled, message) {
  return botFetch("/api/discord/admin/system/maintenance", {
    method: "POST",
    body: JSON.stringify({ enabled, message }),
  });
}
