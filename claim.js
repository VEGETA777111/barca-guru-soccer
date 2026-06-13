/**
 * Comando: .claim — Reclamar jugador aleatorio
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const Player = require('../../models/Player');
const User = require('../../models/User');
const GuildConfig = require('../../models/GuildConfig');
const { getRandomPlayer } = require('../../data/players');
const { createPlayerEmbed, COLORS } = require('../../utils/embeds');
const ms = require('ms');

const DEFAULT_COOLDOWN = 3600000; // 1 hora

module.exports = {
  name: 'claim',
  aliases: ['reclamar', 'c'],
  description: 'Reclama un jugador aleatorio para tu colección',
  usage: '.claim',
  category: 'soccer',
  guildOnly: true,
  cooldown: 0, // Manejado internamente

  async execute(message, args, client, config) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    // Cargar usuario
    const userDoc = await User.findOrCreate(userId, guildId);

    // ── Verificar cooldown ────────────────────────────────────────────────
    const cooldownMs = config?.soccer?.claimIntervalMs || DEFAULT_COOLDOWN;
    const lastClaim = userDoc.soccer.lastClaim;

    if (lastClaim) {
      const elapsed = Date.now() - new Date(lastClaim).getTime();
      const remaining = cooldownMs - elapsed;

      if (remaining > 0) {
        const nextClaim = Math.floor((Date.now() + remaining) / 1000);
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⏳ Cooldown Activo')
            .setDescription(`Ya reclamaste un jugador recientemente.\n\n**Próximo claim:** <t:${nextClaim}:R>`)
            .setTimestamp()
          ],
        });
      }
    }

    // ── Generar jugador aleatorio ─────────────────────────────────────────
    const playerData = getRandomPlayer();
    if (!playerData) {
      return message.reply({ embeds: [{ color: 0xED4245, description: '❌ Error al generar jugador.' }] });
    }

    // ── Mensaje de suspense ───────────────────────────────────────────────
    const rarityColors = {
      Common: 0xAAAAAA, Rare: 0x4169E1, Epic: 0x9B59B6, Legendary: 0xF1C40F, Mythic: 0xFF4500,
    };

    const suspenseEmbed = new EmbedBuilder()
      .setColor(rarityColors[playerData.rarity])
      .setTitle('🎴 ¡Carta en camino!')
      .setDescription([
        '**Preparando tu carta...**',
        '',
        `Rareza detectada: ${'█'.repeat(10)}`,
        '⏳ Descubriendo jugador...',
      ].join('\n'))
      .setTimestamp();

    const suspenseMsg = await message.reply({ embeds: [suspenseEmbed] });
    await new Promise(r => setTimeout(r, 1500)); // Drama artificial 😄

    // ── Crear jugador en DB ───────────────────────────────────────────────
    const newPlayer = await Player.create({
      ...playerData,
      ownerId:   userId,
      guildId,
      claimedAt: new Date(),
      price:     playerData.price || 500,
    });

    // Actualizar usuario
    userDoc.soccer.inventory.push(newPlayer._id);
    userDoc.soccer.lastClaim   = new Date();
    userDoc.soccer.totalClaims += 1;
    userDoc.economy.coins      += Math.floor(newPlayer.price * 0.1); // 10% del valor en monedas
    await userDoc.save();

    // ── Embed final ───────────────────────────────────────────────────────
    const rarityEmojis = {
      Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴',
    };
    const rarityBanner = {
      Common:    '[ ⚪ COMMON ]',
      Rare:      '[ 🔵 R A R E ]',
      Epic:      '[ 🟣 E P I C ]',
      Legendary: '[ 🟡 L E G E N D A R Y ]',
      Mythic:    '[ 🔴 ★ M Y T H I C ★ ]',
    };

    const embed = createPlayerEmbed(playerData, message.author);
    embed.setTitle(`${rarityEmojis[playerData.rarity]} ¡Nuevo Fichaje! — ${playerData.name}`);
    embed.setDescription([
      rarityBanner[playerData.rarity],
      `*"${playerData.description}"*`,
      '',
      `💰 Bonus de monedas: **+${Math.floor(newPlayer.price * 0.1)}**`,
    ].join('\n'));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`set_fav-${newPlayer._id}`)
        .setLabel('⭐ Favorito')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`sell_quick-${newPlayer._id}`)
        .setLabel(`💰 Vender (${Math.floor(newPlayer.price * 0.5)} 🪙)`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('view_inventory')
        .setLabel('📦 Ver Inventario')
        .setStyle(ButtonStyle.Secondary),
    );

    await suspenseMsg.edit({ embeds: [embed], components: [row] });

    // ── Collector para botones ────────────────────────────────────────────
    const collector = suspenseMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
      filter: (i) => i.user.id === userId,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId.startsWith('set_fav-')) {
        userDoc.soccer.favoriteId = newPlayer._id;
        await userDoc.save();
        await interaction.reply({ content: `⭐ **${playerData.name}** establecido como favorito.`, ephemeral: true });
      }

      else if (interaction.customId.startsWith('sell_quick-')) {
        const sellPrice = Math.floor(newPlayer.price * 0.5);
        await Player.deleteOne({ _id: newPlayer._id });
        userDoc.soccer.inventory = userDoc.soccer.inventory.filter(
          id => id.toString() !== newPlayer._id.toString()
        );
        userDoc.economy.coins += sellPrice;
        await userDoc.save();

        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFFD700)
            .setDescription(`💰 Vendiste a **${playerData.name}** por **${sellPrice} 🪙**`)
          ],
          ephemeral: true,
        });
      }

      else if (interaction.customId === 'view_inventory') {
        await interaction.reply({
          content: `Usa \`.inventory\` para ver tu colección completa.`,
          ephemeral: true,
        });
      }
    });

    collector.on('end', () => {
      suspenseMsg.edit({ components: [] }).catch(() => {});
    });
  },
};
