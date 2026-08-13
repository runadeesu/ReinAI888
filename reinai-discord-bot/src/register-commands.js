import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import * as verify from "./commands/verify.js";
import * as verifyReinChat from "./commands/verifyReinChat.js";
import { commands as userManagementCommands } from "./commands/admin/userManagement.js";
import { commands as moderationCommands } from "./commands/admin/moderation.js";
import { commands as contentCommands } from "./commands/admin/content.js";
import { commands as securityCommands } from "./commands/admin/security.js";
import { commands as utilityCommands, publicCommands } from "./commands/admin/utility.js";
import { commands as reminderCommands } from "./commands/admin/reminders.js";
import { commands as noteCommands } from "./commands/admin/notes.js";
import { commands as voiceCommands } from "./commands/admin/voice.js";
import { commands as roleCommands } from "./commands/admin/roles.js";

const allCommands = [
  verify,
  verifyReinChat,
  ...userManagementCommands,
  ...moderationCommands,
  ...contentCommands,
  ...securityCommands,
  ...utilityCommands,
  ...publicCommands,
  ...reminderCommands,
  ...noteCommands,
  ...voiceCommands,
  ...roleCommands,
];
const commands = allCommands.map((c) => c.data.toJSON());
const rest = new REST().setToken(config.botToken);

try {
  console.log(`Registering ${commands.length} guild slash command(s)...`);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
  console.log("Done. Commands should appear in the server within a few seconds.");
} catch (err) {
  console.error("Failed to register commands:", err);
  process.exit(1);
}
