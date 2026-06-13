/**
 * Comando: .balance — Ver balance de monedas
 */

const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  name: 'balance',
  aliases: ['bal', 'monedas', 'coins', 'wallet'],
  description: 'Ver tu balance de monedas',
  usage: '.balance [@usuario]',
  category: 'economy',
  guildOnly: true,
  cooldown: 3000,

  async execute(message, args, client, config) {
    const target  = message.mentions.users.first() || message.author;
    const guildId = message.guild.id;

    const userDoc = await User.findOrCreate(target.id, guildId);

    // Ranking de riqueza en el servidor
    const allUsers  = await User.find({ guildId }).sort({ 'economy.coins': -1 });
    const walletRank = allUsers.findIndex(u => u.userId === target.id) + 1;

    const total = userDoc.economy.coins + userDoc.economy.bank;

    const embed = new EmbedBuilder()
      .setColor(COLORS.economy)
      .setTitle(`💰 Balance de ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '👛 Billetera',
          value: `**${userDoc.economy.coins.toLocaleString()}** 🪙`,
          inline: true,
        },
        {
          name: '🏦 Banco',
          value: `**${userDoc.economy.bank.toLocaleString()}** 🪙`,
          inline: true,
        },
        {
          name: '💎 Total',
          value: `**${total.toLocaleString()}** 🪙`,
          inline: true,
        },
        {
          name: '📈 Estadísticas',
          value: [
            `Total ganado históricamente: **${userDoc.economy.totalEarned.toLocaleString()} 🪙**`,
            `Ranking en el servidor: **#${walletRank}**`,
          ].join('\n'),
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'RB3 Economy • Usa .daily para ganar monedas' });

    await message.reply({ embeds: [embed] });
  },
};
