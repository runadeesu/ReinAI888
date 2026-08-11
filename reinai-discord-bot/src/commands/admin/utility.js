import { SlashCommandBuilder } from "discord.js";
import { resolve as dnsResolve } from "node:dns/promises";
import { connect as tlsConnect } from "node:tls";
import { requireAdmin } from "../../adminGuard.js";
import { appendRecord, listRecords } from "../../store.js";
import { stashPendingAction } from "../../pendingActions.js";
import { botStats } from "../../stats.js";
import { adminDbHealth, adminSetMaintenance } from "../../api.js";
import { config } from "../../config.js";

function checkTls(host) {
  return new Promise((resolve) => {
    const socket = tlsConnect({ host, port: 443, servername: host, timeout: 5000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve({ ok: true, validTo: cert.valid_to });
    });
    socket.on("error", (err) => resolve({ ok: false, error: err.message }));
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "timeout" });
    });
  });
}

export const commands = [
  {
    data: new SlashCommandBuilder().setName("bot-stats").setDescription("Botのメモリ使用量・稼働時間・コマンド実行数を表示"),
    execute: requireAdmin(async (interaction) => {
      const mem = process.memoryUsage();
      const uptimeSec = Math.floor((Date.now() - botStats.startedAt) / 1000);
      const h = Math.floor(uptimeSec / 3600);
      const m = Math.floor((uptimeSec % 3600) / 60);
      await interaction.reply({
        content:
          `**Bot稼働状況**\n` +
          `稼働時間: ${h}時間${m}分\n` +
          `メモリ使用量: ${(mem.rss / 1024 / 1024).toFixed(1)} MB\n` +
          `コマンド実行数: ${botStats.commandsExecuted}\n` +
          `Ping: ${interaction.client.ws.ping}ms`,
        ephemeral: true,
      });
    }),
  },
  {
    data: new SlashCommandBuilder().setName("bot-restart").setDescription("Botプロセスを再起動(ホスト側のプロセス管理が自動再起動する設定である必要があります)"),
    execute: requireAdmin(async (interaction) => {
      await interaction.reply({
        content: "🔄 再起動します。pm2/systemd/Dockerなど、プロセスを自動再起動する仕組みで動かしていない場合、そのまま停止したままになります。",
        ephemeral: true,
      });
      setTimeout(() => process.exit(0), 1000);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("custom-command-add")
      .setDescription("誰でも呼び出せる簡易カスタム返信コマンドを追加(/custom 名前 で実行可能に)")
      .addStringOption((o) => o.setName("名前").setDescription("呼び出し名(英数字推奨)").setRequired(true))
      .addStringOption((o) => o.setName("返答").setDescription("返す内容").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const name = interaction.options.getString("名前").trim().toLowerCase();
      const response = interaction.options.getString("返答");
      const all = await listRecords("custom-commands");
      if (all.some((c) => c.name === name)) {
        return interaction.reply({ content: `「${name}」はすでに登録されています。`, ephemeral: true });
      }
      await appendRecord("custom-commands", { name, response });
      await interaction.reply({ content: `✅ \`/custom 名前:${name}\` で呼び出せるようになりました。`, ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("broadcast-dm")
      .setDescription("指定ロールを持つ全員に個別DMを送信(緊急連絡用・要事前同意)")
      .addRoleOption((o) => o.setName("ロール").setDescription("送信対象のロール").setRequired(true))
      .addStringOption((o) => o.setName("本文").setDescription("DM本文").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const role = interaction.options.getRole("ロール");
      const body = interaction.options.getString("本文");
      await interaction.guild.members.fetch();
      const targets = role.members.filter((m) => !m.user.bot);

      if (targets.size === 0) return interaction.editReply("対象ロールを持つメンバーがいません。");

      const token = stashPendingAction({ type: "broadcast-dm", userIds: [...targets.keys()], body });
      await interaction.editReply({
        content: `⚠️ ${role} を持つ${targets.size}人全員に以下のDMを送信します。事前同意のない一斉DMはDiscordの利用規約・ユーザー体験上望ましくない場合があります。本当に送信しますか?\n\n---\n${body}\n---`,
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 4, custom_id: `confirm-action:${token}`, label: `${targets.size}人に送信` },
              { type: 2, style: 2, custom_id: "cancel-action", label: "キャンセル" },
            ],
          },
        ],
      });
    }),
  },
  {
    data: new SlashCommandBuilder().setName("db-health").setDescription("データベースの応答速度を確認"),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminDbHealth();
      if (r.error || r.ok === false) return interaction.editReply(`❌ DB接続エラー: ${r.error}`);
      await interaction.editReply(`✅ DB応答: ${r.latencyMs}ms`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("dns-check")
      .setDescription("ドメインのDNS・SSL証明書の状態を確認")
      .addStringOption((o) => o.setName("ドメイン").setDescription("未指定ならReinAI本体のドメイン").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const domain = interaction.options.getString("ドメイン") ?? new URL(config.apiUrl).hostname;

      const [aRecords, tls] = await Promise.all([
        dnsResolve(domain, "A").catch((err) => ({ error: err.message })),
        checkTls(domain),
      ]);

      const lines = [`**${domain}**`];
      lines.push(Array.isArray(aRecords) ? `Aレコード: ${aRecords.join(", ")}` : `Aレコード取得失敗: ${aRecords.error}`);
      lines.push(tls.ok ? `SSL証明書: 有効(期限 ${tls.validTo})` : `SSL証明書確認失敗: ${tls.error}`);
      await interaction.editReply(lines.join("\n"));
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("maintenance-on")
      .setDescription("Webアプリをメンテナンスモードに移行(ログイン後の全ページをブロック)")
      .addStringOption((o) => o.setName("メッセージ").setDescription("ユーザーに表示する案内文").setRequired(false)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const message = interaction.options.getString("メッセージ") ?? undefined;
      const r = await adminSetMaintenance(true, message);
      if (r.error) return interaction.editReply(`失敗: ${r.error}`);
      await interaction.editReply("🚧 メンテナンスモードを有効にしました。");
    }),
  },
  {
    data: new SlashCommandBuilder().setName("maintenance-off").setDescription("メンテナンスモードを解除"),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const r = await adminSetMaintenance(false, null);
      if (r.error) return interaction.editReply(`失敗: ${r.error}`);
      await interaction.editReply("✅ メンテナンスモードを解除しました。");
    }),
  },
];

export const publicCommands = [
  {
    data: new SlashCommandBuilder()
      .setName("custom")
      .setDescription("登録済みのカスタム返信を呼び出す")
      .addStringOption((o) => o.setName("名前").setDescription("呼び出し名").setRequired(true)),
    execute: async (interaction) => {
      const name = interaction.options.getString("名前").trim().toLowerCase();
      const all = await listRecords("custom-commands");
      const match = all.find((c) => c.name === name);
      if (!match) return interaction.reply({ content: `「${name}」は登録されていません。`, ephemeral: true });
      await interaction.reply(match.response);
    },
  },
];
