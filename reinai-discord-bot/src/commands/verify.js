import { SlashCommandBuilder } from "discord.js";
import { startVerification } from "../api.js";

export const data = new SlashCommandBuilder()
  .setName("verify")
  .setDescription("ReinAIアカウントと連携して認証済みロールを取得します");

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const { url, expiresInMinutes } = await startVerification(interaction.user.id, interaction.user.username);
    await interaction.editReply(
      `以下のリンクをクリックして、ReinAIアカウントでログインした状態で連携を確認してください。\n` +
        `このリンクは${expiresInMinutes}分間有効です。\n\n${url}`
    );
  } catch (err) {
    console.error("[verify] failed to start verification:", err);
    await interaction.editReply("連携リンクの発行に失敗しました。しばらくしてからもう一度お試しください。");
  }
}
