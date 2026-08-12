import { SlashCommandBuilder, ChannelType } from "discord.js";
import { requireAdmin } from "../../adminGuard.js";
import { appendRecord, listRecords, removeRecord } from "../../store.js";
import { fmt, parseDateTime } from "../../dateTime.js";

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("reminder-set")
      .setDescription("指定日時にチャンネルへリマインダーを自動投稿")
      .addStringOption((o) => o.setName("日時").setDescription("例: 2026-08-15 21:00 または 2h(2時間後)").setRequired(true))
      .addStringOption((o) => o.setName("本文").setDescription("リマインダー内容").setRequired(true))
      .addChannelOption((o) => o.setName("チャンネル").setDescription("未指定なら現在のチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addMentionableOption((o) => o.setName("メンション").setDescription("投稿時にメンションする相手(任意)").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const when = parseDateTime(interaction.options.getString("日時"));
      if (!when || when.getTime() < Date.now()) return interaction.editReply("日時が正しくないか、過去の日時です。");
      const body = interaction.options.getString("本文");
      const channel = interaction.options.getChannel("チャンネル") ?? interaction.channel;
      const mentionable = interaction.options.getMentionable("メンション");

      const record = await appendRecord("reminders", {
        channelId: channel.id,
        message: body,
        mentionId: mentionable?.id ?? null,
        dueAt: when.toISOString(),
        posted: false,
      });
      await interaction.editReply(`⏰ ${fmt(when)} に ${channel} へリマインダーを予約しました(ID: \`${record.id.slice(0, 8)}\`)`);
    }),
  },
  {
    data: new SlashCommandBuilder().setName("reminder-list").setDescription("予約中のリマインダー一覧"),
    execute: requireAdmin(async (interaction) => {
      const reminders = (await listRecords("reminders")).filter((r) => !r.posted);
      if (reminders.length === 0) return interaction.reply({ content: "予約中のリマインダーはありません。", ephemeral: true });

      const lines = reminders
        .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
        .map((r) => `\`${r.id.slice(0, 8)}\` <#${r.channelId}> ${fmt(r.dueAt)} — ${r.message.slice(0, 60)}`);
      await interaction.reply({ content: lines.join("\n").slice(0, 1900), ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("reminder-cancel")
      .setDescription("予約中のリマインダーを取り消し")
      .addStringOption((o) => o.setName("id").setDescription("/reminder-list で表示されるID").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const idPrefix = interaction.options.getString("id");
      const reminders = await listRecords("reminders");
      const match = reminders.find((r) => r.id.startsWith(idPrefix) && !r.posted);
      if (!match) return interaction.reply({ content: "該当する予約中のリマインダーが見つかりません。", ephemeral: true });

      await removeRecord("reminders", match.id);
      await interaction.reply({ content: `🗑️ リマインダー \`${idPrefix}\` を取り消しました。`, ephemeral: true });
    }),
  },
];
