import { config } from "./config.js";

export function isAdmin(interaction) {
  return interaction.member?.roles?.cache?.has(config.adminRoleId) ?? false;
}

// Wraps an admin command's execute() so every module doesn't repeat the
// same role check + rejection reply.
export function requireAdmin(execute) {
  return async function guarded(interaction) {
    if (!isAdmin(interaction)) {
      await interaction.reply({ content: "このコマンドを実行する権限がありません。", ephemeral: true });
      return;
    }
    await execute(interaction);
  };
}
