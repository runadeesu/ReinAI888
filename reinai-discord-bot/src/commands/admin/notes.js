import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { requireAdmin } from "../../adminGuard.js";
import { appendRecord, listRecords, removeRecord } from "../../store.js";
import { fmt } from "../../dateTime.js";

// Internal-only moderation notes on a member — never DMed or posted
// publicly, purely for admins to leave context for each other (e.g. "warned
// verbally about spam links, watch for repeat").
export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("note-add")
      .setDescription("ユーザーに内部メモを追加(本人には通知されません)")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true))
      .addStringOption((o) => o.setName("メモ").setDescription("内容").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const target = interaction.options.getUser("ユーザー");
      const body = interaction.options.getString("メモ");
      const record = await appendRecord("mod-notes", {
        userId: target.id,
        username: target.tag,
        note: body,
        authorId: interaction.user.id,
        authorUsername: interaction.user.username,
      });
      await interaction.reply({ content: `📝 ${target.tag} にメモを追加しました(ID: \`${record.id.slice(0, 8)}\`)`, ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("note-list")
      .setDescription("ユーザーの内部メモ一覧を表示")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const target = interaction.options.getUser("ユーザー");
      const notes = (await listRecords("mod-notes")).filter((n) => n.userId === target.id);
      if (notes.length === 0) return interaction.reply({ content: `${target.tag} にメモはありません。`, ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`📝 ${target.tag} の内部メモ (${notes.length}件)`)
        .setColor(0x64748b)
        .setDescription(
          notes
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((n) => `\`${n.id.slice(0, 8)}\` [${fmt(n.createdAt)}] ${n.authorUsername}: ${n.note}`)
            .join("\n")
            .slice(0, 3900)
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("note-delete")
      .setDescription("内部メモを削除")
      .addStringOption((o) => o.setName("id").setDescription("/note-list で表示されるID").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const idPrefix = interaction.options.getString("id");
      const notes = await listRecords("mod-notes");
      const match = notes.find((n) => n.id.startsWith(idPrefix));
      if (!match) return interaction.reply({ content: "該当するメモが見つかりません。", ephemeral: true });

      await removeRecord("mod-notes", match.id);
      await interaction.reply({ content: `🗑️ メモ \`${idPrefix}\` を削除しました。`, ephemeral: true });
    }),
  },
];
