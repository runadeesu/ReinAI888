import { SlashCommandBuilder } from "discord.js";
import { requireAdmin } from "../../adminGuard.js";

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("role-add")
      .setDescription("ユーザーにロールを付与")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true))
      .addRoleOption((o) => o.setName("ロール").setDescription("付与するロール").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const target = interaction.options.getMember("ユーザー");
      const role = interaction.options.getRole("ロール");
      if (!target) return interaction.reply({ content: "そのユーザーが見つかりません。", ephemeral: true });

      await target.roles.add(role, `${interaction.user.username} による付与`);
      await interaction.reply({ content: `✅ ${target.user.tag} に ${role} を付与しました。`, ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("role-remove")
      .setDescription("ユーザーからロールを削除")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true))
      .addRoleOption((o) => o.setName("ロール").setDescription("削除するロール").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const target = interaction.options.getMember("ユーザー");
      const role = interaction.options.getRole("ロール");
      if (!target) return interaction.reply({ content: "そのユーザーが見つかりません。", ephemeral: true });

      await target.roles.remove(role, `${interaction.user.username} による削除`);
      await interaction.reply({ content: `✅ ${target.user.tag} から ${role} を削除しました。`, ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder().setName("invite-list").setDescription("サーバーの有効な招待リンク一覧"),
    execute: requireAdmin(async (interaction) => {
      const invites = await interaction.guild.invites.fetch();
      if (invites.size === 0) return interaction.reply({ content: "有効な招待リンクはありません。", ephemeral: true });

      const lines = invites.map((inv) => {
        const uses = `${inv.uses ?? 0}${inv.maxUses ? `/${inv.maxUses}` : ""}`;
        const expires = inv.expiresAt ? inv.expiresAt.toLocaleString("ja-JP") : "無期限";
        return `\`${inv.code}\` #${inv.channel?.name ?? "不明"} — 作成: ${inv.inviter?.tag ?? "不明"} / 使用: ${uses} / 期限: ${expires}`;
      });
      await interaction.reply({ content: lines.join("\n").slice(0, 1900), ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("invite-revoke")
      .setDescription("招待リンクを無効化")
      .addStringOption((o) => o.setName("コード").setDescription("/invite-list で表示される招待コード").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const code = interaction.options.getString("コード");
      const invites = await interaction.guild.invites.fetch();
      const match = invites.get(code);
      if (!match) return interaction.reply({ content: "その招待コードが見つかりません。", ephemeral: true });

      await match.delete(`${interaction.user.username} による無効化`);
      await interaction.reply({ content: `🗑️ 招待リンク \`${code}\` を無効化しました。`, ephemeral: true });
    }),
  },
];
