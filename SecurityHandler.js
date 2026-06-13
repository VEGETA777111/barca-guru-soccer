/**
 * SecurityHandler — Sistema de seguridad central
 * Anti-Raid | Anti-Spam | Anti-Nuke | Anti-Mass Mention
 */

const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { sendLog } = require('../utils/logger');
const { createSecurityEmbed } = require('../utils/embeds');
const ms = require('ms');

class SecurityHandler {
  static initialize(client) {
    this.client = client;
    this.nukeTracker = new Map();   // channelDeletes, roleDeletes, bans por usuario
    this.joinTracker = new Map();   // joins rápidos para anti-raid
    logger.info('[SEC] Security Handler inicializado');
  }
}

// ── Anti-Spam ──────────────────────────────────────────────────────────────────
async function checkAntiSpam(message, config) {
  if (!config.antiSpam?.enabled) return false;

  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();
  const tracker = message.client.spamTracker;

  if (!tracker.has(key)) {
    tracker.set(key, { messages: [], muted: false });
  }

  const data = tracker.get(key);
  data.messages = data.messages.filter(t => now - t < 5000); // ventana 5s
  data.messages.push(now);

  const threshold = config.antiSpam.threshold || 5;

  if (data.messages.length >= threshold && !data.muted) {
    data.muted = true;

    try {
      await message.member.timeout(
        config.antiSpam.muteDuration || 60000,
        'Auto-Mod: Spam detectado'
      );

      await sendLog(message.guild, 'security', createSecurityEmbed({
        title: '🚫 Anti-Spam Activado',
        description: `**Usuario:** ${message.author.tag}\n**Mensajes:** ${data.messages.length} en 5s`,
        color: 0xff4444,
        fields: [
          { name: 'Canal', value: `${message.channel}`, inline: true },
          { name: 'Sanción', value: 'Timeout 1 minuto', inline: true },
        ],
      }));

      // Eliminar mensajes recientes
      const msgs = await message.channel.messages.fetch({ limit: 10 });
      const toDelete = msgs.filter(m =>
        m.author.id === message.author.id && now - m.createdTimestamp < 10000
      );
      await message.channel.bulkDelete(toDelete, true).catch(() => {});

      setTimeout(() => {
        if (tracker.has(key)) {
          tracker.get(key).muted = false;
        }
      }, config.antiSpam.muteDuration || 60000);

      return true;
    } catch (error) {
      console.error('[SPAM] Error aplicando timeout:', error.message);
    }
  }

  return false;
}

// ── Anti-Links ────────────────────────────────────────────────────────────────
async function checkAntiLinks(message, config) {
  if (!config.antiLinks?.enabled) return false;

  const urlRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)|(discord\.com\/invite\/[^\s]+)/gi;
  if (!urlRegex.test(message.content)) return false;

  // Verificar si el usuario está en whitelist
  const isWhitelisted =
    config.whitelist?.roles?.some(r => message.member.roles.cache.has(r)) ||
    config.whitelist?.users?.includes(message.author.id);

  if (isWhitelisted) return false;

  // Verificar si tiene permiso de links
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  try {
    await message.delete();
    const warn = await message.channel.send({
      content: `${message.author} ⚠️ Links no están permitidos en este servidor.`,
    });
    setTimeout(() => warn.delete().catch(() => {}), 5000);

    await sendLog(message.guild, 'security', createSecurityEmbed({
      title: '🔗 Anti-Links Activado',
      description: `**Usuario:** ${message.author.tag}\n**Link eliminado**`,
      color: 0xffa500,
    }));

    return true;
  } catch (err) {
    console.error('[LINKS] Error:', err.message);
  }

  return false;
}

// ── Anti-Mass Mention ─────────────────────────────────────────────────────────
async function checkAntiMassMention(message, config) {
  if (!config.antiMassMention?.enabled) return false;

  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  const threshold = config.antiMassMention.threshold || 5;

  if (mentionCount < threshold) return false;

  try {
    await message.delete();
    await message.member.timeout(300000, 'Auto-Mod: Mass mention');

    await sendLog(message.guild, 'security', createSecurityEmbed({
      title: '📢 Anti-Mass Mention',
      description: `**Usuario:** ${message.author.tag}\n**Menciones:** ${mentionCount}`,
      color: 0xff4444,
    }));

    return true;
  } catch (err) {
    console.error('[MENTION] Error:', err.message);
  }

  return false;
}

// ── Anti-Raid ─────────────────────────────────────────────────────────────────
async function checkAntiRaid(member, config) {
  if (!config.antiRaid?.enabled) return false;

  const guildId = member.guild.id;
  const now = Date.now();
  const tracker = member.client.raidTracker;

  if (!tracker.has(guildId)) {
    tracker.set(guildId, { joins: [], locked: false });
  }

  const data = tracker.get(guildId);
  data.joins = data.joins.filter(t => now - t < (config.antiRaid.window || 10000));
  data.joins.push(now);

  const threshold = config.antiRaid.threshold || 10;

  if (data.joins.length >= threshold && !data.locked) {
    data.locked = true;

    await sendLog(member.guild, 'security', createSecurityEmbed({
      title: '🚨 RAID DETECTADO — Servidor Bloqueado',
      description: `**${data.joins.length} joins** en los últimos ${config.antiRaid.window / 1000}s\n\nSe ha activado el **modo raid**. Nuevos miembros serán kickeados automáticamente.`,
      color: 0xff0000,
    }));

    // Auto-unlock después de X tiempo
    setTimeout(() => {
      if (tracker.has(guildId)) {
        tracker.get(guildId).locked = false;
      }
    }, config.antiRaid.lockDuration || 300000);

    return true;
  }

  if (data.locked) {
    try {
      await member.kick('Anti-Raid: Servidor en modo lockdown');
    } catch (_) {}
    return true;
  }

  return false;
}

// ── Anti-Bots ─────────────────────────────────────────────────────────────────
async function checkAntiBot(member, config) {
  if (!config.antiBots?.enabled) return false;
  if (!member.user.bot) return false;

  // Ver si el bot está en la whitelist
  if (config.whitelist?.bots?.includes(member.user.id)) return false;

  // Ver si tiene permisos para añadir bots (si no, kickear)
  const hasAuthorized = member.guild.members.cache
    .filter(m => m.permissions.has(PermissionFlagsBits.ManageGuild))
    .some(m => m.user.id !== member.client.user.id);

  if (!hasAuthorized) {
    try {
      await member.kick('Anti-Bot: Bot no autorizado');
      await sendLog(member.guild, 'security', createSecurityEmbed({
        title: '🤖 Anti-Bots',
        description: `**Bot eliminado:** ${member.user.tag} (${member.user.id})`,
        color: 0xff4444,
      }));
      return true;
    } catch (_) {}
  }

  return false;
}

// ── Anti-Nuke ─────────────────────────────────────────────────────────────────
async function checkAntiNuke(guild, executorId, action, config) {
  if (!config.antiNuke?.enabled) return false;

  const key = `${guild.id}-${executorId}`;
  const now = Date.now();

  if (!SecurityHandler.nukeTracker.has(key)) {
    SecurityHandler.nukeTracker.set(key, { actions: [] });
  }

  const data = SecurityHandler.nukeTracker.get(key);
  data.actions = data.actions.filter(a => now - a.time < 10000);
  data.actions.push({ action, time: now });

  const threshold = config.antiNuke.threshold || 3;

  if (data.actions.length >= threshold) {
    // Buscar al ejecutor y quitarle roles
    try {
      const member = await guild.members.fetch(executorId);
      const dangerousRoles = member.roles.cache.filter(r =>
        r.permissions.has(PermissionFlagsBits.Administrator) ||
        r.permissions.has(PermissionFlagsBits.ManageGuild) ||
        r.permissions.has(PermissionFlagsBits.BanMembers)
      );

      await member.roles.remove(dangerousRoles, 'Anti-Nuke: Acción masiva detectada');

      await sendLog(guild, 'security', createSecurityEmbed({
        title: '☢️ ANTI-NUKE ACTIVADO',
        description: `**Ejecutor:** ${member.user.tag}\n**Acciones:** ${data.actions.length} en 10s\n**Roles removidos:** ${dangerousRoles.size}`,
        color: 0xff0000,
      }));

      data.actions = [];
      return true;
    } catch (err) {
      console.error('[NUKE] Error:', err.message);
    }
  }

  return false;
}

// ── Logger helper (evitar circular) ──────────────────────────────────────────
const logger = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
};

module.exports = {
  SecurityHandler,
  checkAntiSpam,
  checkAntiLinks,
  checkAntiMassMention,
  checkAntiRaid,
  checkAntiBot,
  checkAntiNuke,
};
