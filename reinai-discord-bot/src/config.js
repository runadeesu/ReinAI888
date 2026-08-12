import "dotenv/config";

const REQUIRED = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "DISCORD_VERIFIED_ROLE_ID",
  "DISCORD_ANNOUNCEMENT_CHANNEL_ID",
  "DISCORD_ADMIN_ROLE_ID",
  "DISCORD_JOIN_LOG_CHANNEL_ID",
  "DISCORD_LOG_CHANNEL_ID",
  "REINAI_API_URL",
  "DISCORD_BOT_SECRET",
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[config] Missing required environment variable: ${key}`);
    console.error("See .env.example for the full list.");
    process.exit(1);
  }
}

export const config = {
  botToken: process.env.DISCORD_BOT_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  verifiedRoleId: process.env.DISCORD_VERIFIED_ROLE_ID,
  announcementChannelId: process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID,
  adminRoleId: process.env.DISCORD_ADMIN_ROLE_ID,
  joinLogChannelId: process.env.DISCORD_JOIN_LOG_CHANNEL_ID,
  logChannelId: process.env.DISCORD_LOG_CHANNEL_ID,
  apiUrl: process.env.REINAI_API_URL.replace(/\/$/, ""),
  botSecret: process.env.DISCORD_BOT_SECRET,
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 15000),
};
