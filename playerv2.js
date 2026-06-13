/**
 * Comando: .player — Ver detalles de un jugador específico
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
const { createPlayerEmbed, errorEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
  name: 'player',
  aliases: ['jugador', 'card', 'carta'],
  description: 'Ver los detalles de un jugador en tu colección',
  usage: '.player <nombre del jugador>',
  category: 'soccer',
  guildOnly: true,
  cooldown: 3000,

  async execute(message, args, client, config) {
    if (!args.length) {
      return message.reply({
        embeds: [errorEmbed(
          '**Uso:** `.player <nombre del jugador>`\n**Ejemplo:** `.player Zael Vortex`'
        )],
      });
    }

    const userId  = message.author.id;
    const guildId = message.guild.id;
    const name    = args.join(' ');

    // Buscar en la colección del usuario
    const userDoc = await User.findOrCreate(userId, guildId);

    // Buscar jugador por nombre en el inventario del usuario
    const player = await Player.findOne({
      guildId,
      ownerId: userId,
      name: { $regex: new RegExp(name, 'i') },
    });

    if (!player) {
      // Buscar en todo el servidor (para ver cartas de otros)
      const anyPlayer = await Player.findOne({
        guildId,
        name: { $regex: new RegExp(name, 'i') },
      });

      if (!anyPlayer) {
        return message.reply({
          embeds: [errorEmbed(
            `No encontré ningún jugador llamado **"${name}"** en tu colección.\n\nUsa \`.inventory\` para ver tus jugadores.`
          )],
        });
      }

      // Mostrar jugador de otro usuario
      const owner = await client.users.fetch(anyPlayer.ownerId).catch(() => null);
      const embed = createPlayerEmbed(anyPlayer, owner);
      embed.setFooter({
        text: `Propietario: ${owner?.tag || 'Desconocido'} • No es tuyo`,
        iconURL: owner?.displayAvatarURL() || null,
      });

      return message.reply({ embeds: [embed] });
    }

    // Es del usuario — mostrar con opciones
    const isFavorite = userDoc.soccer.favoriteId?.toString() === player._id.toString();
    const sellPrice  = Math.floor(player.price * 0.6);

    const embed = createPlayerEmbed(player, message.author);

    if (isFavorite) {
      embed.setTitle(`⭐ ${embed.data.title}`);
    }

    // Info adicional
    embed.addFields(
      { name: '📅 Reclamado', value: `<t:${Math.floor(new Date(player.claimedAt || player.createdAt).getTime() / 1000)}:R>`, inline: true },
      { name: '💰 Valor de venta', value: `${sellPrice} 🪙`, inline: true },
      { name: '🛒 En mercado', value: player.isOnMarket ? `Sí — ${player.marketPrice} 🪙` : 'No', inline: true },
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`fav_toggle-${player._id}`)
        .setLabel(isFavorite ? '💔 Quitar favorito' : '⭐ Hacer favorito')
        .setStyle(isFavorite ? ButtonStyle.Secondary : ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`sell_player-${player._id}`)
        .setLabel(`💰 Vender (${sellPrice} 🪙)`)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(player.isOnMarket),

      new ButtonBuilder()
        .setCustomId(`market_list-${player._id}`)
        .setLabel(player.isOnMarket ? '❌ Retirar del mercado' : '🛒 Poner en mercado')
        .setStyle(player.isOnMarket ? ButtonStyle.Secondary : ButtonStyle.Success),
    );

    const msg = await message.reply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 45000,
      filter: (i) => i.user.id === userId,
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();

      if (interaction.customId.startsWith('fav_toggle-')) {
        if (isFavorite) {
          userDoc.soccer.favoriteId = null;
        } else {
          userDoc.soccer.favoriteId = player._id;
        }
        await userDoc.save();
        await interaction.followUp({
          content: isFavorite
            ? `💔 **${player.name}** removido de favoritos.`
            : `⭐ **${player.name}** es ahora tu jugador favorito.`,
          ephemeral: true,
        });
        collector.stop();
      }

      else if (interaction.customId.startsWith('sell_player-')) {
        // Confirmación de venta
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_sell')
            .setLabel(`✅ Confirmar venta (${sellPrice} 🪙)`)
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_sell')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Secondary),
        );

        await msg.edit({
          embeds: [new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('⚠️ Confirmar Venta')
            .setDescription(`¿Estás seguro de vender a **${player.name}** por **${sellPrice} 🪙**?\n\nEsta acción no se puede deshacer.`)
          ],
          components: [confirmRow],
        });

        const confirmCollector = msg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 15000,
          filter: (i) => i.user.id === userId,
          max: 1,
        });

        confirmCollector.on('collect', async (ci) => {
          await ci.deferUpdate();
          if (ci.customId === 'confirm_sell') {
            await Player.deleteOne({ _id: player._id });
            userDoc.soccer.inventory = userDoc.soccer.inventory.filter(
              id => id.toString() !== player._id.toString()
            );
            if (userDoc.soccer.favoriteId?.toString() === player._id.toString()) {
              userDoc.soccer.favoriteId = null;
            }
            userDoc.economy.coins += sellPrice;
            await userDoc.save();

            await msg.edit({
              embeds: [new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('💰 Jugador Vendido')
                .setDescription(`Vendiste a **${player.name}** por **${sellPrice} 🪙**\n\nBalance actual: **${userDoc.economy.coins} 🪙**`)
                .setTimestamp()
              ],
              components: [],
            });
          } else {
            await msg.edit({ embeds: [embed], components: [row] });
          }
        });
      }

      else if (interaction.customId.startsWith('market_list-')) {
        if (player.isOnMarket) {
          player.isOnMarket   = false;
          player.marketPrice  = null;
          await player.save();
          await interaction.followUp({ content: `🛒 **${player.name}** retirado del mercado.`, ephemeral: true });
        } else {
          // Pedir precio
          await interaction.followUp({
            content: '💬 Responde con el **precio** al que quieres vender el jugador (en monedas):',
            ephemeral: false,
          });

          const filter = m => m.author.id === userId && !isNaN(m.content);
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => null);

          if (!collected?.size) {
            return interaction.followUp({ content: '⏳ Tiempo agotado. No se publicó en el mercado.', ephemeral: true });
          }

          const price = parseInt(collected.first().content);
          if (price < 1) return;

          player.isOnMarket  = true;
          player.marketPrice = price;
          await player.save();

          await collected.first().delete().catch(() => {});
          await interaction.followUp({
            content: `✅ **${player.name}** publicado en el mercado por **${price} 🪙**`,
            ephemeral: true,
          });
        }
        collector.stop();
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
