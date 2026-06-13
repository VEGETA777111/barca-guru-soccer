/**
 * Comando: .warn — Sistema de advertencias
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { createModEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../utils/logger');

module.exports = {
  name: 'warn',
  aliases: ['advertir', 'advertencia'],
  description: 'Advierte a un usuario y registra la advertencia',
  usage: '.warn <@usuario | ID> [razón]',
  category: 'moderation',
  guildOnly: true,
  cooldown: 3000,

  async execute(message, args, client, config) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [errorEmbed('Necesitas el permiso **Gestionar Mensajes**.')] });
    }

    const targetMention = message.mentions.members.first();
    const targetId = targetMention?.id || args[0];

    if (!targetId) {
      return message.reply({ embeds: [errorEmbed('**Uso:** `.warn <@usuario | ID> [razón]`')] });
    }

    let targetMember;
    try {
      targetMember = targetMention || await message.guild.members.fetch(targetId);
    } catch {
      return message.reply({ embeds: [errorEmbed('No encontré a ese miembro.')] });
    }

    if (targetMember.id === message.author.id) {
      return message.reply({ embeds: [errorEmbed('No te puedes advertir a ti mismo.')] });
    }
    if (targetMember.user.bot) {
      return message.reply({ embeds: [errorEmbed('No puedes advertir a un bot.')] });
    }

    const reason = args.slice(message.mentions.members.size > 0 ? 1 : 1).join(' ') || 'Sin razón especificada';

    // Guardar advertencia en la base de datos
    const userDoc = await User.findOrCreate(targetMember.id, message.guild.id);
    userDoc.warnings.push({
      reason,
      moderator: message.author.id,
      date: new Date(),
    });
    await userDoc.save();

    const warnCount = userDoc.warnings.length;

    // DM al usuario
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`⚠️ Has recibido una advertencia en ${message.guild.name}`)
      .addFields(
        { name: '⚖️ Razón', value: reason },
        { name: '🛡️ Moderador', value: message.author.tag },
        { name: '📊 Total de advertencias', value: `${warnCount}`, inline: true },
      )
      .setTimestamp();

    await targetMember.user.send({ embeds: [dmEmbed] }).catch(() => {});

    // Acciones automáticas por acumulación de advertencias
    let autoAction = '';
    if (warnCount >= 5) {
      await targetMember.ban({ reason: 'Auto-Mod: 5 advertencias acumuladas' }).catch(() => {});
      autoAction = '🔨 **Acción automática:** Usuario baneado (5 warns)';
    } else if (warnCount >= 3) {
      await targetMember.timeout(3600000, 'Auto-Mod: 3 advertencias acumuladas').catch(() => {});
      autoAction = '🔇 **Acción automática:** Mute de 1 hora (3 warns)';
    }

    await message.reply({
      embeds: [createModEmbed({
        action: 'warn',
        target: targetMember.user,
        moderator: message.author,
        reason,
        extra: [
          { name: '📊 Advertencias totales', value: `\`${warnCount}\``, inline: true },
          ...(autoAction ? [{ name: '⚡ Acción automática', value: autoAction, inline: false }] : []),
        ],
      })],
    });

    await sendLog(message.guild, 'mod', createModEmbed({
      action: 'warn',
      target: targetMember.user,
      moderator: message.author,
      reason,
      extra: [
        { name: '📊 Total warns', value: `${warnCount}`, inline: true },
        { name: '💬 Canal', value: `${message.channel}`, inline: true },
      ],
    }));
  },
};
