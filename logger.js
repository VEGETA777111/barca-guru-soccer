/**
 * Logger — Sistema de logging colorido + envío a Discord
 */

const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

// ── Colores ANSI ──────────────────────────────────────────────────────────────
const COLORS = {
  reset:   '\x1b[0m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bold:    '\x1b[1m',
};

function timestamp() {
  return new Date().toLocaleTimeString('es-MX', { hour12: false });
}

const logger = {
  info(msg, ...args) {
    console.log(`${COLORS.cyan}[${timestamp()}] [INFO]${COLORS.reset} ${msg}`, ...args);
  },
  success(msg, ...args) {
    console.log(`${COLORS.green}[${timestamp()}] [✓]${COLORS.reset} ${msg}`, ...args);
  },
  warn(msg, ...args) {
    console.log(`${COLORS.yellow}[${timestamp()}] [WARN]${COLORS.reset} ${msg}`, ...args);
  },
  error(msg, ...args) {
    console.error(`${COLORS.red}[${timestamp()}] [ERROR]${COLORS.reset} ${msg}`, ...args);
  },
  debug(msg, ...args) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${COLORS.magenta}[${timestamp()}] [DEBUG]${COLORS.reset} ${msg}`, ...args);
    }
  },
};

// ── Enviar log a Discord ──────────────────────────────────────────────────────
async function sendLog(guild, type, embed) {
  try {
    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config) return;

    let channelId;
    switch (type) {
      case 'security':  channelId = config.logs?.securityLog;  break;
      case 'mod':       channelId = config.logs?.modLog;       break;
      case 'general':   channelId = config.logs?.generalLog;   break;
      case 'economy':   channelId = config.logs?.economyLog;   break;
      case 'join':      channelId = config.logs?.joinLog;      break;
      default:          channelId = config.logs?.generalLog;
    }

    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.error('Error enviando log a Discord:', error.message);
  }
}

module.exports = { logger, sendLog };
