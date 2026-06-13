/**
 * Comando: .profile — Perfil completo del usuario
 */

const { EmbedBuilder } = require('discord.js');
const User   = require('../../models/User');
const Player = require('../../models/Player');
const { COLORS, getStars } = require('../../utils/embeds');

const RARITY_EMOJI = {
  Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴',
};

module.exports = {
  name: 'profile',
  aliases: ['perfil', 'stats', 'me'],
  description: 'Ver el perfil completo de un usuario',
  usage: '.profile [@usuario]',
  category: 'soccer',
  guildOnly: true,
  cooldown: 5000,

  async execute(message, args, client, config) {
    const target  = message.mentions.users.first() || message.author;
    const guildId = message.guild.id;

    const targetMember = message.guild.members.cache.get(target.id);
    if (!targetMember && target.id !== message.author.id) {
      return message.reply({ embeds: [{ color: 0xED4245, description: '❌ No encontré a ese usuario en el servidor.' }] });
    }

    const loadMsg = await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.primary)
        .setDescription(`⏳ Cargando perfil de **${target.username}**...`)
      ],
    });

    const userDoc = await User.findOrCreate(target.id, guildId);

    // Estadísticas de inventario
    const players = await Player.find({
      _id: { $in: userDoc.soccer.inventory },
      guildId,
    });

    const inventoryStats = {
      total:     players.length,
      mythic:    players.filter(p => p.rarity === 'Mythic').length,
      legendary: players.filter(p => p.rarity === 'Legendary').length,
      epic:      players.filter(p => p.rarity === 'Epic').length,
      rare:      players.filter(p => p.rarity === 'Rare').length,
      common:    players.filter(p => p.rarity === 'Common').length,
      totalValue: players.reduce((sum, p) => sum + Math.floor(p.price * 0.6), 0),
    };

    // Jugador favorito
    let favPlayer = null;
    if (userDoc.soccer.favoriteId) {
      favPlayer = await Player.findById(userDoc.soccer.favoriteId);
    }
    if (!favPlayer && players.length) {
      favPlayer = players.sort((a, b) => b.overall - a.overall)[0];
    }

    // XP Progress bar
    const xpProgress = userDoc.getXPProgress();
    const barLength  = 15;
    const filled     = Math.floor((xpProgress.percentage / 100) * barLength);
    const bar        = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    // Ranking en el servidor
    const allUsers = await User.find({ guildId }).sort({ 'xp.total': -1 });
    const rank = allUsers.findIndex(u => u.userId === target.id) + 1;

    // Badges
    const badges = [];
    if (inventoryStats.mythic > 0)    badges.push('🔴 Colector Mítico');
    if (inventoryStats.legendary > 0) badges.push('🟡 Leyenda');
    if (userDoc.xp.level >= 10)       badges.push('⚡ Nivel 10+');
    if (userDoc.xp.level >= 25)       badges.push('💎 Nivel 25+');
    if (userDoc.soccer.totalClaims >= 50) badges.push('🎴 Coleccionista');
    if (userDoc.economy.totalEarned >= 100000) badges.push('💰 Millonario');

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`👤 Perfil de ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        // ── Nivel y XP ────────────────────────────────────────────────────
        {
          name: `⚡ Nivel ${userDoc.xp.level} ${getStars(userDoc.xp.level * 5)}`,
          value: [
            `\`[${bar}]\` ${xpProgress.percentage}%`,
            `${xpProgress.current.toLocaleString()} / ${xpProgress.needed.toLocaleString()} XP`,
            `XP Total: **${userDoc.xp.total.toLocaleString()}**`,
            `🏆 Rank del servidor: **#${rank}**`,
          ].join('\n'),
          inline: false,
        },

        // ── Economía ──────────────────────────────────────────────────────
        {
          name: '💰 Economía',
          value: [
            `🪙 Monedas: **${userDoc.economy.coins.toLocaleString()}**`,
            `🏦 Banco: **${userDoc.economy.bank.toLocaleString()}**`,
            `📈 Total ganado: **${userDoc.economy.totalEarned.toLocaleString()}**`,
          ].join('\n'),
          inline: true,
        },

        // ── Soccer Stats ──────────────────────────────────────────────────
        {
          name: '⚽ Soccer Guru',
          value: [
            `🎴 Claims: **${userDoc.soccer.totalClaims}**`,
            `🔄 Trades: **${userDoc.soccer.trades}**`,
            `📦 Colección: **${inventoryStats.total} jugadores**`,
            `💎 Valor: **${inventoryStats.totalValue.toLocaleString()} 🪙**`,
          ].join('\n'),
          inline: true,
        },

        // ── Colección breakdown ───────────────────────────────────────────
        {
          name: '🃏 Desglose de cartas',
          value: [
            `🔴 Mythic: **${inventoryStats.mythic}**   🟡 Legendary: **${inventoryStats.legendary}**`,
            `🟣 Epic: **${inventoryStats.epic}**       🔵 Rare: **${inventoryStats.rare}**`,
            `⚪ Common: **${inventoryStats.common}**`,
          ].join('\n'),
          inline: false,
        },
      );

    // ── Jugador destacado ─────────────────────────────────────────────────
    if (favPlayer) {
      embed.addFields({
        name: `${RARITY_EMOJI[favPlayer.rarity]} Jugador Destacado`,
        value: [
          `**${favPlayer.name}**`,
          `\`${favPlayer.rarity}\` | OVR **${favPlayer.overall}** | ${favPlayer.position}`,
          `${favPlayer.nationality} • ${favPlayer.club}`,
        ].join('\n'),
        inline: true,
      });
    }

    // ── Advertencias ─────────────────────────────────────────────────────
    if (userDoc.warnings.length) {
      embed.addFields({
        name: '⚠️ Advertencias',
        value: `**${userDoc.warnings.length}** advertencias registradas`,
        inline: true,
      });
    }

    // ── Badges ───────────────────────────────────────────────────────────
    if (badges.length) {
      embed.addFields({
        name: '🏅 Logros',
        value: badges.join(' | '),
        inline: false,
      });
    }

    // ── Bio ───────────────────────────────────────────────────────────────
    if (userDoc.profile.bio) {
      embed.setDescription(`*"${userDoc.profile.bio}"*`);
    }

    embed
      .setFooter({
        text: `ID: ${target.id} • ${message.guild.name}`,
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    await loadMsg.edit({ embeds: [embed] });
  },
};
