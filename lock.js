/**
 * Comando: .lock — Bloquear canal
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../utils/logger');

module.exports = {
  name: 'lock',
  aliases: ['bloquear', 'lockdown'],
  description: 'Bloquea el canal actual',
  usage: '.lock [razón]',
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
        { SendMessages: false },
        { reason: `${message.author.tag}: ${reason}` }
      );

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🔒 Canal Bloqueado')
        .setDescription(`Este canal ha sido bloqueado por **${message.author.tag}**\n**Razón:** ${reason}`)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      await sendLog(message.guild, 'mod', new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🔒 Canal Bloqueado')
        .addFields(
          { name: '📢 Canal', value: `${message.channel}`, inline: true },
          { name: '🛡️ Moderador', value: message.author.tag, inline: true },
          { name: '📝 Razón', value: reason },
        )
        .setTimestamp()
      );
    } catch (error) {
      return message.reply({ embeds: [errorEmbed(`Error al bloquear el canal: ${error.message}`)] });
    }
  },
};
