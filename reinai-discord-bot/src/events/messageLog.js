import { Events, EmbedBuilder } from "discord.js";
import { config } from "../config.js";

function truncate(text, max = 1000) {
  if (!text) return "(内容なし/添付ファイルのみ)";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function registerMessageLog(client) {
  client.on(Events.MessageDelete, async (message) => {
    if (message.author?.bot) return;
    try {
      const channel = await client.channels.fetch(config.logChannelId);
      const embed = new EmbedBuilder()
        .setColor(0xdc2626)
        .setAuthor({ name: `メッセージが削除されました (#${message.channel.name ?? "不明"})`, iconURL: message.author?.displayAvatarURL?.() })
        .addFields({ name: "投稿者", value: message.author ? `${message.author.tag}` : "不明(キャッシュ外)", inline: true })
        .setDescription(truncate(message.content))
        .setTimestamp(new Date());
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("[message-log] failed to post delete log:", err.message);
    }
  });

  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // embed/reaction-only update, not a real edit
    try {
      const channel = await client.channels.fetch(config.logChannelId);
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setAuthor({ name: `メッセージが編集されました (#${newMessage.channel.name ?? "不明"})`, iconURL: newMessage.author?.displayAvatarURL?.() })
        .addFields(
          { name: "投稿者", value: newMessage.author ? `${newMessage.author.tag}` : "不明(キャッシュ外)", inline: true },
          { name: "編集前", value: truncate(oldMessage.content) },
          { name: "編集後", value: truncate(newMessage.content) }
        )
        .setURL(newMessage.url)
        .setTimestamp(new Date());
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("[message-log] failed to post edit log:", err.message);
    }
  });
}
