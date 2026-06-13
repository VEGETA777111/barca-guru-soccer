/**
 * Permissions — Verificador de permisos centralizado
 */

const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('./embeds');

// ── Permisos requeridos por comando ───────────────────────────────────────────
const PERMISSION_MAP = {
  ban:     { user: ['BanMembers'],        bot: ['BanMembers', 'ManageRoles'] },
  kick:    { user: ['KickMembers'],       bot: ['KickMembers'] },
  mute:    { user: ['ModerateMembers'],   bot: ['ModerateMembers'] },
  warn:    { user: ['ManageMessages'],    bot: ['ManageMessages'] },
  lock:    { user: ['ManageChannels'],    bot: ['ManageChannels'] },
  unlock:  { user: ['ManageChannels'],    bot: ['ManageChannels'] },
  role:    { user: ['ManageRoles'],       bot: ['ManageRoles'] },
  setup:   { user: ['Administrator'],     bot: ['Administrator'] },
};

/**
 * Verifica si el miembro tiene los permisos requeridos
 */
function hasPermission(member, permissions) {
  if (!Array.isArray(permissions)) permissions = [permissions];
  return permissions.every(perm => {
    const flag = PermissionFlagsBits[perm];
    return flag ? member.permissions.has(flag) : false;
  });
}

/**
 * Verifica y envía error si no tiene permisos
 * @returns {boolean} true si puede continuar
 */
async function checkPermissions(message, commandName) {
  const perms = PERMISSION_MAP[commandName];
  if (!perms) return true;

  // Verificar permisos del usuario
  if (perms.user && !hasPermission(message.member, perms.user)) {
    await message.reply({
      embeds: [errorEmbed(
        `No tienes permiso para usar este comando.\n**Permisos requeridos:** \`${perms.user.join(', ')}\``
      )],
    });
    return false;
  }

  // Verificar permisos del bot
  if (perms.bot && !hasPermission(message.guild.members.me, perms.bot)) {
    await message.reply({
      embeds: [errorEmbed(
        `No tengo los permisos necesarios para ejecutar este comando.\n**Necesito:** \`${perms.bot.join(', ')}\``
      )],
    });
    return false;
  }

  return true;
}

/**
 * Verifica si un miembro puede moderar a otro (jerarquía de roles)
 */
function canModerate(moderator, target) {
  if (moderator.guild.ownerId === moderator.id) return true;
  if (target.guild.ownerId === target.id) return false;
  return moderator.roles.highest.comparePositionTo(target.roles.highest) > 0;
}

/**
 * Verifica si el bot puede moderar a un miembro
 */
function botCanModerate(guild, target) {
  const botMember = guild.members.me;
  if (!botMember) return false;
  if (target.guild.ownerId === target.id) return false;
  return botMember.roles.highest.comparePositionTo(target.roles.highest) > 0;
}

module.exports = {
  hasPermission,
  checkPermissions,
  canModerate,
  botCanModerate,
  PERMISSION_MAP,
};
