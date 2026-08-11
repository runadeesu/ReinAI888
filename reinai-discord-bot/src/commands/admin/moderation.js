import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, AutoModerationRuleTriggerType, AutoModerationActionType, GuildVerificationLevel } from "discord.js";
import { requireAdmin } from "../../adminGuard.js";
import { parseDuration } from "../../durations.js";
import { appendRecord, listRecords } from "../../store.js";
import { stashPendingAction } from "../../pendingActions.js";

function fmt(date) {
  return new Date(date).toLocaleString("ja-JP");
}

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("lockdown-channel")
      .setDescription("チャンネルの書き込み権限を一時的にロック")
      .addChannelOption((o) => o.setName("チャンネル").setDescription("未指定なら現在のチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      const channel = interaction.options.getChannel("チャンネル") ?? interaction.channel;
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      await interaction.reply(`🔒 ${channel} をロックしました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("unlock-channel")
      .setDescription("チャンネルのロックダウンを解除")
      .addChannelOption((o) => o.setName("チャンネル").setDescription("未指定なら現在のチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      const channel = interaction.options.getChannel("チャンネル") ?? interaction.channel;
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      await interaction.reply(`🔓 ${channel} のロックを解除しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder().setName("purge-bot-messages").setDescription("このチャンネルのBot発言を一括削除(直近100件から)"),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter((m) => m.author.bot);
      const deleted = await interaction.channel.bulkDelete(botMessages, true);
      await interaction.editReply(`🧹 Bot発言 ${deleted.size}件を削除しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("purge-user")
      .setDescription("特定ユーザーの発言を一括削除(直近100件から)")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true))
      .addIntegerOption((o) => o.setName("件数").setDescription("削除する最大件数(既定10)").setMinValue(1).setMaxValue(100).setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const target = interaction.options.getUser("ユーザー");
      const limit = interaction.options.getInteger("件数") ?? 10;
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const targetMessages = messages.filter((m) => m.author.id === target.id).first(limit);
      const deleted = await interaction.channel.bulkDelete(targetMessages, true);
      await interaction.editReply(`🧹 ${target.username} の発言 ${deleted.size}件を削除しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("slowmode-set")
      .setDescription("チャンネルの低速モード秒数を設定(0で解除)")
      .addIntegerOption((o) => o.setName("秒数").setDescription("0〜21600").setMinValue(0).setMaxValue(21600).setRequired(true))
      .addChannelOption((o) => o.setName("チャンネル").setDescription("未指定なら現在のチャンネル").addChannelTypes(ChannelType.GuildText).setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      const seconds = interaction.options.getInteger("秒数");
      const channel = interaction.options.getChannel("チャンネル") ?? interaction.channel;
      await channel.setRateLimitPerUser(seconds);
      await interaction.reply(seconds === 0 ? `${channel} の低速モードを解除しました。` : `${channel} の低速モードを${seconds}秒に設定しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("automod-add-rule")
      .setDescription("AutoModにNGワード/フレーズを追加してメッセージをブロック")
      .addStringOption((o) => o.setName("パターン").setDescription("ブロックする単語やフレーズ(カンマ区切りで複数可)").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const keywords = interaction.options.getString("パターン").split(",").map((s) => s.trim()).filter(Boolean);
      const rule = await interaction.guild.autoModerationRules.create({
        name: `ReinAI管理bot登録ルール ${new Date().toISOString().slice(0, 10)}`,
        eventType: 1,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: { keywordFilter: keywords },
        actions: [{ type: AutoModerationActionType.BlockMessage }],
        enabled: true,
      });
      await interaction.editReply(`🛡️ AutoModルールを追加しました(ID: ${rule.id})。対象ワード: ${keywords.join(", ")}`);
    }),
  },
  {
    data: new SlashCommandBuilder().setName("anti-raid-enable").setDescription("参加者認証レベルを引き上げて荒らし対策を有効化"),
    execute: requireAdmin(async (interaction) => {
      await interaction.guild.setVerificationLevel(GuildVerificationLevel.High, "Anti-raid mode enabled via /anti-raid-enable");
      await interaction.reply("🛡️ サーバーの認証レベルを引き上げました(荒らし対策モード有効)。`/anti-raid-disable` で元に戻せます。");
    }),
  },
  {
    data: new SlashCommandBuilder().setName("anti-raid-disable").setDescription("荒らし対策モードを解除して認証レベルを戻す"),
    execute: requireAdmin(async (interaction) => {
      await interaction.guild.setVerificationLevel(GuildVerificationLevel.Medium, "Anti-raid mode disabled via /anti-raid-disable");
      await interaction.reply("サーバーの認証レベルを通常(Medium)に戻しました。");
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("warn")
      .setDescription("ユーザーに公式警告を送る(内部ログに記録)")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true))
      .addStringOption((o) => o.setName("理由").setDescription("警告理由").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const target = interaction.options.getUser("ユーザー");
      const reason = interaction.options.getString("理由");
      await appendRecord("warnings", {
        userId: target.id,
        username: target.username,
        reason,
        moderatorId: interaction.user.id,
        moderatorUsername: interaction.user.username,
      });
      const dmSent = await target
        .send(`${interaction.guild.name} より公式警告が送られました。\n理由: ${reason}`)
        .then(() => true)
        .catch(() => false);
      await interaction.editReply(`⚠️ ${target.username} に警告を記録しました。${dmSent ? "(DM通知済み)" : "(DM送信できませんでした)"}`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("warnings-check")
      .setDescription("ユーザーの過去の警告履歴を確認")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const target = interaction.options.getUser("ユーザー");
      const all = await listRecords("warnings");
      const mine = all.filter((w) => w.userId === target.id);
      if (mine.length === 0) return interaction.editReply(`${target.username} の警告履歴はありません。`);
      const lines = mine.map((w) => `・${fmt(w.createdAt)} — ${w.reason}(by ${w.moderatorUsername})`);
      await interaction.editReply(`**${target.username}** の警告(${mine.length}件):\n${lines.join("\n")}`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("temp-ban")
      .setDescription("期間を指定して時限BAN")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true))
      .addStringOption((o) => o.setName("期間").setDescription("例: 10m, 2h, 3d, 1w").setRequired(true))
      .addStringOption((o) => o.setName("理由").setDescription("BAN理由").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const target = interaction.options.getUser("ユーザー");
      const durationStr = interaction.options.getString("期間");
      const reason = interaction.options.getString("理由") ?? "理由未記載";
      const ms = parseDuration(durationStr);
      if (!ms) return interaction.editReply("期間の形式が正しくありません(例: 10m, 2h, 3d, 1w)。");

      await interaction.guild.members.ban(target.id, { reason });
      await appendRecord("tempbans", {
        userId: target.id,
        username: target.username,
        reason,
        moderatorUsername: interaction.user.username,
        unbanAt: new Date(Date.now() + ms).toISOString(),
      });
      await interaction.editReply(`🔨 ${target.username} を${durationStr}の時限BANにしました。理由: ${reason}`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("mute")
      .setDescription("ユーザーを一時的にタイムアウト(発言・VC禁止)")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true))
      .addStringOption((o) => o.setName("期間").setDescription("例: 10m, 2h, 3d(最大28日)").setRequired(true))
      .addStringOption((o) => o.setName("理由").setDescription("理由").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const target = interaction.options.getUser("ユーザー");
      const durationStr = interaction.options.getString("期間");
      const reason = interaction.options.getString("理由") ?? undefined;
      const ms = parseDuration(durationStr);
      if (!ms) return interaction.editReply("期間の形式が正しくありません(例: 10m, 2h, 3d)。");

      const member = await interaction.guild.members.fetch(target.id);
      await member.timeout(Math.min(ms, 28 * 86_400_000), reason);
      await interaction.editReply(`🔇 ${target.username} を${durationStr}ミュートしました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("unmute")
      .setDescription("ミュートを解除")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const target = interaction.options.getUser("ユーザー");
      const member = await interaction.guild.members.fetch(target.id);
      await member.timeout(null);
      await interaction.editReply(`🔊 ${target.username} のミュートを解除しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("mod-log-search")
      .setDescription("過去の警告・BAN履歴をキーワードで検索")
      .addStringOption((o) => o.setName("キーワード").setDescription("ユーザー名や理由に含まれる文字列").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const keyword = interaction.options.getString("キーワード").toLowerCase();
      const [warnings, tempbans] = await Promise.all([listRecords("warnings"), listRecords("tempbans")]);
      const hits = [
        ...warnings.map((w) => `⚠️ ${fmt(w.createdAt)} ${w.username}: ${w.reason}`),
        ...tempbans.map((b) => `🔨 ${fmt(b.createdAt)} ${b.username}: ${b.reason}`),
      ].filter((line) => line.toLowerCase().includes(keyword));

      if (hits.length === 0) return interaction.editReply("該当する記録が見つかりません。");
      await interaction.editReply(`${hits.length}件見つかりました:\n${hits.slice(0, 20).join("\n")}`);
    }),
  },
  {
    data: new SlashCommandBuilder().setName("clean-spammers").setDescription("直近24時間に参加した無ロールの疑わしいアカウントを一覧表示(確認後にキック)"),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const members = await interaction.guild.members.fetch();
      const dayAgo = Date.now() - 86_400_000;
      const candidates = members.filter((m) => !m.user.bot && m.roles.cache.size <= 1 && m.joinedTimestamp && m.joinedTimestamp > dayAgo);

      if (candidates.size === 0) return interaction.editReply("該当する疑わしいアカウントは見つかりませんでした。");

      const list = [...candidates.values()].slice(0, 25);
      const token = stashPendingAction({ type: "clean-spammers", userIds: list.map((m) => m.id) });
      await interaction.editReply({
        content:
          `直近24時間に参加し、ロールが付与されていないアカウントが${candidates.size}件見つかりました(最大25件表示)。\n` +
          list.map((m) => `・${m.user.username}(参加: ${fmt(m.joinedAt)})`).join("\n") +
          "\n\n**内容を確認のうえ、キックする場合のみボタンを押してください。**",
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 4, custom_id: `confirm-action:${token}`, label: `表示された${list.length}件をキック` },
              { type: 2, style: 2, custom_id: "cancel-action", label: "キャンセル" },
            ],
          },
        ],
      });
    }),
  },
];
