// Shared-secret auth for server-to-server calls between ReinAI and
// REINChat (a separate app/deployment with its own Supabase Auth), mirroring
// the X-Bot-Secret pattern already used for the Discord bot integration.
export function checkReinChatSecret(request: Request): boolean {
  const secret = request.headers.get("X-ReinChat-Secret");
  return Boolean(secret) && secret === process.env.REINCHAT_SHARED_SECRET;
}

export function reinChatUrl(): string {
  return (process.env.REINCHAT_URL ?? "https://reinchat.vercel.app").replace(/\/$/, "");
}
