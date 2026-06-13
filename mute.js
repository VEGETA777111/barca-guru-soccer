/**
 * Comando: .mute — Mutear usuario con timeout de Discord
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createModEmbed, errorEmbed } = require('../../utils/embeds');
const { canModerate, botCanModerate } = require('../../utils/permissions');
const { sendLog } = require('../../utils/logger');
const ms = require('ms');

module.exports = {
  name: 'mute',
  aliases: ['mutear', 'silenciar', 'timeout'],
  description: 'Silencia a un usuario por un tiempo determinado',
  usage: '.mute <@usuario | ID> [duración] [razón]',
  category: 'moderation',
  guildOnly: true,
  cooldown: 3000,

  async execute(message, args, client, config) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [errorEmbed('Necesitas el permiso **Moderar Miembros**.')] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [errorEmbed('No tengo el permiso **Moderar Miembros**.')] });
    }

    const targetMention = message.mentions.members.first();
    const targetId = targetMention?.id || args[0];

    if (!targetId) {
      return message.reply({
        embeds: [errorEmbed(
          '**Uso:** `.mute <@usuario | ID> [duración] [razón]`\n**Ejemplos de duración:** `10m`, `1h`, `2d`, `1w`'
        )],
      });
    }

    let targetMember;
    try {
      targetMember = targetMention || await message.guild.members.fetch(targetId);
    } catch {
      return message.reply({ embeds: [errorEmbed('No encontré a ese miembro.')] });
    }

    if (targetMember.id === message.author.id) {
      return message.reply({ embeds: [errorEmbed('No te puedes mutear a ti mismo.')] });
    }
    if (!canModerate(message.member, targetMember)) {
      return message.reply({ embeds: [errorEmbed('No puedes mutear a alguien con un rol igual o superior.')] });
    }
    if (!botCanModerate(message.guild, targetMember)) {
      return message.reply({ embeds: [errorEmbed('No puedo mutear a ese usuario.')] });
    }

    // Parsear duración y razón
    let durationMs = 10 * 60 * 1000; // Default: 10 minutos
    let reasonStart = message.mentions.members.size > 0 ? 1 : 1;
    let humanDuration = '10 minutos';

    if (args[reasonStart]) {
      const parsed = ms(args[reasonStart]);
      if (parsed) {
        durationMs = parsed;
        humanDuration = args[reasonStart];
        reasonStart++;
      }
    }

    // Timeout máximo de Discord: 28 días
    const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000;
    if (durationMs > MAX_TIMEOUT) {
      return message.reply({ embeds: [errorEmbed('La duración máxima del mute es **28 días**.')] });
    }

    const reason = args.slice(reasonStart).join(' ') || 'Sin razón especificada';

    // DM al usuario
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`🔇 Has sido silenciado en ${message.guild.name}`)
      .addFields(
        { name: '⚖️ Razón', value: reason },
        { name: '⏱️ Duración', value: humanDuration },
        { name: '🛡️ Moderador', value: message.author.tag },
      )
      .setTimestamp();

    await targetMember.user.send({ embeds: [dmEmbed] }).catch(() => {});

    // Aplicar timeout
    try {
      await targetMember.timeout(durationMs, `${message.author.tag}: ${reason}`);
    } catch (error) {
      return message.reply({ embeds: [errorEmbed(`No pude silenciar al usuario: ${error.message}`)] });
    }

    const unmuteTimestamp = Math.floor((Date.now() + durationMs) / 1000);

    await message.reply({
      embeds: [createModEmbed({
        action: 'mute',
        target: targetMember.user,
        moderator: message.author,
        reason,
        duration: `${humanDuration} (expira <t:${unmuteTimestamp}:R>)`,
      })],
    });

    await sendLog(message.guild, 'mod', createModEmbed({
      action: 'mute',
      target: targetMember.user,
      moderator: message.author,
      reason,
      duration: `${humanDuration} (expira <t:${unmuteTimestamp}:F>)`,
    }));
  },
};
