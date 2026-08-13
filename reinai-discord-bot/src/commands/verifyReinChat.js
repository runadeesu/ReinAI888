import { SlashCommandBuilder } from "discord.js";
import { config } from "../config.js";
import { startReinChatVerification } from "../reinchatApi.js";

export const data = new SlashCommandBuilder()
  .setName("verify-reinchat")
  .setDescription("REINChatアカウントと直接連携して認証済みロールを取得します");

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (!config.reinchatUrl) {
    await interaction.editReply("REINChat連携は現在設定されていません。管理者にお問い合わせください。");
    return;
  }

  try {
    const result = await startReinChatVerification(interaction.user.id, interaction.user.username);
    if (result.error) throw new Error(result.error);
    await interaction.editReply(
      `以下のリンクをクリックして、REINChatアカウントでログインした状態で連携を確認してください。\n` +
        `このリンクは${result.expiresInMinutes}分間有効です。\n\n${result.url}`
    );
  } catch (err) {
    console.error("[verify-reinchat] failed to start verification:", err);
    await interaction.editReply("連携リンクの発行に失敗しました。しばらくしてからもう一度お試しください。");
  }
}
