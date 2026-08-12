import { SlashCommandBuilder, ChannelType } from "discord.js";
import { requireAdmin } from "../../adminGuard.js";

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("voice-move")
      .setDescription("ユーザーを別のボイスチャンネルに移動")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true))
      .addChannelOption((o) => o.setName("移動先").setDescription("移動先のVC").addChannelTypes(ChannelType.GuildVoice).setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const target = interaction.options.getMember("ユーザー");
      const destination = interaction.options.getChannel("移動先");
      if (!target?.voice?.channelId) return interaction.reply({ content: "そのユーザーはボイスチャンネルにいません。", ephemeral: true });

      await target.voice.setChannel(destination, `${interaction.user.username} による移動`);
      await interaction.reply({ content: `🔀 ${target.user.tag} を ${destination} に移動しました。`, ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("voice-disconnect")
      .setDescription("ユーザーをボイスチャンネルから切断")
      .addUserOption((o) => o.setName("ユーザー").setDescription("対象ユーザー").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const target = interaction.options.getMember("ユーザー");
      if (!target?.voice?.channelId) return interaction.reply({ content: "そのユーザーはボイスチャンネルにいません。", ephemeral: true });

      await target.voice.disconnect(`${interaction.user.username} による切断`);
      await interaction.reply({ content: `📴 ${target.user.tag} をボイスチャンネルから切断しました。`, ephemeral: true });
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("voice-mute-all")
      .setDescription("指定VC内の全員をサーバーミュート/解除")
      .addChannelOption((o) => o.setName("チャンネル").setDescription("対象のVC").addChannelTypes(ChannelType.GuildVoice).setRequired(true))
      .addBooleanOption((o) => o.setName("ミュート").setDescription("true=ミュート, false=解除").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel("チャンネル");
      const mute = interaction.options.getBoolean("ミュート");
      const voiceChannel = await interaction.guild.channels.fetch(channel.id);

      let count = 0;
      for (const member of voiceChannel.members.values()) {
        try {
          await member.voice.setMute(mute, `${interaction.user.username} による一括${mute ? "ミュート" : "ミュート解除"}`);
          count += 1;
        } catch (err) {
          console.error(`[voice-mute-all] failed for ${member.id}:`, err.message);
        }
      }
      await interaction.editReply(`${mute ? "🔇" : "🔊"} ${channel} の${count}人を${mute ? "ミュート" : "ミュート解除"}しました。`);
    }),
  },
  {
    data: new SlashCommandBuilder()
      .setName("voice-lock")
      .setDescription("ボイスチャンネルへの新規接続を制限/解除")
      .addChannelOption((o) => o.setName("チャンネル").setDescription("対象のVC").addChannelTypes(ChannelType.GuildVoice).setRequired(true))
      .addBooleanOption((o) => o.setName("ロック").setDescription("true=ロック, false=解除").setRequired(true)),
    execute: requireAdmin(async (interaction) => {
      const channel = interaction.options.getChannel("チャンネル");
      const lock = interaction.options.getBoolean("ロック");
      const voiceChannel = await interaction.guild.channels.fetch(channel.id);

      await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: lock ? false : null });
      await interaction.reply({ content: `${lock ? "🔒" : "🔓"} ${channel} を${lock ? "ロック" : "解除"}しました。`, ephemeral: true });
    }),
  },
];
