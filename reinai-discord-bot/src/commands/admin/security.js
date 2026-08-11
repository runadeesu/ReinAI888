import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { requireAdmin } from "../../adminGuard.js";
import { listRecords } from "../../store.js";
import { parseDuration } from "../../durations.js";

function toCsv(rows) {
  if (rows.length === 0) return "no records";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("audit-export")
      .setDescription("管理コマンドの実行ログをCSVでエクスポート")
      .addStringOption((o) => o.setName("期間").setDescription("例: 24h, 7d — 未指定なら全期間").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const periodStr = interaction.options.getString("期間");
      const all = await listRecords("admin-audit-log");

      const filtered = periodStr
        ? (() => {
            const ms = parseDuration(periodStr);
            if (!ms) return null;
            const since = Date.now() - ms;
            return all.filter((r) => new Date(r.createdAt).getTime() >= since);
          })()
        : all;

      if (filtered === null) return interaction.editReply("期間の形式が正しくありません(例: 24h, 7d)。");
      if (filtered.length === 0) return interaction.editReply("該当する記録がありません。");

      const csv = toCsv(filtered.map((r) => ({ createdAt: r.createdAt, command: r.command, moderator: r.moderatorUsername, options: r.optionsSummary })));
      const file = new AttachmentBuilder(Buffer.from(csv, "utf8"), { name: "admin-audit-log.csv" });
      await interaction.editReply({ content: `${filtered.length}件をエクスポートしました。`, files: [file] });
    }),
  },
  {
    data: new SlashCommandBuilder().setName("backup-discord").setDescription("サーバーのチャンネル構成・ロール設定をJSONでバックアップ"),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      const [channels, roles] = await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);

      const snapshot = {
        exportedAt: new Date().toISOString(),
        guild: { id: guild.id, name: guild.name },
        roles: [...roles.values()].map((r) => ({
          id: r.id,
          name: r.name,
          color: r.hexColor,
          position: r.position,
          permissions: r.permissions.toArray(),
        })),
        channels: [...channels.values()]
          .filter(Boolean)
          .map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            parentId: c.parentId,
            position: c.position,
            permissionOverwrites: [...c.permissionOverwrites.cache.values()].map((o) => ({
              id: o.id,
              type: o.type,
              allow: o.allow.toArray(),
              deny: o.deny.toArray(),
            })),
          })),
      };

      const file = new AttachmentBuilder(Buffer.from(JSON.stringify(snapshot, null, 2), "utf8"), {
        name: `${guild.name}-backup-${new Date().toISOString().slice(0, 10)}.json`,
      });
      await interaction.editReply({ content: "✅ サーバー構成をバックアップしました。", files: [file] });
    }),
  },
];
