/**
 * Comando: .help — Menú de ayuda con categorías y paginación
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');

module.exports = {
  name: 'help',
  aliases: ['ayuda', 'h', '?'],
  description: 'Muestra todos los comandos disponibles',
  usage: '.help [comando]',
  category: 'moderation',
  guildOnly: false,
  cooldown: 5000,

  async execute(message, args, client, config) {
    const prefix = config?.prefix || process.env.PREFIX || '.';

    // ── Ayuda específica de un comando ────────────────────────────────────
    if (args[0]) {
      const cmd = client.commands.get(args[0].toLowerCase());
      if (!cmd) {
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ No encontré el comando \`${args[0]}\`.`)
          ],
        });
      }

      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`📖 Comando: ${prefix}${cmd.name}`)
          .setDescription(cmd.description || 'Sin descripción')
          .addFields(
            { name: '📌 Uso', value: `\`${cmd.usage || `${prefix}${cmd.name}`}\``, inline: false },
            { name: '🏷️ Categoría', value: `\`${cmd.category || 'General'}\``, inline: true },
            { name: '⏱️ Cooldown', value: cmd.cooldown ? `\`${cmd.cooldown / 1000}s\`` : '`Ninguno`', inline: true },
            ...(cmd.aliases?.length ? [{ name: '🔀 Aliases', value: cmd.aliases.map(a => `\`${prefix}${a}\``).join(', '), inline: false }] : []),
          )
          .setTimestamp()
        ],
      });
    }

    // ── Menú principal ────────────────────────────────────────────────────
    const categories = {
      moderation: { emoji: '⚖️', label: 'Moderación', color: 0xFF8C00 },
      security:   { emoji: '🛡️', label: 'Seguridad', color: 0xFF4444 },
      soccer:     { emoji: '⚽', label: 'Soccer Guru', color: 0x00B0F4 },
      economy:    { emoji: '💰', label: 'Economía', color: 0xFFD700 },
    };

    const mainEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 RB3 Bot — Panel de Ayuda')
      .setDescription([
        '**¡Bienvenido al sistema de ayuda!**',
        '',
        'Usa el menú de abajo para explorar los comandos por categoría.',
        `Prefijo actual: \`${prefix}\``,
        '',
        '📌 Para ver detalles de un comando: `.help <comando>`',
      ].join('\n'))
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        Object.entries(categories).map(([key, cat]) => {
          const cmds = [...client.commands.values()].filter(c => c.category === key && !c.aliases?.includes(c.name));
          return {
            name: `${cat.emoji} ${cat.label}`,
            value: `\`${cmds.length} comandos\``,
            inline: true,
          };
        })
      )
      .setTimestamp()
      .setFooter({ text: 'RB3 Security & Soccer Guru Bot v2.0' });

    const select = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Selecciona una categoría...')
      .addOptions(
        Object.entries(categories).map(([key, cat]) => ({
          label: cat.label,
          value: key,
          emoji: cat.emoji,
          description: `Ver comandos de ${cat.label}`,
        }))
      );

    const row = new ActionRowBuilder().addComponents(select);
    const msg = await message.reply({ embeds: [mainEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on('collect', async (interaction) => {
      const category = interaction.values[0];
      const catInfo = categories[category];

      const cmds = [...new Set(
        [...client.commands.values()].filter(c => c.category === category)
      )];

      // Deduplica por nombre (para evitar aliases duplicados)
      const unique = [...new Map(cmds.map(c => [c.name, c])).values()];

      const catEmbed = new EmbedBuilder()
        .setColor(catInfo.color)
        .setTitle(`${catInfo.emoji} ${catInfo.label} — ${unique.length} comandos`)
        .setDescription(
          unique.map(c =>
            `\`${prefix}${c.name}\` — ${c.description || 'Sin descripción'}`
          ).join('\n') || 'Sin comandos disponibles'
        )
        .setTimestamp()
        .setFooter({ text: `Usa ${prefix}help <comando> para más detalles` });

      await interaction.update({ embeds: [catEmbed], components: [row] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
