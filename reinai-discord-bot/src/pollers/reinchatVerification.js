import { config } from "../config.js";
import { fetchNewlyLinkedReinChat, ackLinkedReinChat } from "../reinchatApi.js";

// Same shape as pollers/verification.js, but for the direct Discord <->
// REINChat link confirmed on REINChat's own site rather than ReinAI's.
// No-op entirely when REINCHAT_URL isn't configured.
export function startReinChatVerificationPoller(client) {
  if (!config.reinchatUrl) return;

  async function tick() {
    try {
      const result = await fetchNewlyLinkedReinChat();
      if (result.error) throw new Error(result.error);
      const { links } = result;
      if (links.length === 0) return;

      const guild = await client.guilds.fetch(config.guildId);
      const done = [];

      for (const link of links) {
        try {
          const member = await guild.members.fetch(link.discordId);
          await member.roles.add(config.verifiedRoleId, "REINChatアカウント連携完了");
          console.log(`[reinchat-verification] assigned verified role to ${link.discordUsername} (${link.discordId})`);
          done.push(link.discordId);
        } catch (err) {
          console.error(`[reinchat-verification] failed to assign role to ${link.discordId}:`, err.message);
        }
      }

      if (done.length > 0) await ackLinkedReinChat(done);
    } catch (err) {
      console.error("[reinchat-verification] poll failed:", err.message);
    }
  }

  tick();
  setInterval(tick, config.pollIntervalMs);
}
