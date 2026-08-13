import { Client, GatewayIntentBits, Events, Partials } from "discord.js";
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
import { startVerificationPoller } from "./pollers/verification.js";
import { startReinChatVerificationPoller } from "./pollers/reinchatVerification.js";
import { startAnnouncementPoller } from "./pollers/announcements.js";
import { startSchedulerPoller } from "./pollers/scheduler.js";
import { registerSecretCheck } from "./events/secretCheck.js";
import { registerMemberLog } from "./events/memberLog.js";
import { registerMessageLog } from "./events/messageLog.js";
import { registerVoiceLog } from "./events/voiceLog.js";
import { takePendingAction } from "./pendingActions.js";
import { adminDeleteUser } from "./api.js";
import { isAdmin } from "./adminGuard.js";
import { appendRecord } from "./store.js";
import { botStats } from "./stats.js";

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
const commands = new Map(allCommands.map((c) => [c.data.name, c]));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  // MessageDelete/MessageUpdate fire for uncached messages too (e.g. after a
  // restart) when partials are enabled — otherwise discord.js silently
  // drops them instead of emitting a partial Message we can still log.
  partials: [Partials.Message, Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`[bot] logged in as ${c.user.tag}`);
  startVerificationPoller(client);
  startReinChatVerificationPoller(client);
  startAnnouncementPoller(client);
  startSchedulerPoller(client);
  registerSecretCheck(client);
  registerMemberLog(client);
  registerMessageLog(client);
  registerVoiceLog(client);
});

// Without these, a dropped Gateway connection (router restart, ISP hiccup,
// laptop sleep/wake) can go completely silent: the process stays alive and
// "npm start" shows nothing new, but Discord marks the bot offline because
// discord.js's own auto-reconnect got stuck. Log every shard lifecycle
// event so that's visible, and if a disconnect doesn't resolve within 2
// minutes, exit so a process manager (pm2, Docker, etc.) restarts us into a
// clean connection rather than staying wedged forever.
let disconnectWatchdog = null;

client.on(Events.ShardDisconnect, (event, shardId) => {
  console.warn(`[bot] shard ${shardId} disconnected (code ${event.code}) — waiting for reconnect...`);
  clearTimeout(disconnectWatchdog);
  disconnectWatchdog = setTimeout(() => {
    console.error("[bot] shard did not reconnect within 2 minutes — exiting so the process can be restarted");
    process.exit(1);
  }, 2 * 60 * 1000).unref();
});

client.on(Events.ShardReconnecting, (shardId) => {
  console.log(`[bot] shard ${shardId} reconnecting...`);
});

client.on(Events.ShardResume, (shardId) => {
  console.log(`[bot] shard ${shardId} resumed`);
  clearTimeout(disconnectWatchdog);
});

client.on(Events.ShardError, (err, shardId) => {
  console.error(`[bot] shard ${shardId} error:`, err.message);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
      botStats.commandsExecuted += 1;
      await appendRecord("admin-audit-log", {
        command: interaction.commandName,
        moderatorId: interaction.user.id,
        moderatorUsername: interaction.user.username,
        optionsSummary: JSON.stringify(interaction.options?.data ?? []).slice(0, 500),
      }).catch(() => {});
    } catch (err) {
      console.error(`[bot] error handling /${interaction.commandName}:`, err);
      const reply = { content: "コマンドの実行中にエラーが発生しました。", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton()) {
    await handleButton(interaction).catch((err) => {
      console.error("[bot] button handler error:", err);
    });
  }
});

async function handleButton(interaction) {
  if (interaction.customId === "cancel-action") {
    await interaction.update({ content: "キャンセルしました。", components: [] });
    return;
  }

  if (!interaction.customId.startsWith("confirm-action:")) return;

  // Ephemeral confirmation prompts are only visible to whoever ran the
  // original command, but re-check the role anyway in case that changes
  // between the prompt and the click.
  if (!isAdmin(interaction)) {
    await interaction.update({ content: "権限がありません。", components: [] });
    return;
  }

  const token = interaction.customId.split(":")[1];
  const action = takePendingAction(token);
  if (!action) {
    await interaction.update({ content: "この確認は期限切れです。もう一度コマンドを実行してください。", components: [] });
    return;
  }

  await interaction.update({ content: "処理中...", components: [] });

  if (action.type === "delete-user") {
    const r = await adminDeleteUser(action.query);
    await interaction.editReply(r.error ? `削除失敗: ${r.error}` : `🗑️ ${r.email} のアカウントを完全に削除しました。`);
    return;
  }

  if (action.type === "clean-spammers") {
    let kicked = 0;
    for (const userId of action.userIds) {
      try {
        await interaction.guild.members.kick(userId, "Suspected spam account (clean-spammers)");
        kicked += 1;
      } catch (err) {
        console.error(`[clean-spammers] failed to kick ${userId}:`, err.message);
      }
    }
    await interaction.editReply(`✅ ${kicked}/${action.userIds.length}件をキックしました。`);
    return;
  }

  if (action.type === "broadcast-dm") {
    let sent = 0;
    for (const userId of action.userIds) {
      try {
        const user = await interaction.client.users.fetch(userId);
        await user.send(action.body);
        sent += 1;
      } catch {
        // DMs closed or blocked — skip, don't fail the whole broadcast.
      }
    }
    await interaction.editReply(`✅ ${sent}/${action.userIds.length}人にDMを送信しました。`);
    return;
  }
}

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
