/**
 * EventHandler — Carga todos los eventos dinámicamente
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class EventHandler {
  static async load(client) {
    const eventsPath = path.join(__dirname, '..', 'events');
    const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

    let loaded = 0;

    for (const file of files) {
      try {
        const event = require(path.join(eventsPath, file));

        if (!event.name || !event.execute) {
          logger.warn(`[EVT] Evento inválido: ${file}`);
          continue;
        }

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }

        loaded++;
      } catch (error) {
        logger.error(`[EVT] Error cargando ${file}: ${error.message}`);
      }
    }

    logger.success(`[EVT] ${loaded} eventos cargados`);
  }
}

module.exports = EventHandler;
