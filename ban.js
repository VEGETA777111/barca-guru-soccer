/**
 * Comando: .ban — Banear usuarios
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createModEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { canModerate, botCanModerate } = require('../../utils/permissions');
const { sendLog } = require('../../utils/logger');
const ms = require('ms');

module.exports = {
  name: 'ban',
  aliases: ['banear'],
  description: 'Banea a un usuario del servidor',
  usage: '.ban <@usuario | ID> [días de mensajes] [razón]',
  category: 'moderation',
  guildOnly: true,
  cooldown: 3000,

  async execute(message, args, client, config) {
    // ── Verificar permisos ─────────────────────────────────────────────────
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ embeds: [errorEmbed('Necesitas el permiso **Banear Miembros** para usar este comando.')] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ embeds: [errorEmbed('No tengo el permiso **Banear Miembros**.')] });
    }

    // ── Parsear objetivo ──────────────────────────────────────────────────
    const targetId = message.mentions.users.first()?.id || args[0];
    if (!targetId) {
      return message.reply({
        embeds: [errorEmbed(
          `**Uso correcto:** \`.ban <@usuario | ID> [días] [razón]\`\n**Ejemplo:** \`.ban @Usuario 7 Spam masivo\``
        )],
      });
    }

    let target;
    try {
      target = await client.users.fetch(targetId);
    } catch {
      return message.reply({ embeds: [errorEmbed('No encontré ese usuario.')] });
    }

    // ── Parsear días y razón ───────────────────────────────────────────────
    let startIndex = message.mentions.users.size > 0 ? 1 : 1;
    let deleteDays = 0;
    let reason = '';

    // Si el siguiente arg es un número (días)
    if (args[startIndex] && !isNaN(args[startIndex])) {
      deleteDays = Math.min(7, Math.max(0, parseInt(args[startIndex])));
      startIndex++;
    }

    reason = args.slice(startIndex).join(' ') || 'Sin razón especificada';

    // ── Verificar objetivo en el servidor ─────────────────────────────────
    const targetMember = message.guild.members.cache.get(target.id);

    if (targetMember) {
      if (target.id === message.author.id) {
        return message.reply({ embeds: [errorEmbed('No puedes banearte a ti mismo.')] });
      }
      if (target.id === client.user.id) {
        return message.reply({ embeds: [errorEmbed('No me puedo banear a mí mismo... ¿por qué harías eso?')] });
      }
      if (!canModerate(message.member, targetMember)) {
        return message.reply({ embeds: [errorEmbed('No puedes banear a alguien con un rol igual o superior al tuyo.')] });
      }
      if (!botCanModerate(message.guild, targetMember)) {
        return message.reply({ embeds: [errorEmbed('No puedo banear a ese usuario (mi rol es inferior al suyo).')] });
      }
    }

    // ── Intentar enviar DM al objetivo ────────────────────────────────────
    const dmEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`🔨 Has sido baneado de ${message.guild.name}`)
      .addFields(
        { name: '⚖️ Razón', value: reason, inline: false },
        { name: '🛡️ Moderador', value: message.author.tag, inline: true },
        { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setTimestamp();

    await target.send({ embeds: [dmEmbed] }).catch(() => {});

    // ── Ejecutar ban ───────────────────────────────────────────────────────
    try {
      await message.guild.members.ban(target.id, {
        reason: `${message.author.tag}: ${reason}`,
        deleteMessageSeconds: deleteDays * 86400,
      });
    } catch (error) {
      return message.reply({ embeds: [errorEmbed(`No pude banear al usuario: ${error.message}`)] });
    }

    // ── Respuesta exitosa ─────────────────────────────────────────────────
    const successMsg = await message.reply({
      embeds: [createModEmbed({
        action: 'ban',
        target,
        moderator: message.author,
        reason,
        extra: deleteDays > 0
          ? [{ name: '🗑️ Mensajes eliminados', value: `${deleteDays} días`, inline: true }]
          : [],
      })],
    });

    // ── Log ───────────────────────────────────────────────────────────────
    await sendLog(message.guild, 'mod', createModEmbed({
      action: 'ban',
      target,
      moderator: message.author,
      reason,
      extra: [
        { name: '💬 Canal', value: `${message.channel}`, inline: true },
        { name: '🗑️ Mensajes', value: `${deleteDays} días`, inline: true },
      ],
    }));
  },
};
