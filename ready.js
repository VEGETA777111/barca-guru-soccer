/**
 * Event: ready — Bot conectado
 */

const { Events, ActivityType } = require('discord.js');
const { logger } = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    logger.success(`✅ Bot conectado como: ${client.user.tag}`);
    logger.info(`📊 Servidores: ${client.guilds.cache.size}`);
    logger.info(`👥 Usuarios: ${client.users.cache.size}`);

    // ── Actividad dinámica ─────────────────────────────────────────────────
    const activities = [
      { name: '.help | RB3 Security', type: ActivityType.Watching },
      { name: `${client.guilds.cache.size} servidores`, type: ActivityType.Watching },
      { name: 'Soccer Guru 🎴', type: ActivityType.Playing },
      { name: '.claim | Atrapa jugadores', type: ActivityType.Watching },
    ];

    let i = 0;
    const setActivity = () => {
      const activity = activities[i % activities.length];
      client.user.setPresence({
        status: process.env.BOT_STATUS || 'online',
        activities: [activity],
      });
      i++;
    };

    setActivity();
    setInterval(setActivity, 30000); // Rotar cada 30s
  },
};
