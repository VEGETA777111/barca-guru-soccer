/**
 * Comando: .ranking — Rankings globales del servidor
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');
const User   = require('../../models/User');
const Player = require('../../models/Player');
const { COLORS } = require('../../utils/embeds');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  name: 'ranking',
  aliases: ['rank', 'top', 'leaderboard', 'lb'],
  description: 'Rankings globales del servidor',
  usage: '.ranking [tipo]',
  category: 'soccer',
  guildOnly: true,
  cooldown: 10000,

  async execute(message, args, client, config) {
    const guildId = message.guild.id;

    const loadMsg = await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.soccer)
        .setDescription('⏳ Cargando rankings...')
      ],
    });

    // Por defecto mostrar ranking de XP
    const defaultType = args[0]?.toLowerCase() || 'xp';
    const embed = await buildRankingEmbed(defaultType, guildId, client, message.guild);

    const select = new StringSelectMenuBuilder()
      .setCustomId('ranking_type')
      .setPlaceholder('Cambiar tipo de ranking...')
      .addOptions([
        { label: '⚡ XP / Nivel',    value: 'xp',      emoji: '⚡', description: 'Los más activos del servidor' },
        { label: '💰 Monedas',       value: 'coins',   emoji: '💰', description: 'Los más ricos' },
        { label: '📦 Colección',     value: 'cards',   emoji: '📦', description: 'Más jugadores en inventario' },
        { label: '🏆 Overall',       value: 'overall', emoji: '🏆', description: 'Por el mejor jugador en posesión' },
        { label: '🔴 Cartas Mythic', value: 'mythic',  emoji: '🔴', description: 'Más cartas míticas' },
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    await loadMsg.edit({ embeds: [embed], components: [row] });

    const collector = loadMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();
      const type   = interaction.values[0];
      const newEmbed = await buildRankingEmbed(type, guildId, client, message.guild);
      await loadMsg.edit({ embeds: [newEmbed], components: [row] });
    });

    collector.on('end', () => {
      loadMsg.edit({ components: [] }).catch(() => {});
    });
  },
};

async function buildRankingEmbed(type, guildId, client, guild) {
  const titles = {
    xp:      '⚡ Ranking de XP',
    coins:   '💰 Ranking de Monedas',
    cards:   '📦 Ranking de Colección',
    overall: '🏆 Ranking de Overall',
    mythic:  '🔴 Ranking de Mythics',
  };

  let entries = [];

  switch (type) {
    case 'xp': {
      const users = await User.find({ guildId }).sort({ 'xp.total': -1 }).limit(10);
      entries = await Promise.all(users.map(async (u, i) => {
        const member = await client.users.fetch(u.userId).catch(() => null);
        const name   = member?.username || `Usuario (${u.userId.slice(-4)})`;
        const medal  = MEDALS[i] || `\`#${i + 1}\``;
        return `${medal} **${name}** — Nivel **${u.xp.level}** | ${u.xp.total.toLocaleString()} XP`;
      }));
      break;
    }

    case 'coins': {
      const users = await User.find({ guildId }).sort({ 'economy.coins': -1 }).limit(10);
      entries = await Promise.all(users.map(async (u, i) => {
        const member = await client.users.fetch(u.userId).catch(() => null);
        const name   = member?.username || `Usuario (${u.userId.slice(-4)})`;
        const medal  = MEDALS[i] || `\`#${i + 1}\``;
        return `${medal} **${name}** — **${u.economy.coins.toLocaleString()} 🪙**`;
      }));
      break;
    }

    case 'cards': {
      const users = await User.find({ guildId }).sort({ 'soccer.totalClaims': -1 }).limit(10);
      entries = await Promise.all(users.map(async (u, i) => {
        const member = await client.users.fetch(u.userId).catch(() => null);
        const name   = member?.username || `Usuario (${u.userId.slice(-4)})`;
        const medal  = MEDALS[i] || `\`#${i + 1}\``;
        const count  = u.soccer.inventory.length;
        return `${medal} **${name}** — **${count} jugadores** | ${u.soccer.totalClaims} claims`;
      }));
      break;
    }

    case 'overall': {
      // Jugador con mayor overall por usuario
      const players = await Player.aggregate([
        { $match: { guildId, ownerId: { $ne: null } } },
        { $sort: { overall: -1 } },
        { $group: { _id: '$ownerId', best: { $first: '$$ROOT' } } },
        { $sort: { 'best.overall': -1 } },
        { $limit: 10 },
      ]);

      entries = await Promise.all(players.map(async (p, i) => {
        const member = await client.users.fetch(p._id).catch(() => null);
        const name   = member?.username || `Usuario (${p._id.slice(-4)})`;
        const medal  = MEDALS[i] || `\`#${i + 1}\``;
        const rarityEmoji = { Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴' };
        return `${medal} **${name}** — ${rarityEmoji[p.best.rarity]} **${p.best.name}** (${p.best.overall} OVR)`;
      }));
      break;
    }

    case 'mythic': {
      const pipeline = await Player.aggregate([
        { $match: { guildId, rarity: 'Mythic', ownerId: { $ne: null } } },
        { $group: { _id: '$ownerId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      entries = await Promise.all(pipeline.map(async (p, i) => {
        const member = await client.users.fetch(p._id).catch(() => null);
        const name   = member?.username || `Usuario (${p._id.slice(-4)})`;
        const medal  = MEDALS[i] || `\`#${i + 1}\``;
        return `${medal} **${name}** — **${p.count} 🔴 Mythic${p.count !== 1 ? 's' : ''}**`;
      }));
      break;
    }
  }

  if (!entries.length) {
    entries = ['*Sin datos todavía. ¡Sé el primero!*'];
  }

  return new EmbedBuilder()
    .setColor(COLORS.soccer)
    .setTitle(titles[type] || '🏆 Ranking')
    .setDescription(entries.join('\n\n') || '*Sin datos*')
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setTimestamp()
    .setFooter({ text: `${guild.name} • Top 10` });
}
