import { Events, EmbedBuilder, AuditLogEvent } from "discord.js";
import { config } from "../config.js";

const NEW_ACCOUNT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function fmtAccountAge(user) {
  const ageMs = Date.now() - user.createdTimestamp;
  const days = Math.floor(ageMs / 86_400_000);
  return days < 1 ? "24時間以内" : `${days}日前`;
}

// Looks at the most recent matching guild audit log entry to tell a kick or
// ban apart from an ordinary voluntary leave. Audit log entries can lag by
// a second or two, so a short window (last 5s, matching this member) is
// treated as authoritative; anything older/unmatched falls back to "leave".
async function classifyRemoval(guild, member) {
  try {
    const [kicks, bans] = await Promise.all([
      guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 }),
      guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 }),
    ]);

    const recentBan = bans.entries.find((e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < 5000);
    if (recentBan) return { type: "ban", executor: recentBan.executor, reason: recentBan.reason };

    const recentKick = kicks.entries.find((e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < 5000);
    if (recentKick) return { type: "kick", executor: recentKick.executor, reason: recentKick.reason };
  } catch (err) {
    console.error("[member-log] failed to read audit log:", err.message);
  }
  return { type: "leave" };
}

export function registerMemberLog(client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      const channel = await client.channels.fetch(config.joinLogChannelId);
      const isNewAccount = Date.now() - member.user.createdTimestamp < NEW_ACCOUNT_THRESHOLD_MS;

      const embed = new EmbedBuilder()
        .setColor(0x16a34a)
        .setAuthor({ name: `${member.user.tag} が参加しました`, iconURL: member.user.displayAvatarURL() })
        .addFields(
          { name: "アカウント作成", value: fmtAccountAge(member.user), inline: true },
          { name: "現在のメンバー数", value: `${member.guild.memberCount}`, inline: true }
        )
        .setTimestamp(new Date());

      if (isNewAccount) {
        embed.addFields({ name: "⚠️ 注意", value: "アカウント作成から7日未満です。荒らし・複垢の可能性に注意してください。" });
      }

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("[member-log] failed to post join log:", err.message);
    }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const channel = await client.channels.fetch(config.joinLogChannelId);
      const info = await classifyRemoval(member.guild, member);

      const titleByType = { ban: "がBANされました", kick: "がキックされました", leave: "が退出しました" };
      const colorByType = { ban: 0xdc2626, kick: 0xf59e0b, leave: 0x64748b };

      const embed = new EmbedBuilder()
        .setColor(colorByType[info.type])
        .setAuthor({ name: `${member.user.tag} ${titleByType[info.type]}`, iconURL: member.user.displayAvatarURL() })
        .addFields({ name: "現在のメンバー数", value: `${member.guild.memberCount}`, inline: true })
        .setTimestamp(new Date());

      if (info.executor) {
        embed.addFields({ name: "実行者", value: `${info.executor.tag}`, inline: true });
      }
      if (info.reason) {
        embed.addFields({ name: "理由", value: info.reason });
      }

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("[member-log] failed to post leave log:", err.message);
    }
  });
}
