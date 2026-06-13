/**
 * Embeds — Constructores de embeds centralizados y modernos
 */

const { EmbedBuilder } = require('discord.js');

// ── Paleta de colores ────────────────────────────────────────────────────────
const COLORS = {
  primary:  0x5865F2, // Discord Blurple
  success:  0x57F287, // Verde
  error:    0xED4245, // Rojo
  warning:  0xFEE75C, // Amarillo
  info:     0x5865F2, // Azul
  security: 0xFF4444, // Rojo fuerte
  mod:      0xFF8C00, // Naranja
  economy:  0xFFD700, // Dorado
  soccer:   0x00B0F4, // Azul claro

  // Rarezas Soccer Guru
  common:    0xAAAAAA, // Gris
  rare:      0x4169E1, // Azul real
  epic:      0x9B59B6, // Morado
  legendary: 0xF1C40F, // Dorado
  mythic:    0xFF4500, // Rojo-naranja
};

// ── Embed base ────────────────────────────────────────────────────────────────
function baseEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || COLORS.primary)
    .setTimestamp();

  if (options.title)       embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.thumbnail)   embed.setThumbnail(options.thumbnail);
  if (options.image)       embed.setImage(options.image);
  if (options.footer)      embed.setFooter({ text: options.footer, iconURL: options.footerIcon });
  if (options.author)      embed.setAuthor({ name: options.author, iconURL: options.authorIcon });
  if (options.fields)      embed.addFields(options.fields);
  if (options.url)         embed.setURL(options.url);

  return embed;
}

// ── Embeds de moderación ──────────────────────────────────────────────────────
function createModEmbed({ action, target, moderator, reason, duration, extra = [] }) {
  const icons = {
    ban:  '🔨', kick: '👢', mute: '🔇', warn: '⚠️',
    unmute: '🔊', unban: '✅', lock: '🔒', unlock: '🔓',
  };

  const fields = [
    { name: '👤 Usuario', value: `${target.tag || target}\n\`${target.id || target}\``, inline: true },
    { name: '🛡️ Moderador', value: `${moderator.tag}\n\`${moderator.id}\``, inline: true },
    { name: '📝 Razón', value: reason || 'Sin razón especificada', inline: false },
  ];

  if (duration) fields.push({ name: '⏱️ Duración', value: duration, inline: true });
  if (extra.length) fields.push(...extra);

  return new EmbedBuilder()
    .setColor(COLORS.mod)
    .setTitle(`${icons[action] || '⚡'} ${action.charAt(0).toUpperCase() + action.slice(1)}`)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: `RB3 Security • Moderación` });
}

// ── Embeds de seguridad ────────────────────────────────────────────────────────
function createSecurityEmbed({ title, description, color, fields = [] }) {
  return new EmbedBuilder()
    .setColor(color || COLORS.security)
    .setTitle(title)
    .setDescription(description)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: '🛡️ RB3 Security System' });
}

// ── Embeds de Soccer Guru ─────────────────────────────────────────────────────
function createPlayerEmbed(player, user) {
  const rarityColors = {
    Common:    COLORS.common,
    Rare:      COLORS.rare,
    Epic:      COLORS.epic,
    Legendary: COLORS.legendary,
    Mythic:    COLORS.mythic,
  };

  const rarityEmojis = {
    Common:    '⚪',
    Rare:      '🔵',
    Epic:      '🟣',
    Legendary: '🟡',
    Mythic:    '🔴',
  };

  const stars = getStars(player.overall);

  return new EmbedBuilder()
    .setColor(rarityColors[player.rarity] || COLORS.primary)
    .setTitle(`${rarityEmojis[player.rarity]} ${player.name}`)
    .setDescription(`*"${player.description}"*`)
    .setThumbnail(player.imageUrl || 'https://i.imgur.com/placeholder.png')
    .addFields(
      { name: '🏆 Overall', value: `\`${player.overall}\` ${stars}`, inline: true },
      { name: '⭐ Rareza', value: `\`${player.rarity}\``, inline: true },
      { name: '🏃 Posición', value: `\`${player.position}\``, inline: true },
      { name: '⚽ Nación', value: `\`${player.nationality}\``, inline: true },
      { name: '🏟️ Club', value: `\`${player.club}\``, inline: true },
      { name: '🦶 Pie', value: `\`${player.foot}\``, inline: true },
      {
        name: '📊 Estadísticas',
        value: [
          `\`PAC\` **${player.stats.pace}**   \`SHO\` **${player.stats.shooting}**`,
          `\`PAS\` **${player.stats.passing}**   \`DRI\` **${player.stats.dribbling}**`,
          `\`DEF\` **${player.stats.defense}**   \`PHY\` **${player.stats.physical}**`,
        ].join('\n'),
        inline: false,
      }
    )
    .setFooter({
      text: user ? `Reclamado por ${user.tag}` : 'Soccer Guru • RB3 Bot',
      iconURL: user?.displayAvatarURL() || null,
    })
    .setTimestamp();
}

// ── Embeds de economía ────────────────────────────────────────────────────────
function createEconomyEmbed({ title, description, color, fields = [], footer }) {
  return new EmbedBuilder()
    .setColor(color || COLORS.economy)
    .setTitle(title)
    .setDescription(description)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: footer || '💰 RB3 Economy System' });
}

// ── Embeds de error / success ────────────────────────────────────────────────
function errorEmbed(description, title = '❌ Error') {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function successEmbed(description, title = '✅ Éxito') {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function infoEmbed(description, title = 'ℹ️ Información') {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

// ── Helper: estrellas por overall ─────────────────────────────────────────────
function getStars(overall) {
  if (overall >= 95) return '⭐⭐⭐⭐⭐';
  if (overall >= 88) return '⭐⭐⭐⭐';
  if (overall >= 80) return '⭐⭐⭐';
  if (overall >= 70) return '⭐⭐';
  return '⭐';
}

module.exports = {
  COLORS,
  baseEmbed,
  createModEmbed,
  createSecurityEmbed,
  createPlayerEmbed,
  createEconomyEmbed,
  errorEmbed,
  successEmbed,
  infoEmbed,
  getStars,
};
