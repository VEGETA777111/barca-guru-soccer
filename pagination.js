/**
 * Pagination — Sistema de paginación con botones para embeds
 */

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

/**
 * Crea un mensaje con paginación usando botones
 * @param {Message} message - Mensaje original
 * @param {EmbedBuilder[]} pages - Array de embeds (páginas)
 * @param {Object} options - Opciones
 */
async function paginate(message, pages, options = {}) {
  if (!pages || pages.length === 0) return;

  if (pages.length === 1) {
    return message.reply({ embeds: [pages[0]] });
  }

  const {
    timeout    = 60000,
    startPage  = 0,
    showCount  = true,
  } = options;

  let currentPage = startPage;

  const getRow = (page) => new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('first')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId('prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId('page_indicator')
      .setLabel(`${page + 1} / ${pages.length}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId('next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === pages.length - 1),

    new ButtonBuilder()
      .setCustomId('last')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === pages.length - 1),
  );

  // Añadir número de página al footer si showCount está activo
  if (showCount) {
    pages = pages.map((embed, i) => {
      const data = embed.toJSON();
      const currentFooter = data.footer?.text || '';
      embed.setFooter({
        text: currentFooter
          ? `${currentFooter} • Página ${i + 1}/${pages.length}`
          : `Página ${i + 1}/${pages.length}`,
        iconURL: data.footer?.icon_url,
      });
      return embed;
    });
  }

  const reply = await message.reply({
    embeds: [pages[currentPage]],
    components: [getRow(currentPage)],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout,
    filter: (interaction) => interaction.user.id === message.author.id,
  });

  collector.on('collect', async (interaction) => {
    switch (interaction.customId) {
      case 'first': currentPage = 0; break;
      case 'prev':  currentPage = Math.max(0, currentPage - 1); break;
      case 'next':  currentPage = Math.min(pages.length - 1, currentPage + 1); break;
      case 'last':  currentPage = pages.length - 1; break;
    }

    await interaction.update({
      embeds: [pages[currentPage]],
      components: [getRow(currentPage)],
    });
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      getRow(currentPage).components.map(b =>
        ButtonBuilder.from(b.data).setDisabled(true)
      )
    );

    await reply.edit({ components: [disabledRow] }).catch(() => {});
  });

  return reply;
}

/**
 * Divide un array en páginas de N elementos
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

module.exports = { paginate, chunkArray };
