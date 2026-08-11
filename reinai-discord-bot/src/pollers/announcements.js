import { EmbedBuilder, ChannelType } from "discord.js";
import { config } from "../config.js";
import { fetchPendingAnnouncements, markAnnouncementPosted } from "../api.js";

// Relays announcements posted in reinai-admin (the "お知らせ" page) into the
// configured Discord channel. Polling rather than a webhook push keeps the
// bot the only thing that needs a public-network-reachable... nothing —
// it only ever makes outbound requests, so it can run anywhere.
export function startAnnouncementPoller(client) {
  async function tick() {
    try {
      const { announcements } = await fetchPendingAnnouncements();
      if (announcements.length === 0) return;

      const channel = await client.channels.fetch(config.announcementChannelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        console.error("[announcements] configured channel is not a text channel");
        return;
      }

      for (const a of announcements) {
        const embed = new EmbedBuilder()
          .setTitle("📢 ReinAIからのお知らせ")
          .setDescription(a.message)
          .setColor(0x4f46e5)
          .setTimestamp(new Date(a.createdAt));

        await channel.send({ embeds: [embed] });
        await markAnnouncementPosted(a.id);
        console.log(`[announcements] posted announcement ${a.id}`);
      }
    } catch (err) {
      console.error("[announcements] poll failed:", err.message);
    }
  }

  tick();
  setInterval(tick, config.pollIntervalMs);
}
