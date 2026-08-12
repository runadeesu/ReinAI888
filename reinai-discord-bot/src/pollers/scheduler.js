import { EmbedBuilder } from "discord.js";
import { config } from "../config.js";
import { listRecords, updateCollection } from "../store.js";

const SCHEDULER_INTERVAL_MS = 60_000;

// Handles time-based bot-local admin actions that don't have a ReinAI-side
// counterpart: expiring /temp-ban and firing /announce-schedule posts.
export function startSchedulerPoller(client) {
  async function tick() {
    await processTempBans(client).catch((err) => console.error("[scheduler] temp-ban check failed:", err.message));
    await processScheduledAnnouncements(client).catch((err) => console.error("[scheduler] scheduled announcement check failed:", err.message));
    await processReminders(client).catch((err) => console.error("[scheduler] reminder check failed:", err.message));
  }

  tick();
  setInterval(tick, SCHEDULER_INTERVAL_MS);
}

async function processTempBans(client) {
  const bans = await listRecords("tempbans");
  const due = bans.filter((b) => !b.lifted && new Date(b.unbanAt).getTime() <= Date.now());
  if (due.length === 0) return;

  const guild = await client.guilds.fetch(config.guildId);
  for (const ban of due) {
    try {
      await guild.members.unban(ban.userId, "時限BAN期間満了");
      console.log(`[scheduler] auto-unbanned ${ban.username}`);
    } catch (err) {
      console.error(`[scheduler] failed to auto-unban ${ban.userId}:`, err.message);
    }
  }

  await updateCollection("tempbans", (list) =>
    list.map((b) => (due.some((d) => d.id === b.id) ? { ...b, lifted: true } : b))
  );
}

async function processScheduledAnnouncements(client) {
  const scheduled = await listRecords("scheduled-announcements");
  const due = scheduled.filter((s) => !s.posted && new Date(s.dueAt).getTime() <= Date.now());
  if (due.length === 0) return;

  for (const item of due) {
    try {
      const channel = await client.channels.fetch(item.channelId);
      const embed = new EmbedBuilder().setDescription(item.message).setColor(0x4f46e5).setTimestamp(new Date());
      await channel.send({ embeds: [embed] });
      console.log(`[scheduler] posted scheduled announcement ${item.id}`);
    } catch (err) {
      console.error(`[scheduler] failed to post scheduled announcement ${item.id}:`, err.message);
    }
  }

  await updateCollection("scheduled-announcements", (list) =>
    list.map((s) => (due.some((d) => d.id === s.id) ? { ...s, posted: true } : s))
  );
}

async function processReminders(client) {
  const reminders = await listRecords("reminders");
  const due = reminders.filter((r) => !r.posted && new Date(r.dueAt).getTime() <= Date.now());
  if (due.length === 0) return;

  for (const item of due) {
    try {
      const channel = await client.channels.fetch(item.channelId);
      const mention = item.mentionId ? `<@${item.mentionId}> ` : "";
      const embed = new EmbedBuilder().setTitle("⏰ リマインダー").setDescription(item.message).setColor(0x1e90ff).setTimestamp(new Date());
      await channel.send({ content: mention || undefined, embeds: [embed] });
      console.log(`[scheduler] posted reminder ${item.id}`);
    } catch (err) {
      console.error(`[scheduler] failed to post reminder ${item.id}:`, err.message);
    }
  }

  await updateCollection("reminders", (list) =>
    list.map((r) => (due.some((d) => d.id === r.id) ? { ...r, posted: true } : r))
  );
}
