/**
 * Comando: .kick — Kickear usuarios
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createModEmbed, errorEmbed } = require('../../utils/embeds');
const { canModerate, botCanModerate } = require('../../utils/permissions');
const { sendLog } = require('../../utils/logger');

module.exports = {
  name: 'kick',
  aliases: ['kickear', 'expulsar'],
  description: 'Expulsa a un usuario del servidor',
  usage: '.kick <@usuario | ID> [razón]',
  category: 'moderation',
  guildOnly: true,
  cooldown: 3000,

  async execute(message, args, client, config) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply({ embeds: [errorEmbed('Necesitas el permiso **Expulsar Miembros**.')] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply({ embeds: [errorEmbed('No tengo el permiso **Expulsar Miembros**.')] });
    }

    const targetMention = message.mentions.members.first();
    const targetId = targetMention?.id || args[0];

    if (!targetId) {
      return message.reply({
        embeds: [errorEmbed('**Uso:** `.kick <@usuario | ID> [razón]`')],
      });
    }

    let targetMember;
    try {
      targetMember = targetMention || await message.guild.members.fetch(targetId);
    } catch {
      return message.reply({ embeds: [errorEmbed('No encontré a ese miembro en el servidor.')] });
    }

    if (targetMember.id === message.author.id) {
      return message.reply({ embeds: [errorEmbed('No te puedes kickear a ti mismo.')] });
    }
    if (targetMember.id === client.user.id) {
      return message.reply({ embeds: [errorEmbed('No me puedo kickear a mí mismo.')] });
    }
    if (!canModerate(message.member, targetMember)) {
      return message.reply({ embeds: [errorEmbed('No puedes expulsar a alguien con un rol igual o superior.')] });
    }
    if (!botCanModerate(message.guild, targetMember)) {
      return message.reply({ embeds: [errorEmbed('No puedo expulsar a ese usuario (mi rol es inferior).')] });
    }
    if (!targetMember.kickable) {
      return message.reply({ embeds: [errorEmbed('No puedo expulsar a ese usuario.')] });
    }

    const reason = args.slice(message.mentions.members.size > 0 ? 1 : 1).join(' ') || 'Sin razón especificada';

    // DM antes de kickear
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFF8C00)
      .setTitle(`👢 Has sido expulsado de ${message.guild.name}`)
      .addFields(
        { name: '⚖️ Razón', value: reason },
        { name: '🛡️ Moderador', value: message.author.tag },
      )
      .setTimestamp();

    await targetMember.user.send({ embeds: [dmEmbed] }).catch(() => {});

    await targetMember.kick(`${message.author.tag}: ${reason}`);

    await message.reply({
      embeds: [createModEmbed({
        action: 'kick',
        target: targetMember.user,
        moderator: message.author,
        reason,
      })],
    });

    await sendLog(message.guild, 'mod', createModEmbed({
      action: 'kick',
      target: targetMember.user,
      moderator: message.author,
      reason,
      extra: [{ name: '💬 Canal', value: `${message.channel}`, inline: true }],
    }));
  },
};
