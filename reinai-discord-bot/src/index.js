import { Client, GatewayIntentBits, Events } from "discord.js";
import { config } from "./config.js";
import * as verify from "./commands/verify.js";
import { startVerificationPoller } from "./pollers/verification.js";
import { startAnnouncementPoller } from "./pollers/announcements.js";

const commands = new Map([[verify.data.name, verify]]);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once(Events.ClientReady, (c) => {
  console.log(`[bot] logged in as ${c.user.tag}`);
  startVerificationPoller(client);
  startAnnouncementPoller(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[bot] error handling /${interaction.commandName}:`, err);
    const reply = { content: "コマンドの実行中にエラーが発生しました。", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

client.login(config.botToken);
