/**
 * Comando: .market — Mercado de jugadores
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');
const Player = require('../../models/Player');
const User   = require('../../models/User');
const { createPlayerEmbed, errorEmbed, COLORS } = require('../../utils/embeds');
const { paginate, chunkArray } = require('../../utils/pagination');

const RARITY_EMOJI = {
  Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴',
};
const ITEMS_PER_PAGE = 6;

module.exports = {
  name: 'market',
  aliases: ['mercado', 'tienda', 'shop'],
  description: 'Compra y vende jugadores en el mercado',
  usage: '.market [rareza]',
  category: 'soccer',
  guildOnly: true,
  cooldown: 5000,

  async execute(message, args, client, config) {
    const guildId = message.guild.id;
    const userId  = message.author.id;

    const rarityFilter = args[0]
      ? args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase()
      : null;

    const validRarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    if (rarityFilter && !validRarities.includes(rarityFilter)) {
      return message.reply({
        embeds: [errorEmbed(
          `Rareza inválida. Opciones: ${validRarities.map(r => `\`${r}\``).join(', ')}`
        )],
      });
    }

    await showMarket(message, guildId, userId, client, rarityFilter);
  },
};

async function showMarket(message, guildId, userId, client, rarityFilter = null) {
  // Buscar jugadores en el mercado
  const query = { guildId, isOnMarket: true };
  if (rarityFilter) query.rarity = rarityFilter;

  const listings = await Player.find(query).sort({ rarity: 1, marketPrice: 1 });

  if (!listings.length) {
    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.economy)
        .setTitle('🛒 Mercado de Jugadores')
        .setDescription(
          rarityFilter
            ? `No hay jugadores de rareza **${rarityFilter}** en el mercado ahora mismo.`
            : 'El mercado está vacío por ahora.\n\nUsa `.player <nombre>` → 🛒 **Poner en mercado** para vender.'
        )
        .setTimestamp()
      ],
    });
  }

  // Construir páginas
  const chunks = chunkArray(listings, ITEMS_PER_PAGE);
  let currentPage = 0;
  const userDoc = await User.findOrCreate(userId, guildId);

  const generatePageEmbed = async (page) => {
    const items = chunks[page];

    const lines = await Promise.all(items.map(async (p, i) => {
      const owner = await client.users.fetch(p.ownerId).catch(() => null);
      const ownerName = owner?.username || 'Desconocido';
      const idx = page * ITEMS_PER_PAGE + i + 1;
      const canAfford = userDoc.economy.coins >= p.marketPrice;
      const isOwn = p.ownerId === userId;

      return [
        `\`${String(idx).padStart(2, '0')}.\` ${RARITY_EMOJI[p.rarity]} **${p.name}**`,
        `　　OVR **${p.overall}** | \`${p.position}\` | ${p.nationality}`,
        `　　💰 **${p.marketPrice.toLocaleString()} 🪙** ${isOwn ? '*(tuyo)*' : canAfford ? '✅' : '❌ insuficiente'}`,
        `　　Vendedor: *${ownerName}*`,
      ].join('\n');
    }));

    return new EmbedBuilder()
      .setColor(COLORS.economy)
      .setTitle('🛒 Mercado de Jugadores')
      .setDescription(lines.join('\n\n'))
      .addFields(
        {
          name: '💰 Tu balance',
          value: `**${userDoc.economy.coins.toLocaleString()} 🪙**`,
          inline: true,
        },
        {
          name: '📋 En venta',
          value: `**${listings.length}** jugadores`,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: `Página ${page + 1}/${chunks.length} • Escribe el nombre del jugador para comprarlo` });
  };

  const getNavRow = (page) => new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mkt_prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId('mkt_page')
      .setLabel(`${page + 1}/${chunks.length}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId('mkt_next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === chunks.length - 1),

    new ButtonBuilder()
      .setCustomId('mkt_buy')
      .setLabel('💰 Comprar jugador')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('mkt_refresh')
      .setLabel('🔄 Refrescar')
      .setStyle(ButtonStyle.Secondary),
  );

  const filterRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('mkt_filter')
      .setPlaceholder('Filtrar por rareza...')
      .addOptions([
        { label: 'Todas las rarezas', value: 'all', emoji: '📦' },
        { label: 'Mythic',    value: 'Mythic',    emoji: '🔴' },
        { label: 'Legendary', value: 'Legendary', emoji: '🟡' },
        { label: 'Epic',      value: 'Epic',      emoji: '🟣' },
        { label: 'Rare',      value: 'Rare',      emoji: '🔵' },
        { label: 'Common',    value: 'Common',    emoji: '⚪' },
      ]),
  );

  const msg = await message.reply({
    embeds: [await generatePageEmbed(currentPage)],
    components: [getNavRow(currentPage), filterRow],
  });

  const collector = msg.createMessageComponentCollector({
    time: 120000,
    filter: (i) => i.user.id === userId,
  });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate();

    if (interaction.customId === 'mkt_prev') {
      currentPage = Math.max(0, currentPage - 1);
    } else if (interaction.customId === 'mkt_next') {
      currentPage = Math.min(chunks.length - 1, currentPage + 1);
    } else if (interaction.customId === 'mkt_refresh') {
      // Recargar market
      const refreshed = await Player.find({ guildId, isOnMarket: true, ...(rarityFilter ? { rarity: rarityFilter } : {}) })
        .sort({ rarity: 1, marketPrice: 1 });
      chunks.length = 0;
      chunkArray(refreshed, ITEMS_PER_PAGE).forEach(c => chunks.push(c));
      currentPage = 0;
    } else if (interaction.customId === 'mkt_buy') {
      // Pedir nombre del jugador
      await interaction.followUp({
        content: `💬 ${interaction.user} — Escribe el **nombre del jugador** que quieres comprar (30s):`,
        ephemeral: false,
      });

      const filter = m => m.author.id === userId;
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => null);

      if (!collected?.size) return;

      const playerName = collected.first().content.trim();
      await collected.first().delete().catch(() => {});

      const toBuy = await Player.findOne({
        guildId,
        isOnMarket: true,
        name: { $regex: new RegExp(playerName, 'i') },
      });

      if (!toBuy) {
        await interaction.followUp({ content: `❌ No encontré a **"${playerName}"** en el mercado.`, ephemeral: true });
        return;
      }

      if (toBuy.ownerId === userId) {
        await interaction.followUp({ content: '❌ No puedes comprarte tu propio jugador.', ephemeral: true });
        return;
      }

      if (userDoc.economy.coins < toBuy.marketPrice) {
        await interaction.followUp({
          content: `❌ No tienes suficientes monedas. Necesitas **${toBuy.marketPrice.toLocaleString()} 🪙** y tienes **${userDoc.economy.coins.toLocaleString()} 🪙**.`,
          ephemeral: true,
        });
        return;
      }

      // ── Ejecutar compra ───────────────────────────────────────────────
      const sellerDoc = await User.findOrCreate(toBuy.ownerId, guildId);

      userDoc.economy.coins  -= toBuy.marketPrice;
      sellerDoc.economy.coins += Math.floor(toBuy.marketPrice * 0.9); // 10% de comisión
      sellerDoc.economy.totalEarned += Math.floor(toBuy.marketPrice * 0.9);

      // Transferir jugador
      sellerDoc.soccer.inventory = sellerDoc.soccer.inventory.filter(
        id => id.toString() !== toBuy._id.toString()
      );
      userDoc.soccer.inventory.push(toBuy._id);

      toBuy.ownerId    = userId;
      toBuy.isOnMarket = false;
      toBuy.marketPrice = null;
      await toBuy.save();
      await userDoc.save();
      await sellerDoc.save();

      // Notificar al vendedor si está online
      const seller = await client.users.fetch(sellerDoc.userId).catch(() => null);
      if (seller) {
        seller.send({
          embeds: [new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💰 ¡Jugador Vendido!')
            .setDescription(`Tu jugador **${toBuy.name}** fue comprado por **${interaction.user.username}** por **${Math.floor(toBuy.marketPrice * 0.9)} 🪙** (tras comisión del 10%).`)
            .setTimestamp()
          ],
        }).catch(() => {});
      }

      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ ¡Compra Exitosa!')
          .setDescription([
            `Compraste a **${toBuy.name}** (${toBuy.rarity} | ${toBuy.overall} OVR)`,
            `Pagaste: **${toBuy.marketPrice?.toLocaleString() || toBuy.price} 🪙**`,
            `Balance restante: **${userDoc.economy.coins.toLocaleString()} 🪙**`,
          ].join('\n'))
          .setTimestamp()
        ],
        ephemeral: false,
      });

      // Refrescar lista
      const refreshed = await Player.find({ guildId, isOnMarket: true }).sort({ rarity: 1, marketPrice: 1 });
      chunks.length = 0;
      chunkArray(refreshed, ITEMS_PER_PAGE).forEach(c => chunks.push(c));
      currentPage = 0;
    } else if (interaction.customId === 'mkt_filter' && interaction.isStringSelectMenu()) {
      const sel = interaction.values[0];
      const q2  = sel === 'all'
        ? { guildId, isOnMarket: true }
        : { guildId, isOnMarket: true, rarity: sel };
      const filtered = await Player.find(q2).sort({ rarity: 1, marketPrice: 1 });
      chunks.length = 0;
      chunkArray(filtered, ITEMS_PER_PAGE).forEach(c => chunks.push(c));
      currentPage = 0;
    }

    if (!chunks[currentPage]) currentPage = 0;

    await msg.edit({
      embeds: [await generatePageEmbed(currentPage)],
      components: [getNavRow(currentPage), filterRow],
    }).catch(() => {});
  });

  collector.on('end', () => {
    msg.edit({ components: [] }).catch(() => {});
  });
}
