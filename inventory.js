/**
 * Comando: .inventory — Ver inventario de jugadores con paginación
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');
const Player  = require('../../models/Player');
const User    = require('../../models/User');
const { errorEmbed, COLORS } = require('../../utils/embeds');

const ITEMS_PER_PAGE = 8;

const RARITY_EMOJI = {
  Common:    '⚪',
  Rare:      '🔵',
  Epic:      '🟣',
  Legendary: '🟡',
  Mythic:    '🔴',
};

const RARITY_ORDER = ['Mythic', 'Legendary', 'Epic', 'Rare', 'Common'];

module.exports = {
  name: 'inventory',
  aliases: ['inv', 'coleccion', 'collection', 'cards'],
  description: 'Ver tu colección de jugadores',
  usage: '.inventory [@usuario] [rareza]',
  category: 'soccer',
  guildOnly: true,
  cooldown: 5000,

  async execute(message, args, client, config) {
    // Target: el propio usuario o uno mencionado
    const target     = message.mentions.users.first() || message.author;
    const guildId    = message.guild.id;

    // Filtro de rareza opcional
    const rarityFilter = args.find(a =>
      ['common', 'rare', 'epic', 'legendary', 'mythic'].includes(a.toLowerCase())
    );
    const rarityArg = rarityFilter
      ? rarityFilter.charAt(0).toUpperCase() + rarityFilter.slice(1).toLowerCase()
      : null;

    const userDoc = await User.findOrCreate(target.id, guildId);

    if (!userDoc.soccer.inventory.length) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xAAAAAA)
          .setTitle('📦 Inventario Vacío')
          .setDescription(
            target.id === message.author.id
              ? `No tienes jugadores todavía.\nUsa \`.claim\` para conseguir tu primer jugador!`
              : `**${target.username}** no tiene jugadores aún.`
          )
          .setTimestamp()
        ],
      });
    }

    // Construir query
    const query = {
      _id:     { $in: userDoc.soccer.inventory },
      guildId,
    };
    if (rarityArg) query.rarity = rarityArg;

    const allPlayers = await Player.find(query).sort({ overall: -1 });

    if (!allPlayers.length) {
      return message.reply({
        embeds: [errorEmbed(`No hay jugadores de rareza **${rarityArg}** en la colección.`)],
      });
    }

    // Estadísticas del inventario
    const stats = {
      total:     allPlayers.length,
      mythic:    allPlayers.filter(p => p.rarity === 'Mythic').length,
      legendary: allPlayers.filter(p => p.rarity === 'Legendary').length,
      epic:      allPlayers.filter(p => p.rarity === 'Epic').length,
      rare:      allPlayers.filter(p => p.rarity === 'Rare').length,
      common:    allPlayers.filter(p => p.rarity === 'Common').length,
      totalValue: allPlayers.reduce((sum, p) => sum + Math.floor(p.price * 0.6), 0),
      bestOverall: allPlayers[0],
    };

    // Dividir en páginas
    const chunks = [];
    for (let i = 0; i < allPlayers.length; i += ITEMS_PER_PAGE) {
      chunks.push(allPlayers.slice(i, i + ITEMS_PER_PAGE));
    }

    let currentPage = 0;
    let currentFilter = rarityArg || 'all';

    // ── Generar embed de página ───────────────────────────────────────────
    const generateEmbed = (page) => {
      const players = chunks[page];
      const favId   = userDoc.soccer.favoriteId?.toString();

      const playerList = players.map((p, i) => {
        const isFav    = favId === p._id.toString();
        const index    = page * ITEMS_PER_PAGE + i + 1;
        const onMarket = p.isOnMarket ? ' 🛒' : '';
        const fav      = isFav ? ' ⭐' : '';
        return `\`${String(index).padStart(2, '0')}.\` ${RARITY_EMOJI[p.rarity]} **${p.name}**${fav}${onMarket}\n` +
               `　　\`${p.position}\` | OVR **${p.overall}** | ${p.nationality}`;
      }).join('\n\n');

      return new EmbedBuilder()
        .setColor(COLORS.soccer)
        .setTitle(`📦 Colección de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(playerList)
        .addFields(
          {
            name: '📊 Resumen',
            value: [
              `🔴 Mythic: **${stats.mythic}** | 🟡 Legendary: **${stats.legendary}**`,
              `🟣 Epic: **${stats.epic}** | 🔵 Rare: **${stats.rare}** | ⚪ Common: **${stats.common}**`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '💰 Valor total',
            value: `**${stats.totalValue.toLocaleString()} 🪙**`,
            inline: true,
          },
          {
            name: '🏆 Mejor jugador',
            value: `**${stats.bestOverall.name}** (${stats.bestOverall.overall} OVR)`,
            inline: true,
          },
        )
        .setFooter({ text: `Página ${page + 1}/${chunks.length} • ${stats.total} jugadores` })
        .setTimestamp();
    };

    // ── Componentes de navegación ─────────────────────────────────────────
    const getNavRow = (page) => new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('inv_first')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),

      new ButtonBuilder()
        .setCustomId('inv_prev')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),

      new ButtonBuilder()
        .setCustomId('inv_page')
        .setLabel(`${page + 1}/${chunks.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId('inv_next')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === chunks.length - 1),

      new ButtonBuilder()
        .setCustomId('inv_last')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === chunks.length - 1),
    );

    const getFilterRow = () => new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('inv_filter')
        .setPlaceholder('Filtrar por rareza...')
        .addOptions([
          { label: 'Todas', value: 'all', emoji: '📦' },
          { label: 'Mythic',    value: 'Mythic',    emoji: '🔴' },
          { label: 'Legendary', value: 'Legendary', emoji: '🟡' },
          { label: 'Epic',      value: 'Epic',      emoji: '🟣' },
          { label: 'Rare',      value: 'Rare',      emoji: '🔵' },
          { label: 'Common',    value: 'Common',    emoji: '⚪' },
        ]),
    );

    const msg = await message.reply({
      embeds: [generateEmbed(currentPage)],
      components: [getNavRow(currentPage), getFilterRow()],
    });

    const collector = msg.createMessageComponentCollector({
      time: 120000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();

      if (interaction.componentType === ComponentType.Button) {
        switch (interaction.customId) {
          case 'inv_first': currentPage = 0; break;
          case 'inv_prev':  currentPage = Math.max(0, currentPage - 1); break;
          case 'inv_next':  currentPage = Math.min(chunks.length - 1, currentPage + 1); break;
          case 'inv_last':  currentPage = chunks.length - 1; break;
        }
      }

      if (interaction.componentType === ComponentType.StringSelect) {
        if (interaction.customId === 'inv_filter') {
          const selectedRarity = interaction.values[0];

          // Re-filtrar jugadores
          const newQuery = { _id: { $in: userDoc.soccer.inventory }, guildId };
          if (selectedRarity !== 'all') newQuery.rarity = selectedRarity;

          const filtered = await Player.find(newQuery).sort({ overall: -1 });

          if (!filtered.length) {
            await interaction.followUp({
              content: `❌ No tienes jugadores de rareza **${selectedRarity}**.`,
              ephemeral: true,
            });
            return;
          }

          // Reconstruir páginas
          chunks.length = 0;
          for (let i = 0; i < filtered.length; i += ITEMS_PER_PAGE) {
            chunks.push(filtered.slice(i, i + ITEMS_PER_PAGE));
          }
          currentPage = 0;
          currentFilter = selectedRarity;
        }
      }

      if (!chunks[currentPage]) currentPage = 0;

      await msg.edit({
        embeds: [generateEmbed(currentPage)],
        components: [getNavRow(currentPage), getFilterRow()],
      }).catch(() => {});
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
