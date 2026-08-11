import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { requireAdmin } from "../../adminGuard.js";
import { stashPendingAction } from "../../pendingActions.js";
import {
  adminGetUser,
  adminBanUser,
  adminUnbanUser,
  adminGetSessions,
  adminKillSessions,
  adminGetAuditLog,
  adminSearchEmail,
  adminSearchIp,
  adminCheckAlt,
  adminDeleteUser,
  adminExportUser,
  adminResetRate,
} from "../../api.js";

const targetOption = (builder) =>
  builder.addStringOption((o) => o.setName("対象").setDescription("メール・アカウントID・DiscordIDのいずれか").setRequired(true));

function fmt(date) {
  return new Date(date).toLocaleString("ja-JP");
}

export const commands = [
  {
    data: targetOption(new SlashCommandBuilder().setName("user-info").setDescription("ユーザーの登録情報・利用状況を表示")),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const query = interaction.options.getString("対象");
      const r = await adminGetUser(query);
      if (r.error) return interaction.editReply(`取得失敗: ${r.error}`);

      const embed = new EmbedBuilder()
        .setTitle(r.email)
        .setColor(r.isSuspended ? 0xdc2626 : 0x4f46e5)
        .addFields(
          { name: "アカウントID", value: r.displayId, inline: true },
          { name: "登録日", value: fmt(r.createdAt), inline: true },
          { name: "状態", value: r.isSuspended ? "🚫 BAN中" : "✅ 有効", inline: true },
          { name: "メール確認", value: r.emailVerified ? "済" : "未", inline: true },
          { name: "2段階認証", value: r.twoFactorEnabled ? "有効" : "無効", inline: true },
          { name: "Discord", value: r.discordUsername ? `@${r.discordUsername}` : "未連携", inline: true },
          { name: "会話数", value: String(r.conversationCount), inline: true },
          { name: "メッセージ数", value: String(r.messageCount), inline: true },
          { name: "総トークン数", value: r.totalTokens.toLocaleString(), inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    }),
  },

  {
    data: targetOption(new SlashCommandBuilder().setName("user-ban-app").setDescription("Webアプリ側でユーザーをBAN(ログイン不可・全セッション終了)"))
      .addStringOption((o) => o.setName("理由").setDescription("BAN理由(監査ログに記録)").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const query = interaction.options.getString("対象");
      const reason = interaction.options.getString("理由") ?? "理由未記載";
      const r = await adminBanUser(query);
      if (r.error) return interaction.editReply(`BAN失敗: ${r.error}`);
      await interaction.editReply(`🚫 ${r.email} をBANしました(理由: ${reason})。全セッションを終了しました。`);
    }),
  },

  {
    data: targetOption(new SlashCommandBuilder().setName("user-unban-app").setDescription("WebアプリのBANを解除")),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminUnbanUser(interaction.options.getString("対象"));
      if (r.error) return interaction.editReply(`解除失敗: ${r.error}`);
      await interaction.editReply(`✅ ${r.email} のBANを解除しました。`);
    }),
  },

  {
    data: targetOption(new SlashCommandBuilder().setName("user-sessions").setDescription("ユーザーのアクティブなログインセッション一覧")),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminGetSessions(interaction.options.getString("対象"));
      if (r.error) return interaction.editReply(`取得失敗: ${r.error}`);
      if (r.sessions.length === 0) return interaction.editReply(`${r.email} にアクティブなセッションはありません。`);
      const lines = r.sessions.map((s) => `・${s.ipAddress ?? "不明IP"} / ${(s.userAgent ?? "").slice(0, 40)} / 最終アクセス ${fmt(s.lastSeenAt)}`);
      await interaction.editReply(`**${r.email}** のセッション(${r.sessions.length}件):\n${lines.join("\n")}`);
    }),
  },

  {
    data: targetOption(new SlashCommandBuilder().setName("user-kill-sessions").setDescription("ユーザーを全デバイスから強制ログアウト")),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminKillSessions(interaction.options.getString("対象"));
      if (r.error) return interaction.editReply(`失敗: ${r.error}`);
      await interaction.editReply(`🔒 ${r.email} を全${r.revoked}セッションから強制ログアウトしました。`);
    }),
  },

  {
    data: targetOption(new SlashCommandBuilder().setName("user-audit-log").setDescription("ユーザーのログイン履歴を表示")),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminGetAuditLog(interaction.options.getString("対象"));
      if (r.error) return interaction.editReply(`取得失敗: ${r.error}`);
      if (r.history.length === 0) return interaction.editReply(`${r.email} のログイン履歴はありません。`);
      const lines = r.history.map((h) => `・${h.success ? "✅" : "❌"} ${h.method} / ${h.ipAddress ?? "不明"} / ${fmt(h.createdAt)}`);
      await interaction.editReply(`**${r.email}** のログイン履歴(最新${r.history.length}件):\n${lines.join("\n")}`);
    }),
  },

  {
    data: new SlashCommandBuilder()
      .setName("user-search-email")
      .setDescription("メールアドレスからユーザーを検索")
      .addStringOption((o) => o.setName("メール").setDescription("完全一致でなくても部分一致で検索できます").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminSearchEmail(interaction.options.getString("メール"));
      if (r.error) return interaction.editReply(`検索失敗: ${r.error}`);
      if (r.users.length === 0) return interaction.editReply("該当ユーザーが見つかりません。");
      const lines = r.users.map(
        (u) => `・${u.email}(${u.displayId})${u.isSuspended ? " 🚫BAN中" : ""}${u.discordLink ? ` — Discord: @${u.discordLink.discordUsername}` : ""}`
      );
      await interaction.editReply(`${r.users.length}件見つかりました:\n${lines.join("\n")}`);
    }),
  },

  {
    data: new SlashCommandBuilder()
      .setName("user-search-ip")
      .setDescription("IPアドレスに関連付けられたアカウント一覧を調査")
      .addStringOption((o) => o.setName("ip").setDescription("IPアドレス").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminSearchIp(interaction.options.getString("ip"));
      if (r.error) return interaction.editReply(`検索失敗: ${r.error}`);
      if (r.users.length === 0) return interaction.editReply("該当ユーザーが見つかりません。");
      const lines = r.users.map((u) => `・${u.email}(${u.displayId})${u.isSuspended ? " 🚫BAN中" : ""}`);
      await interaction.editReply(`このIPに関連する${r.users.length}件のアカウント:\n${lines.join("\n")}`);
    }),
  },

  {
    data: targetOption(
      new SlashCommandBuilder().setName("check-alt").setDescription("同一IPを使う他アカウントがないか調査(あくまで参考情報)")
    ),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminCheckAlt(interaction.options.getString("対象"));
      if (r.error) return interaction.editReply(`調査失敗: ${r.error}`);
      if (r.matches.length === 0) return interaction.editReply(`${r.email}: 同一IPを共有する他アカウントは見つかりませんでした。`);
      const lines = r.matches.map((u) => `・${u.email}(${u.displayId})${u.isSuspended ? " 🚫BAN中" : ""}`);
      await interaction.editReply(
        `⚠️ ${r.email} と同一IP(${r.ips.length}件)を共有する他アカウント ${r.matches.length}件:\n${lines.join("\n")}\n\n` +
          `※ 家族利用・モバイル回線・VPN等でも同一IPになりえます。断定材料ではなく調査の参考情報としてお使いください。`
      );
    }),
  },

  {
    data: targetOption(
      new SlashCommandBuilder().setName("user-delete-account").setDescription("アカウントデータを完全削除(取り消し不可)")
    ),
    execute: requireAdmin(async (interaction) => {
      const query = interaction.options.getString("対象");
      const token = stashPendingAction({ type: "delete-user", query });
      await interaction.reply({
        content: `⚠️ **${query}** のアカウントを完全に削除します。会話・メッセージ・設定すべてが失われ、取り消せません。本当に実行しますか?`,
        ephemeral: true,
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 4, custom_id: `confirm-action:${token}`, label: "完全に削除する" },
              { type: 2, style: 2, custom_id: "cancel-action", label: "キャンセル" },
            ],
          },
        ],
      });
    }),
  },

  {
    data: targetOption(new SlashCommandBuilder().setName("user-export-data").setDescription("ユーザーデータをJSON形式でエクスポート(サポート/開示請求対応)")),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminExportUser(interaction.options.getString("対象"));
      if (r.error) return interaction.editReply(`エクスポート失敗: ${r.error}`);
      const buffer = Buffer.from(JSON.stringify(r, null, 2), "utf8");
      const file = new AttachmentBuilder(buffer, { name: `${r.profile.displayId}-export.json` });
      await interaction.editReply({ content: `${r.profile.email} のデータをエクスポートしました。`, files: [file] });
    }),
  },

  {
    data: targetOption(new SlashCommandBuilder().setName("user-reset-rate").setDescription("ユーザーのレート制限を即時リセット")),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminResetRate(interaction.options.getString("対象"));
      if (r.error) return interaction.editReply(`失敗: ${r.error}`);
      await interaction.editReply(`✅ ${r.email} のレート制限をリセットしました。\n${r.note}`);
    }),
  },
];
