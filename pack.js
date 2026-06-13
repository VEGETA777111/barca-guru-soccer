/**
 * Comando: .pack — Sistema de sobres de jugadores
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
const { getRandomPlayer } = require('../../data/players');
const { createPlayerEmbed, errorEmbed, COLORS } = require('../../utils/embeds');

const PACKS = {
  bronze: {
    label: '🥉 Pack Bronce',
    description: 'Jugadores Common y Rare garantizados',
    price: 1000,
    cards: 3,
    rarityBoost: { Common: 0.65, Rare: 0.30, Epic: 0.05, Legendary: 0, Mythic: 0 },
    color: 0xCD7F32,
  },
  silver: {
    label: '🥈 Pack Plata',
    description: 'Garantizado al menos 1 Epic',
    price: 3500,
    cards: 4,
    rarityBoost: { Common: 0.30, Rare: 0.38, Epic: 0.25, Legendary: 0.07, Mythic: 0 },
    guaranteedRarity: 'Epic',
    color: 0xC0C0C0,
  },
  gold: {
    label: '🥇 Pack Oro',
    description: 'Garantizado al menos 1 Legendary',
    price: 10000,
    cards: 5,
    rarityBoost: { Common: 0.10, Rare: 0.25, Epic: 0.35, Legendary: 0.25, Mythic: 0.05 },
    guaranteedRarity: 'Legendary',
    color: 0xFFD700,
  },
  mythic: {
    label: '🔴 Pack Mítico',
    description: 'Mythic garantizado — Muy raro',
    price: 40000,
    cards: 5,
    rarityBoost: { Common: 0, Rare: 0.05, Epic: 0.25, Legendary: 0.40, Mythic: 0.30 },
    guaranteedRarity: 'Mythic',
    color: 0xFF4500,
  },
};

module.exports = {
  name: 'pack',
  aliases: ['sobre', 'packs', 'abrir'],
  description: 'Abre sobres de jugadores',
  usage: '.pack [tipo]',
  category: 'soccer',
  guildOnly: true,
  cooldown: 5000,

  async execute(message, args, client, config) {
    const userId  = message.author.id;
    const guildId = message.guild.id;
    const userDoc = await User.findOrCreate(userId, guildId);

    // Sin argumentos → mostrar tienda de packs
    if (!args[0] || !PACKS[args[0].toLowerCase()]) {
      return showPackShop(message, userDoc);
    }

    const packKey  = args[0].toLowerCase();
    const packData = PACKS[packKey];

    if (userDoc.economy.coins < packData.price) {
      return message.reply({
        embeds: [errorEmbed(
          `No tienes suficientes monedas para este pack.\n💰 Tienes: **${userDoc.economy.coins.toLocaleString()} 🪙**\n💎 Necesitas: **${packData.price.toLocaleString()} 🪙**`
        )],
      });
    }

    // Confirmar compra
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('pack_confirm')
        .setLabel(`✅ Comprar (${packData.price.toLocaleString()} 🪙)`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('pack_cancel')
        .setLabel('❌ Cancelar')
        .setStyle(ButtonStyle.Secondary),
    );

    const confirmEmbed = new EmbedBuilder()
      .setColor(packData.color)
      .setTitle(`${packData.label}`)
      .setDescription([
        packData.description,
        '',
        `📦 **${packData.cards} jugadores** por pack`,
        `💰 **Precio:** ${packData.price.toLocaleString()} 🪙`,
        `💳 **Tu balance:** ${userDoc.economy.coins.toLocaleString()} 🪙`,
        packData.guaranteedRarity ? `\n✨ **Garantizado:** al menos 1 jugador ${packData.guaranteedRarity}` : '',
      ].join('\n'))
      .setTimestamp();

    const msg = await message.reply({ embeds: [confirmEmbed], components: [confirmRow] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
      filter: (i) => i.user.id === userId,
      max: 1,
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();

      if (interaction.customId === 'pack_cancel') {
        await msg.edit({
          embeds: [new EmbedBuilder().setColor(0xAAAAAA).setDescription('❌ Compra cancelada.')],
          components: [],
        });
        return;
      }

      // ── Ejecutar apertura del pack ────────────────────────────────────
      await msg.edit({
        embeds: [new EmbedBuilder()
          .setColor(packData.color)
          .setTitle('🎴 Abriendo sobre...')
          .setDescription('✨ Descubriendo tus jugadores...')
        ],
        components: [],
      });

      await new Promise(r => setTimeout(r, 2000)); // Suspense

      userDoc.economy.coins -= packData.price;

      const obtainedPlayers = [];
      let hasGuaranteed = false;

      for (let i = 0; i < packData.cards; i++) {
        let player;

        // Garantizar rareza en la última carta si es necesario
        if (!hasGuaranteed && packData.guaranteedRarity && i === packData.cards - 1) {
          player = getRandomPlayerWithRarity(packData.guaranteedRarity);
          hasGuaranteed = true;
        } else {
          player = getRandomPlayerWithBoost(packData.rarityBoost);
          if (player.rarity === packData.guaranteedRarity) hasGuaranteed = true;
        }

        const newPlayer = await Player.create({
          ...player,
          ownerId:   userId,
          guildId,
          claimedAt: new Date(),
          price:     player.price || 500,
        });

        userDoc.soccer.inventory.push(newPlayer._id);
        userDoc.soccer.totalClaims++;
        obtainedPlayers.push({ data: player, doc: newPlayer });
      }

      await userDoc.save();

      // ── Mostrar resultados ─────────────────────────────────────────────
      const rarityEmoji   = { Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴' };
      const playersSummary = obtainedPlayers.map((p, i) =>
        `${rarityEmoji[p.data.rarity]} **${p.data.name}** — \`${p.data.rarity}\` | OVR **${p.data.overall}** | ${p.data.position}`
      ).join('\n');

      const bestPlayer = obtainedPlayers.sort((a, b) => b.data.overall - a.data.overall)[0];

      const resultsEmbed = new EmbedBuilder()
        .setColor(packData.color)
        .setTitle(`🎉 ¡Pack Abierto! — ${packData.label}`)
        .setDescription([
          '**Tus nuevos jugadores:**',
          '',
          playersSummary,
          '',
          `⭐ **Mejor jugador:** ${rarityEmoji[bestPlayer.data.rarity]} ${bestPlayer.data.name} (${bestPlayer.data.overall} OVR)`,
          `💰 **Balance restante:** ${userDoc.economy.coins.toLocaleString()} 🪙`,
        ].join('\n'))
        .setTimestamp()
        .setFooter({ text: 'Usa .inventory para ver tu colección completa' });

      await msg.edit({ embeds: [resultsEmbed], components: [] });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        msg.edit({ components: [] }).catch(() => {});
      }
    });
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function showPackShop(message, userDoc) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.economy)
    .setTitle('🛍️ Tienda de Sobres')
    .setDescription(`💰 **Tu balance:** ${userDoc.economy.coins.toLocaleString()} 🪙\n\nElige un sobre para abrir:`)
    .addFields(
      Object.entries(PACKS).map(([key, p]) => ({
        name: p.label,
        value: [
          p.description,
          `📦 ${p.cards} cartas | 💰 **${p.price.toLocaleString()} 🪙**`,
          p.guaranteedRarity ? `✨ Garantiza: \`${p.guaranteedRarity}\`` : '',
          `\`\`.pack ${key}\`\``,
        ].filter(Boolean).join('\n'),
        inline: true,
      }))
    )
    .setTimestamp()
    .setFooter({ text: 'Usa .daily para ganar monedas gratis cada día' });

  await message.reply({ embeds: [embed] });
}

function getRandomPlayerWithBoost(rarityBoost) {
  const { getRandomPlayer, PLAYERS_DATA } = require('../../data/players');
  const roll = Math.random();
  let cumulative = 0;
  let rarity = 'Common';

  for (const [r, rate] of Object.entries(rarityBoost)) {
    if (rate <= 0) continue;
    cumulative += rate;
    if (roll < cumulative) { rarity = r; break; }
  }

  const pool = PLAYERS_DATA.filter(p => p.rarity === rarity);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : getRandomPlayer();
}

function getRandomPlayerWithRarity(rarity) {
  const { PLAYERS_DATA } = require('../../data/players');
  const pool = PLAYERS_DATA.filter(p => p.rarity === rarity);
  if (!pool.length) {
    const { getRandomPlayer } = require('../../data/players');
    return getRandomPlayer();
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
