/**
 * Cooldowns — Sistema de cooldowns por usuario y comando
 */

const { Collection } = require('discord.js');
const { errorEmbed } = require('./embeds');
const ms = require('ms');

// Almacenamiento en memoria (también se puede usar Redis para producción)
const cooldowns = new Collection();

/**
 * Verifica y aplica el cooldown de un comando
 * @returns {null|EmbedBuilder} null si puede ejecutar, embed de error si está en cooldown
 */
function checkCooldown(userId, commandName, cooldownMs) {
  if (!cooldownMs || cooldownMs <= 0) return null;

  const key = `${commandName}-${userId}`;

  if (cooldowns.has(key)) {
    const expiresAt = cooldowns.get(key);
    const remaining = expiresAt - Date.now();

    if (remaining > 0) {
      const timeLeft = ms(remaining, { long: true });
      return errorEmbed(
        `⏳ Debes esperar **${timeLeft}** antes de usar \`.${commandName}\` nuevamente.`,
        '⌛ Cooldown Activo'
      );
    }
  }

  // Establecer cooldown
  cooldowns.set(key, Date.now() + cooldownMs);
  setTimeout(() => cooldowns.delete(key), cooldownMs);

  return null;
}

/**
 * Obtiene el tiempo restante de cooldown en ms
 */
function getCooldownRemaining(userId, commandName) {
  const key = `${commandName}-${userId}`;
  if (!cooldowns.has(key)) return 0;
  return Math.max(0, cooldowns.get(key) - Date.now());
}

/**
 * Limpia el cooldown de un usuario (para admins)
 */
function clearCooldown(userId, commandName) {
  const key = `${commandName}-${userId}`;
  cooldowns.delete(key);
}

module.exports = { checkCooldown, getCooldownRemaining, clearCooldown };
