/**
 * Comando: .daily — Recompensa diaria de monedas con rachas
 */

const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { COLORS } = require('../../utils/embeds');

const BASE_REWARD   = 500;
const STREAK_BONUS  = 50;   // +50 por día de racha
const MAX_STREAK    = 30;   // Máximo 30 días de racha

module.exports = {
  name: 'daily',
  aliases: ['diario', 'día', 'recompensa'],
  description: 'Reclama tu recompensa diaria de monedas',
  usage: '.daily',
  category: 'economy',
  guildOnly: true,
  cooldown: 0, // Manejado internamente

  async execute(message, args, client, config) {
    const userId  = message.author.id;
    const guildId = message.guild.id;

    const userDoc = await User.findOrCreate(userId, guildId);

    const now      = Date.now();
    const lastDaily = userDoc.economy.lastDaily
      ? new Date(userDoc.economy.lastDaily).getTime()
      : 0;

    const elapsed   = now - lastDaily;
    const cooldownMs = 24 * 60 * 60 * 1000; // 24 horas

    // ── Cooldown activo ────────────────────────────────────────────────────
    if (elapsed < cooldownMs) {
      const remaining  = cooldownMs - elapsed;
      const nextTime   = Math.floor((now + remaining) / 1000);

      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('⏳ Ya reclamaste tu daily')
          .setDescription([
            `Ya reclamaste tu recompensa diaria hoy.`,
            `\n**Próximo daily:** <t:${nextTime}:R>`,
          ].join('\n'))
          .setTimestamp()
        ],
      });
    }

    // ── Calcular racha ────────────────────────────────────────────────────
    let streak = userDoc.economy.streak || 0;
    const twoDays = 2 * 24 * 60 * 60 * 1000;

    // Si pasaron más de 2 días sin reclamar, resetear racha
    if (lastDaily > 0 && elapsed > twoDays) {
      streak = 0;
    }
    streak = Math.min(streak + 1, MAX_STREAK);

    // ── Calcular recompensa ───────────────────────────────────────────────
    const streakBonus = Math.floor(STREAK_BONUS * Math.min(streak - 1, MAX_STREAK - 1));
    const weekBonus   = streak >= 7 ? 250 : 0;
    const monthBonus  = streak >= 30 ? 1000 : 0;
    const totalReward = BASE_REWARD + streakBonus + weekBonus + monthBonus;

    // ── Actualizar usuario ────────────────────────────────────────────────
    userDoc.economy.coins     += totalReward;
    userDoc.economy.totalEarned += totalReward;
    userDoc.economy.lastDaily = new Date();
    userDoc.economy.streak    = streak;
    await userDoc.save();

    // ── Generar barra de racha ────────────────────────────────────────────
    const streakBar = generateStreakBar(streak);

    // ── Milestones ────────────────────────────────────────────────────────
    const milestones = [];
    if (streak === 7)  milestones.push('🏅 ¡7 días seguidos! +250 bonus');
    if (streak === 14) milestones.push('🥈 ¡14 días seguidos!');
    if (streak === 30) milestones.push('🏆 ¡30 días seguidos! +1000 bonus MÁXIMO');

    const embed = new EmbedBuilder()
      .setColor(COLORS.economy)
      .setTitle('🎁 ¡Daily Reclamado!')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setDescription([
        `¡Hola **${message.author.username}**! 🎉`,
        '',
        `**+${totalReward.toLocaleString()} 🪙** añadidas a tu billetera`,
        '',
        `💰 Balance actual: **${userDoc.economy.coins.toLocaleString()} 🪙**`,
        ...(milestones.length ? ['', ...milestones] : []),
      ].join('\n'))
      .addFields(
        {
          name: '🔥 Racha',
          value: [
            `**${streak} día${streak !== 1 ? 's' : ''}** consecutivo${streak !== 1 ? 's' : ''}`,
            streakBar,
          ].join('\n'),
          inline: true,
        },
        {
          name: '💎 Desglose',
          value: [
            `Base: **+${BASE_REWARD} 🪙**`,
            streakBonus > 0 ? `Racha (×${streak}): **+${streakBonus} 🪙**` : null,
            weekBonus > 0   ? `Bonus 7 días: **+${weekBonus} 🪙**` : null,
            monthBonus > 0  ? `Bonus 30 días: **+${monthBonus} 🪙**` : null,
          ].filter(Boolean).join('\n'),
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: `Regresa mañana para mantener tu racha • Máx. racha: ${MAX_STREAK} días` });

    await message.reply({ embeds: [embed] });
  },
};

function generateStreakBar(streak) {
  const max    = 7;  // Mostrar barra de 7 días
  const filled = Math.min(streak, max);
  const icons  = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣'];
  return icons.map((icon, i) => i < filled ? icon : '⬜').join('');
}
