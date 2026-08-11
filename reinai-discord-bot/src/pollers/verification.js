import { config } from "../config.js";
import { fetchNewlyLinked, ackLinked } from "../api.js";

// Confirming a link happens on the ReinAI website, not in Discord, so the
// bot has no event to react to — it polls for newly-confirmed links and
// assigns the verified role, then acks so it doesn't reprocess them.
export function startVerificationPoller(client) {
  async function tick() {
    try {
      const result = await fetchNewlyLinked();
      if (result.error) throw new Error(result.error);
      const { links } = result;
      if (links.length === 0) return;

      const guild = await client.guilds.fetch(config.guildId);
      const done = [];

      for (const link of links) {
        try {
          const member = await guild.members.fetch(link.discordId);
          await member.roles.add(config.verifiedRoleId, "ReinAIアカウント連携完了");
          console.log(`[verification] assigned verified role to ${link.discordUsername} (${link.discordId})`);
          done.push(link.discordId);
        } catch (err) {
          console.error(`[verification] failed to assign role to ${link.discordId}:`, err.message);
          // Leave it un-acked so we retry next tick (e.g. member left and
          // rejoined, or a transient Discord API error).
        }
      }

      if (done.length > 0) await ackLinked(done);
    } catch (err) {
      console.error("[verification] poll failed:", err.message);
    }
  }

  tick();
  setInterval(tick, config.pollIntervalMs);
}
