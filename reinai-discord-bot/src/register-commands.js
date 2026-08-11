import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import * as verify from "./commands/verify.js";

const commands = [verify.data.toJSON()];
const rest = new REST().setToken(config.botToken);

try {
  console.log(`Registering ${commands.length} guild slash command(s)...`);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
  console.log("Done. Commands should appear in the server within a few seconds.");
} catch (err) {
  console.error("Failed to register commands:", err);
  process.exit(1);
}
