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

client.on(Events.Error, (err) => {
  console.error("[bot] client error:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[bot] unhandled rejection:", err);
});

client.login(config.botToken).catch((err) => {
  console.error("[bot] failed to connect to Discord's Gateway:", err.message);
  console.error(
    "If this is 'Unexpected server response: 403', it usually means the network you're running on " +
      "(a proxy, VPN, or some cloud/datacenter IP ranges) is being rejected by Discord's Gateway edge. " +
      "REST calls (used by /verify and the pollers once connected) can still work over such networks — " +
      "only the persistent Gateway WebSocket is affected. Try running from a different network/host."
  );
  process.exit(1);
});
