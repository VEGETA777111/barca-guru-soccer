/**
 * CommandHandler — Carga todos los comandos dinámicamente
 * Soporta prefijo (.) y comandos anidados en subcarpetas
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class CommandHandler {
  static async load(client) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const categories = fs.readdirSync(commandsPath).filter(f =>
      fs.statSync(path.join(commandsPath, f)).isDirectory()
    );

    let loaded = 0;
    let failed = 0;

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

      for (const file of files) {
        try {
          const filePath = path.join(categoryPath, file);
          const command = require(filePath);

          if (!command.name || !command.execute) {
            logger.warn(`[CMD] Comando inválido (falta name/execute): ${file}`);
            failed++;
            continue;
          }

          command.category = category;
          client.commands.set(command.name, command);

          // Registrar aliases si existen
          if (command.aliases && Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
              client.commands.set(alias, command);
            }
          }

          loaded++;
        } catch (error) {
          logger.error(`[CMD] Error cargando ${file}: ${error.message}`);
          failed++;
        }
      }
    }

    logger.success(`[CMD] ${loaded} comandos cargados | ${failed} fallidos`);
  }

  static reload(client, commandName) {
    const command = client.commands.get(commandName);
    if (!command) return false;

    const commandsPath = path.join(__dirname, '..', 'commands');
    const categories = fs.readdirSync(commandsPath).filter(f =>
      fs.statSync(path.join(commandsPath, f)).isDirectory()
    );

    for (const category of categories) {
      const filePath = path.join(commandsPath, category, `${commandName}.js`);
      if (fs.existsSync(filePath)) {
        delete require.cache[require.resolve(filePath)];
        const newCommand = require(filePath);
        newCommand.category = category;
        client.commands.set(newCommand.name, newCommand);
        return true;
      }
    }

    return false;
  }
}

module.exports = CommandHandler;
