import { SlashCommandBuilder, EmbedBuilder, ChannelType, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } from "discord.js";
import { requireAdmin } from "../../adminGuard.js";
import { appendRecord, listRecords, removeRecord, updateCollection } from "../../store.js";
import { config } from "../../config.js";

function fmt(date) {
  return new Date(date).toLocaleString("ja-JP");
}

function parseDateTime(input) {
  // Accepts "YYYY-MM-DD HH:MM" (interpreted in server-local time) or a
  // relative shorthand like "2h" / "30m" / "3d" from now.
  const relative = /^(\d+)(m|h|d)$/i.exec(input.trim());
  if (relative) {
    const mult = { m: 60_000, h: 3_600_000, d: 86_400_000 }[relative[2].toLowerCase()];
    return new Date(Date.now() + Number(relative[1]) * mult);
  }
  const date = new Date(input.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("announce-embed")
      .setDescription("リッチなEmbedお知らせを作成・投稿")
      .addStringOption((o) => o.setName("タイトル").setDescription("見出し").setRequired(true))
      .addStringOption((o) => o.setName("本文").setDescription("お知らせ内容").setRequired(true))
      .addChannelOption((o) => o.setName("チャンネル").setDescription("未指定ならお知らせチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addStringOption((o) => o.setName("色").setDescription("16進数カラーコード(例: #4f46e5)").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const title = interaction.options.getString("タイトル");
      const body = interaction.options.getString("本文");
      const colorInput = interaction.options.getString("色");
      const channel = interaction.options.getChannel("チャンネル") ?? (await interaction.client.channels.fetch(config.announcementChannelId));

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(body)
        .setColor(colorInput ? parseInt(colorInput.replace("#", ""), 16) : 0x4f46e5)
        .setTimestamp(new Date());

      await channel.send({ embeds: [embed] });
      await interaction.editReply(`✅ ${channel} に投稿しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("announce-schedule")
      .setDescription("お知らせの予約投稿をセット")
      .addStringOption((o) => o.setName("日時").setDescription("例: 2026-08-15 21:00 または 2h(2時間後)").setRequired(true))
      .addStringOption((o) => o.setName("本文").setDescription("投稿内容").setRequired(true))
      .addChannelOption((o) => o.setName("チャンネル").setDescription("未指定ならお知らせチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const when = parseDateTime(interaction.options.getString("日時"));
      if (!when || when.getTime() < Date.now()) return interaction.editReply("日時が正しくないか、過去の日時です。");
      const body = interaction.options.getString("本文");
      const channel = interaction.options.getChannel("チャンネル") ?? (await interaction.client.channels.fetch(config.announcementChannelId));

      await appendRecord("scheduled-announcements", {
        channelId: channel.id,
        message: body,
        dueAt: when.toISOString(),
        posted: false,
      });
      await interaction.editReply(`🗓️ ${fmt(when)} に ${channel} へ投稿予約しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("roadmap-sync")
      .setDescription("指定チャンネルのロードマップEmbedを最新内容に更新(このコマンドで作った投稿を上書きします)")
      .addChannelOption((o) => o.setName("チャンネル").setDescription("ロードマップを表示するチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName("内容").setDescription("ロードマップの本文(Markdown可)").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel("チャンネル");
      const content = interaction.options.getString("内容");
      const embed = new EmbedBuilder().setTitle("🗺️ ReinAI ロードマップ").setDescription(content).setColor(0x8b5cf6).setTimestamp(new Date());

      const tracked = await listRecords("roadmap-messages");
      const existing = tracked.find((t) => t.channelId === channel.id);

      if (existing) {
        try {
          const message = await channel.messages.fetch(existing.messageId);
          await message.edit({ embeds: [embed] });
          await interaction.editReply(`✅ ${channel} のロードマップを更新しました。`);
          return;
        } catch {
          // Original message was deleted — fall through and post a new one.
        }
      }

      const sent = await channel.send({ embeds: [embed] });
      await sent.pin().catch(() => {});
      await updateCollection("roadmap-messages", (list) => [
        ...list.filter((t) => t.channelId !== channel.id),
        { channelId: channel.id, messageId: sent.id },
      ]);
      await interaction.editReply(`✅ ${channel} にロードマップを投稿・ピン留めしました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("faq-add")
      .setDescription("FAQに質問と回答を追加")
      .addStringOption((o) => o.setName("質問").setDescription("よくある質問").setRequired(true))
      .addStringOption((o) => o.setName("回答").setDescription("回答内容").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const question = interaction.options.getString("質問");
      const answer = interaction.options.getString("回答");
      const record = await appendRecord("faqs", { question, answer });
      await interaction.reply({ content: `✅ FAQを追加しました(ID: \`${record.id.slice(0, 8)}\`)`, ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder().setName("faq-list").setDescription("登録済みFAQの一覧を表示(削除用のIDも表示)"),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const faqs = await listRecords("faqs");
      if (faqs.length === 0) return interaction.editReply("FAQはまだ登録されていません。");
      const lines = faqs.map((f) => `\`${f.id.slice(0, 8)}\` **Q. ${f.question}**\nA. ${f.answer}`);
      await interaction.editReply(lines.join("\n\n").slice(0, 1900));
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("faq-delete")
      .setDescription("FAQを削除")
      .addStringOption((o) => o.setName("id").setDescription("/faq-list で表示されるID(先頭8文字でOK)").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const idPrefix = interaction.options.getString("id");
      const faqs = await listRecords("faqs");
      const match = faqs.find((f) => f.id.startsWith(idPrefix));
      if (!match) return interaction.reply({ content: "該当するFAQが見つかりません。", ephemeral: true });
      await removeRecord("faqs", match.id);
      await interaction.reply({ content: `🗑️ 「${match.question}」を削除しました。`, ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("event-create")
      .setDescription("コミュニティイベントを作成(Discordのイベント機能を使用)")
      .addStringOption((o) => o.setName("名前").setDescription("イベント名").setRequired(true))
      .addStringOption((o) => o.setName("開始日時").setDescription("例: 2026-08-20 21:00").setRequired(true))
      .addStringOption((o) => o.setName("場所").setDescription("例: コミュニティ配信、Discordボイスチャンネルなど").setRequired(true))
      .addStringOption((o) => o.setName("説明").setDescription("イベントの説明").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const name = interaction.options.getString("名前");
      const start = parseDateTime(interaction.options.getString("開始日時"));
      if (!start || start.getTime() < Date.now()) return interaction.editReply("開始日時が正しくないか、過去の日時です。");
      const location = interaction.options.getString("場所");
      const description = interaction.options.getString("説明") ?? undefined;

      const event = await interaction.guild.scheduledEvents.create({
        name,
        scheduledStartTime: start,
        scheduledEndTime: new Date(start.getTime() + 2 * 3_600_000),
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType: GuildScheduledEventEntityType.External,
        entityMetadata: { location },
        description,
      });
      await interaction.editReply(`🎉 イベント「${name}」を作成しました: ${event.url}`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("contest-start")
      .setDescription("プロンプトコンテスト等のお題を投稿し、絵文字投票を開始")
      .addStringOption((o) => o.setName("お題").setDescription("コンテストのお題").setRequired(true))
      .addChannelOption((o) => o.setName("チャンネル").setDescription("未指定なら現在のチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const topic = interaction.options.getString("お題");
      const channel = interaction.options.getChannel("チャンネル") ?? interaction.channel;

      const embed = new EmbedBuilder()
        .setTitle("🏆 コンテスト開催中!")
        .setDescription(`${topic}\n\nこのメッセージへの返信で応募し、良いと思った投稿にリアクションで投票してください!`)
        .setColor(0xf59e0b)
        .setTimestamp(new Date());
      const sent = await channel.send({ embeds: [embed] });

      await appendRecord("contests", { topic, channelId: channel.id, messageId: sent.id });
      await interaction.editReply(`✅ コンテストを開始しました: ${sent.url}\n集計する際は \`/contest-tally メッセージID\` を使ってください。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("contest-tally")
      .setDescription("指定メッセージの絵文字リアクション投票を集計")
      .addStringOption((o) => o.setName("メッセージid").setDescription("集計対象メッセージのID").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const messageId = interaction.options.getString("メッセージid");
      let message;
      try {
        message = await interaction.channel.messages.fetch(messageId);
      } catch {
        return interaction.editReply("そのメッセージIDはこのチャンネルで見つかりませんでした。");
      }

      if (message.reactions.cache.size === 0) return interaction.editReply("このメッセージにリアクションはありません。");
      const tally = [...message.reactions.cache.values()]
        .map((r) => `${r.emoji} — ${r.count}票`)
        .sort((a, b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\d+/)[0]));
      await interaction.editReply(`**集計結果**\n${tally.join("\n")}`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("patchnotes-post")
      .setDescription("アップデート情報を公式フォーマットでお知らせチャンネルへ送信")
      .addStringOption((o) => o.setName("バージョン").setDescription("例: v1.5.6").setRequired(true))
      .addStringOption((o) => o.setName("内容").setDescription("変更内容(改行可)").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const version = interaction.options.getString("バージョン");
      const content = interaction.options.getString("内容");
      const channel = await interaction.client.channels.fetch(config.announcementChannelId);

      const embed = new EmbedBuilder()
        .setTitle(`🚀 ReinAI ${version} リリース`)
        .setDescription(content)
        .setColor(0x16a34a)
        .setTimestamp(new Date());
      await channel.send({ embeds: [embed] });
      await interaction.editReply(`✅ ${channel} にパッチノートを投稿しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("pin-manage")
      .setDescription("チャンネルのピン留めメッセージ一覧を表示(Discordの上限は50件)")
      .addChannelOption((o) => o.setName("チャンネル").setDescription("未指定なら現在のチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel("チャンネル") ?? interaction.channel;
      const pins = await channel.messages.fetchPinned();
      if (pins.size === 0) return interaction.editReply(`${channel} にピン留めメッセージはありません。`);

      const sorted = [...pins.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      const lines = sorted.map((m) => `・${m.author.username}: ${m.content.slice(0, 50) || "(添付/Embed)"} — ${m.url}`);
      const warning = pins.size >= 45 ? `\n\n⚠️ ${pins.size}/50件 — 上限に近づいています。古いものから整理を検討してください。` : "";
      await interaction.editReply(`**${channel.name}** のピン留め(${pins.size}件、古い順):\n${lines.join("\n")}${warning}`);
    }),
  },
];
