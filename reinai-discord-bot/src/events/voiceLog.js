import { Events, EmbedBuilder } from "discord.js";
import { config } from "../config.js";

export function registerVoiceLog(client) {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (newState.member?.user?.bot) return;
    if (oldState.channelId === newState.channelId) return; // mute/deafen-only change, not a channel move

    try {
      const channel = await client.channels.fetch(config.logChannelId);
      const user = newState.member?.user ?? oldState.member?.user;
      if (!user) return;

      let description;
      let color;
      if (!oldState.channelId && newState.channelId) {
        description = `🎙️ ${user.tag} が **${newState.channel.name}** に参加しました`;
        color = 0x16a34a;
      } else if (oldState.channelId && !newState.channelId) {
        description = `👋 ${user.tag} が **${oldState.channel.name}** から退出しました`;
        color = 0x64748b;
      } else {
        description = `🔀 ${user.tag} が **${oldState.channel.name}** から **${newState.channel.name}** に移動しました`;
        color = 0x4f46e5;
      }

      const embed = new EmbedBuilder().setColor(color).setDescription(description).setTimestamp(new Date());
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("[voice-log] failed to post voice log:", err.message);
    }
  });
}
