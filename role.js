/**
 * Comando: .role — Añadir o quitar rol a un usuario
 */

const { PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'role',
  aliases: ['rol', 'giverole', 'removerole'],
  description: 'Añade o quita un rol a un usuario',
  usage: '.role <@usuario> <@rol>',
  category: 'moderation',
  guildOnly: true,
  cooldown: 3000,

  async execute(message, args, client, config) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({ embeds: [errorEmbed('Necesitas el permiso **Gestionar Roles**.')] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({ embeds: [errorEmbed('No tengo el permiso **Gestionar Roles**.')] });
    }

    const targetMember = message.mentions.members.first();
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

    if (!targetMember || !role) {
      return message.reply({ embeds: [errorEmbed('**Uso:** `.role <@usuario> <@rol>`')] });
    }

    // Verificar jerarquía de roles
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({ embeds: [errorEmbed('No puedo asignar ese rol (es igual o superior al mío).')] });
    }
    if (role.position >= message.member.roles.highest.position) {
      return message.reply({ embeds: [errorEmbed('No puedes asignar un rol igual o superior al tuyo.')] });
    }

    const hasRole = targetMember.roles.cache.has(role.id);

    if (hasRole) {
      await targetMember.roles.remove(role, `${message.author.tag}: Removido via .role`);
      await message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('➖ Rol Removido')
          .setDescription(`Se removió el rol ${role} a ${targetMember}`)
          .setTimestamp()
        ],
      });
    } else {
      await targetMember.roles.add(role, `${message.author.tag}: Asignado via .role`);
      await message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('➕ Rol Asignado')
          .setDescription(`Se asignó el rol ${role} a ${targetMember}`)
          .setTimestamp()
        ],
      });
    }

    await sendLog(message.guild, 'mod', new EmbedBuilder()
      .setColor(hasRole ? 0xED4245 : 0x57F287)
      .setTitle(hasRole ? '➖ Rol Removido' : '➕ Rol Asignado')
      .addFields(
        { name: '👤 Usuario', value: `${targetMember.user.tag}`, inline: true },
        { name: '🎭 Rol', value: `${role.name}`, inline: true },
        { name: '🛡️ Moderador', value: message.author.tag, inline: true },
      )
      .setTimestamp()
    );
  },
};
