/**
 * ╔══════════════════════════════════════════════╗
 * ║      RB3 Security & Soccer Guru Bot v2.0     ║
 * ║         Professional Discord Bot             ║
 * ╚══════════════════════════════════════════════╝
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const path = require('path');

// ── Handlers ──────────────────────────────────────────────────────────────────
const CommandHandler = require('./handlers/CommandHandler');
const EventHandler = require('./handlers/EventHandler');
const SecurityHandler = require('./handlers/SecurityHandler');
const { logger } = require('./utils/logger');

// ── Cliente de Discord ────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: false,
  },
});

// ── Colecciones globales ──────────────────────────────────────────────────────
client.commands     = new Collection();
client.cooldowns    = new Collection();
client.warnings     = new Collection();
client.spamTracker  = new Collection();
client.raidTracker  = new Collection();
client.muteTimers   = new Collection();

// ── Conexión a MongoDB ────────────────────────────────────────────────────────
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.success('MongoDB conectado exitosamente');
  } catch (error) {
    logger.error('Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
}

// ── Inicialización principal ──────────────────────────────────────────────────
async function initialize() {
  logger.info('╔══════════════════════════════════════════╗');
  logger.info('║   RB3 Security & Soccer Guru Bot v2.0    ║');
  logger.info('╚══════════════════════════════════════════╝');

  // Conectar base de datos
  await connectDatabase();

  // Cargar handlers
  await CommandHandler.load(client);
  await EventHandler.load(client);
  SecurityHandler.initialize(client);

  // Conectar bot
  await client.login(process.env.DISCORD_TOKEN);
}

// ── Manejo de errores globales ────────────────────────────────────────────────
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  logger.warn('Bot apagándose gracefully...');
  await mongoose.connection.close();
  client.destroy();
  process.exit(0);
});

// ── Exportar cliente para uso en módulos ──────────────────────────────────────
module.exports = { client };

// ── Arrancar ──────────────────────────────────────────────────────────────────
initialize().catch((err) => {
  logger.error('Error fatal en inicialización:', err);
  process.exit(1);
});
