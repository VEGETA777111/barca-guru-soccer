/**
 * Event: guildMemberAdd — Nuevo miembro + Anti-Raid + Verificación
 */

const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { checkAntiRaid, checkAntiBot } = require('../handlers/SecurityHandler');
const { logger } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(member, client) {
    try {
      const config = await GuildConfig.findOne({ guildId: member.guild.id });
      if (!config) return;

      // ── Anti-Bot ────────────────────────────────────────────────────────
      const botBlocked = await checkAntiBot(member, config);
      if (botBlocked) return;

      // ── Anti-Raid ────────────────────────────────────────────────────────
      const raided = await checkAntiRaid(member, config);
      if (raided) return;

      // ── Verificación automática ───────────────────────────────────────────
      if (config.verification?.enabled) {
        await handleVerification(member, config);
      }

      // ── Log de entrada ─────────────────────────────────────────────────
      if (config.logs?.joinLog) {
        const logChannel = member.guild.channels.cache.get(config.logs.joinLog);
        if (logChannel) {
          const accountAge = Math.floor((Date.now() - member.user.createdAt) / 86400000);
          const isNew = accountAge < 7;

          const embed = new EmbedBuilder()
            .setColor(isNew ? 0xFFA500 : 0x57F287)
            .setTitle(`${isNew ? '⚠️ ' : ''}👋 Nuevo Miembro`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: '👤 Usuario', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
              { name: '📅 Cuenta creada', value: `<t:${Math.floor(member.user.createdAt / 1000)}:R>`, inline: true },
              { name: '👥 Miembro #', value: `\`${member.guild.memberCount}\``, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: isNew ? '⚠️ Cuenta nueva (menos de 7 días)' : '✅ Cuenta establecida' });

          await logChannel.send({ embeds: [embed] });
        }
      }

    } catch (error) {
      logger.error(`[MEMBER_ADD] ${error.message}`);
    }
  },
};

async function handleVerification(member, config) {
  const verChannel = member.guild.channels.cache.get(config.verification.channelId);
  if (!verChannel) return;

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🔐 Verificación Requerida')
    .setDescription(
      config.verification.message ||
      `¡Bienvenido a **${member.guild.name}**, ${member.user}!\n\nHaz clic en el botón de abajo para verificarte y acceder al servidor.`
    )
    .setThumbnail(member.guild.iconURL({ dynamic: true }))
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`verify-${member.user.id}`)
      .setLabel('✅ Verificarme')
      .setStyle(ButtonStyle.Success)
  );

  try {
    const msg = await verChannel.send({
      content: `${member}`,
      embeds: [embed],
      components: [row],
    });

    // Collector para el botón
    const collector = msg.createMessageComponentCollector({
      time: 300000, // 5 minutos
      filter: (i) => i.user.id === member.user.id,
    });

    collector.on('collect', async (interaction) => {
      const role = member.guild.roles.cache.get(config.verification.roleId);
      if (role) {
        await member.roles.add(role, 'Verificación automática');
      }

      await interaction.reply({
        content: `✅ ¡Verificado! Bienvenido a **${member.guild.name}**.`,
        ephemeral: true,
      });

      collector.stop();
      setTimeout(() => msg.delete().catch(() => {}), 3000);
    });

    collector.on('end', (_, reason) => {
      if (reason !== 'time') return;
      msg.delete().catch(() => {});
    });
  } catch (_) {}
}
