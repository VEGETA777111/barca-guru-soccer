/**
 * Event: messageCreate — Dispatcher de comandos + Auto-Mod
 */

const { Events, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const User = require('../models/User');
const { checkAntiSpam, checkAntiLinks, checkAntiMassMention } = require('../handlers/SecurityHandler');
const { checkCooldown } = require('../utils/cooldowns');
const { errorEmbed } = require('../utils/embeds');
const { logger } = require('../utils/logger');

module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message, client) {
    // ── Filtros básicos ────────────────────────────────────────────────────
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.channel.permissionsFor(message.guild.members.me)?.has(PermissionFlagsBits.SendMessages)) return;

    // ── Cargar config del servidor ─────────────────────────────────────────
    let config;
    try {
      config = await GuildConfig.findOne({ guildId: message.guild.id });
    } catch (_) {
      config = null;
    }

    const prefix = config?.prefix || process.env.PREFIX || '.';

    // ── Verificar blacklist ────────────────────────────────────────────────
    if (config?.blacklist?.users?.includes(message.author.id)) return;

    // ── Auto-Mod (si no es admin) ─────────────────────────────────────────
    const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
    const isWhitelisted =
      config?.whitelist?.users?.includes(message.author.id) ||
      config?.whitelist?.roles?.some(r => message.member?.roles.cache.has(r));

    if (!isAdmin && !isWhitelisted && config) {
      // Anti-Spam
      const spammed = await checkAntiSpam(message, config);
      if (spammed) return;

      // Anti-Links
      const linked = await checkAntiLinks(message, config);
      if (linked) return;

      // Anti-Mass Mention
      const mentioned = await checkAntiMassMention(message, config);
      if (mentioned) return;
    }

    // ── XP pasivo (cada mensaje) ──────────────────────────────────────────
    try {
      const userDoc = await User.findOrCreate(message.author.id, message.guild.id);
      const now = Date.now();
      const lastXp = userDoc.xp.lastXp ? new Date(userDoc.xp.lastXp).getTime() : 0;

      if (now - lastXp > 60000) { // 1 min de cooldown para XP
        const xpGain = Math.floor(Math.random() * 10) + 5; // 5-15 XP
        const leveled = userDoc.addXP(xpGain);
        userDoc.xp.lastXp = new Date();
        await userDoc.save();

        if (leveled) {
          const lvlMsg = await message.channel.send({
            embeds: [{
              color: 0x5865F2,
              description: `🎉 ¡${message.author} subió al **nivel ${userDoc.xp.level}**! ¡Felicidades!`,
            }],
          });
          setTimeout(() => lvlMsg.delete().catch(() => {}), 8000);
        }
      }
    } catch (_) {}

    // ── Detectar prefijo ──────────────────────────────────────────────────
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    if (!commandName) return;

    // ── Buscar comando ────────────────────────────────────────────────────
    const command = client.commands.get(commandName);
    if (!command) return;

    // ── Cooldown ──────────────────────────────────────────────────────────
    if (command.cooldown) {
      const cooldownError = checkCooldown(message.author.id, command.name, command.cooldown);
      if (cooldownError) {
        return message.reply({ embeds: [cooldownError] });
      }
    }

    // ── Solo en servidores ────────────────────────────────────────────────
    if (command.guildOnly && !message.guild) {
      return message.reply({ embeds: [errorEmbed('Este comando solo funciona en servidores.')] });
    }

    // ── Ejecutar comando ──────────────────────────────────────────────────
    try {
      await command.execute(message, args, client, config);
    } catch (error) {
      logger.error(`[CMD] Error en ${command.name}: ${error.message}`);
      logger.error(error.stack);

      const errMsg = await message.reply({
        embeds: [errorEmbed(
          'Ocurrió un error inesperado al ejecutar este comando.',
          '❌ Error Interno'
        )],
      });

      setTimeout(() => errMsg.delete().catch(() => {}), 10000);
    }
  },
};
