/**
 * Event: interactionCreate — Botones, Selects, Modales
 */

const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const Ticket = require('../models/Ticket');
const { logger } = require('../utils/logger');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction, client) {
    try {
      if (interaction.isButton())           await handleButton(interaction, client);
      else if (interaction.isStringSelectMenu()) await handleSelect(interaction, client);
      else if (interaction.isModalSubmit())  await handleModal(interaction, client);
    } catch (error) {
      logger.error(`[INTERACTION] ${error.message}`);
      const reply = { embeds: [errorEmbed('Ocurrió un error procesando esta interacción.')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  },
};

// ── Manejador de botones ──────────────────────────────────────────────────────
async function handleButton(interaction, client) {
  const { customId, guild, user, member } = interaction;

  // ── Botón de ticket ──────────────────────────────────────────────────────
  if (customId === 'create_ticket') {
    await handleCreateTicket(interaction);
    return;
  }

  // ── Cerrar ticket ────────────────────────────────────────────────────────
  if (customId.startsWith('close_ticket-')) {
    await handleCloseTicket(interaction);
    return;
  }

  // ── Reclamar ticket (soporte) ─────────────────────────────────────────────
  if (customId.startsWith('claim_ticket-')) {
    await handleClaimTicket(interaction);
    return;
  }

  // ── Confirmar cierre de ticket ────────────────────────────────────────────
  if (customId.startsWith('confirm_close-')) {
    await handleConfirmClose(interaction);
    return;
  }

  // ── Appeal ────────────────────────────────────────────────────────────────
  if (customId === 'appeal_submit') {
    await handleAppealSubmit(interaction);
    return;
  }
}

// ── Crear ticket ──────────────────────────────────────────────────────────────
async function handleCreateTicket(interaction) {
  const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
  if (!config?.tickets?.enabled) {
    return interaction.reply({ embeds: [errorEmbed('El sistema de tickets no está activo.')], ephemeral: true });
  }

  // Verificar si ya tiene un ticket abierto
  const existing = await Ticket.findOne({
    guildId: interaction.guild.id,
    creatorId: interaction.user.id,
    status: { $in: ['open', 'claimed'] },
  });

  if (existing) {
    const ch = interaction.guild.channels.cache.get(existing.channelId);
    return interaction.reply({
      embeds: [errorEmbed(`Ya tienes un ticket abierto: ${ch || 'canal eliminado'}`)],
      ephemeral: true,
    });
  }

  // Incrementar contador
  config.tickets.counter++;
  await config.save();

  const ticketId = `ticket-${String(config.tickets.counter).padStart(4, '0')}`;

  // Crear canal
  const supportRole = config.tickets.supportRoleId
    ? interaction.guild.roles.cache.get(config.tickets.supportRoleId)
    : null;

  const channel = await interaction.guild.channels.create({
    name: ticketId,
    parent: config.tickets.categoryId || null,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: ['ViewChannel'] },
      { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] },
      ...(supportRole ? [{ id: supportRole.id, allow: ['ViewChannel', 'SendMessages', 'ManageMessages'] }] : []),
    ],
  });

  // Guardar en base de datos
  await Ticket.create({
    ticketId,
    guildId: interaction.guild.id,
    channelId: channel.id,
    creatorId: interaction.user.id,
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🎫 ${ticketId}`)
    .setDescription(`Hola ${interaction.user}, hemos creado tu ticket.\n\nDescribe tu problema y un miembro del equipo te atenderá pronto.`)
    .addFields(
      { name: '👤 Creado por', value: `${interaction.user.tag}`, inline: true },
      { name: '🕐 Hora', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`close_ticket-${interaction.user.id}`)
      .setLabel('Cerrar Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`claim_ticket-${interaction.user.id}`)
      .setLabel('Reclamar')
      .setEmoji('👋')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ content: `${interaction.user}${supportRole ? ` | ${supportRole}` : ''}`, embeds: [embed], components: [row] });

  await interaction.reply({
    embeds: [successEmbed(`¡Tu ticket fue creado en ${channel}!`)],
    ephemeral: true,
  });
}

// ── Cerrar ticket ─────────────────────────────────────────────────────────────
async function handleCloseTicket(interaction) {
  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('No se encontró este ticket.')], ephemeral: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirm_close-${interaction.user.id}`)
      .setLabel('Confirmar cierre')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('cancel_close')
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('⚠️ ¿Cerrar ticket?')
      .setDescription('¿Estás seguro de que deseas cerrar este ticket?')
    ],
    components: [row],
  });
}

// ── Confirmar cierre ──────────────────────────────────────────────────────────
async function handleConfirmClose(interaction) {
  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  if (!ticket) return;

  ticket.status = 'closed';
  ticket.closedBy = interaction.user.id;
  ticket.closedAt = new Date();
  await ticket.save();

  await interaction.reply({ embeds: [successEmbed('Ticket cerrado. Este canal será eliminado en 5 segundos.')] });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

// ── Reclamar ticket ───────────────────────────────────────────────────────────
async function handleClaimTicket(interaction) {
  const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
  const supportRole = config?.tickets?.supportRoleId;

  if (supportRole && !interaction.member.roles.cache.has(supportRole)) {
    return interaction.reply({ embeds: [errorEmbed('Solo el equipo de soporte puede reclamar tickets.')], ephemeral: true });
  }

  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  if (!ticket) return;

  ticket.status = 'claimed';
  ticket.claimedBy = interaction.user.id;
  await ticket.save();

  await interaction.reply({
    embeds: [successEmbed(`${interaction.user} ha reclamado este ticket y te atenderá pronto.`)],
  });
}

// ── Manejador de selects ──────────────────────────────────────────────────────
async function handleSelect(interaction, client) {
  // Extensible para futuros selects
  logger.debug(`[SELECT] ${interaction.customId} por ${interaction.user.tag}`);
}

// ── Manejador de modales ──────────────────────────────────────────────────────
async function handleModal(interaction, client) {
  logger.debug(`[MODAL] ${interaction.customId} por ${interaction.user.tag}`);
}

async function handleAppealSubmit(interaction) {
  await interaction.reply({
    embeds: [successEmbed('Tu appeal fue enviado. El equipo lo revisará pronto.')],
    ephemeral: true,
  });
}
