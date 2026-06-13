/**
 * Comando: .unlock — Desbloquear canal
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../utils/logger');

module.exports = {
  name: 'unlock',
  aliases: ['desbloquear'],
  description: 'Desbloquea el canal actual',
  usage: '.unlock [razón]',
  category: 'moderation',
  guildOnly: true,
  cooldown: 5000,

  async execute(message, args, client, config) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [errorEmbed('Necesitas el permiso **Gestionar Canales**.')] });
    }

    const reason = args.join(' ') || 'Sin razón especificada';

    try {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: null }, // null = sin override (reset)
        { reason: `${message.author.tag}: ${reason}` }
      );

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🔓 Canal Desbloqueado')
        .setDescription(`Este canal ha sido desbloqueado por **${message.author.tag}**`)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      await sendLog(message.guild, 'mod', new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🔓 Canal Desbloqueado')
        .addFields(
          { name: '📢 Canal', value: `${message.channel}`, inline: true },
          { name: '🛡️ Moderador', value: message.author.tag, inline: true },
        )
        .setTimestamp()
      );
    } catch (error) {
      return message.reply({ embeds: [errorEmbed(`Error al desbloquear: ${error.message}`)] });
    }
  },
};
