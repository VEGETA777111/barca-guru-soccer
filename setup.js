/**
 * Comando: .setup — Configuración del servidor
 */

const {
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'setup',
  aliases: ['configurar', 'config'],
  description: 'Configura el bot para tu servidor',
  usage: '.setup [módulo]',
  category: 'moderation',
  guildOnly: true,
  cooldown: 5000,

  async execute(message, args, client, config) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [errorEmbed('Necesitas ser **Administrador** para configurar el bot.')] });
    }

    // Crear/cargar configuración
    let guildConfig = config || await GuildConfig.findOneAndUpdate(
      { guildId: message.guild.id },
      { $setOnInsert: { guildId: message.guild.id } },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚙️ Panel de Configuración — RB3 Bot')
      .setDescription('Selecciona un módulo para configurar desde el menú de abajo.')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        {
          name: '📋 Estado actual',
          value: [
            `🛡️ Anti-Spam: ${guildConfig.antiSpam?.enabled ? '✅' : '❌'}`,
            `🔗 Anti-Links: ${guildConfig.antiLinks?.enabled ? '✅' : '❌'}`,
            `🚨 Anti-Raid: ${guildConfig.antiRaid?.enabled ? '✅' : '❌'}`,
            `☢️ Anti-Nuke: ${guildConfig.antiNuke?.enabled ? '✅' : '❌'}`,
            `🎫 Tickets: ${guildConfig.tickets?.enabled ? '✅' : '❌'}`,
            `✅ Verificación: ${guildConfig.verification?.enabled ? '✅' : '❌'}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '📢 Logs configurados',
          value: [
            `🛡️ Seguridad: ${guildConfig.logs?.securityLog ? '✅' : '❌'}`,
            `⚖️ Moderación: ${guildConfig.logs?.modLog ? '✅' : '❌'}`,
            `📋 General: ${guildConfig.logs?.generalLog ? '✅' : '❌'}`,
            `👋 Entradas: ${guildConfig.logs?.joinLog ? '✅' : '❌'}`,
          ].join('\n'),
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: 'RB3 Setup • Responde con el nombre del canal/ID cuando se te pida' });

    const select = new StringSelectMenuBuilder()
      .setCustomId('setup_module')
      .setPlaceholder('Selecciona un módulo...')
      .addOptions([
        { label: '📢 Canales de Logs', value: 'logs', description: 'Configura los canales de registro', emoji: '📢' },
        { label: '🛡️ Anti-Spam', value: 'antispam', description: 'Activa/configura el anti-spam', emoji: '🛡️' },
        { label: '🔗 Anti-Links', value: 'antilinks', description: 'Activa/desactiva el anti-links', emoji: '🔗' },
        { label: '🚨 Anti-Raid', value: 'antiraid', description: 'Configura la protección anti-raid', emoji: '🚨' },
        { label: '☢️ Anti-Nuke', value: 'antinuke', description: 'Protección anti-nuke', emoji: '☢️' },
        { label: '🎫 Tickets', value: 'tickets', description: 'Sistema de tickets de soporte', emoji: '🎫' },
        { label: '✅ Verificación', value: 'verification', description: 'Sistema de verificación', emoji: '✅' },
        { label: '📊 Ver configuración completa', value: 'view', description: 'Ver toda la configuración actual', emoji: '📊' },
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    const msg = await message.reply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on('collect', async (interaction) => {
      const selected = interaction.values[0];
      await interaction.deferUpdate();

      switch (selected) {
        case 'logs':
          await handleLogsSetup(message, guildConfig, msg);
          break;
        case 'antispam':
          await toggleModule(interaction, guildConfig, 'antiSpam', 'Anti-Spam', msg);
          break;
        case 'antilinks':
          await toggleModule(interaction, guildConfig, 'antiLinks', 'Anti-Links', msg);
          break;
        case 'antiraid':
          await toggleModule(interaction, guildConfig, 'antiRaid', 'Anti-Raid', msg);
          break;
        case 'antinuke':
          await toggleModule(interaction, guildConfig, 'antiNuke', 'Anti-Nuke', msg);
          break;
        case 'tickets':
          await handleTicketSetup(message, guildConfig, msg);
          break;
        case 'verification':
          await handleVerificationSetup(message, guildConfig, msg);
          break;
        case 'view':
          await showFullConfig(interaction, guildConfig);
          break;
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};

// ── Funciones auxiliares ──────────────────────────────────────────────────────
async function toggleModule(interaction, config, module, name, msg) {
  const current = config[module]?.enabled || false;
  config[module] = { ...config[module], enabled: !current };
  await config.save();

  const status = !current ? '✅ Activado' : '❌ Desactivado';
  await msg.edit({
    embeds: [successEmbed(`**${name}** ha sido ${status}.`)],
    components: [],
  });
}

async function handleLogsSetup(message, config, msg) {
  const prompt = await msg.edit({
    embeds: [new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📢 Configurar Canales de Logs')
      .setDescription([
        'Responde con el **ID o mención** del canal para cada tipo de log.',
        '',
        '**Formato:** `#canal-seguridad #canal-mod #canal-general #canal-joins`',
        '*(Puedes poner el mismo canal para todos)*',
        '',
        '⏳ Tienes 60 segundos.',
      ].join('\n'))
    ],
    components: [],
  });

  const filter = m => m.author.id === message.author.id;
  const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 });

  if (!collected.size) {
    return msg.edit({ embeds: [errorEmbed('Tiempo agotado. Usa `.setup` nuevamente.')], components: [] });
  }

  const response = collected.first();
  const channels = [...response.content.matchAll(/<#(\d+)>|(\d{17,19})/g)]
    .map(m => m[1] || m[2])
    .slice(0, 4);

  if (channels.length === 0) {
    return msg.edit({ embeds: [errorEmbed('No detecté canales válidos.')], components: [] });
  }

  config.logs.securityLog = channels[0];
  config.logs.modLog       = channels[1] || channels[0];
  config.logs.generalLog   = channels[2] || channels[0];
  config.logs.joinLog      = channels[3] || channels[0];
  await config.save();

  await response.delete().catch(() => {});
  await msg.edit({ embeds: [successEmbed('✅ Canales de logs configurados correctamente.')], components: [] });
}

async function handleTicketSetup(message, config, msg) {
  config.tickets.enabled = !config.tickets.enabled;
  await config.save();

  const status = config.tickets.enabled ? 'activado' : 'desactivado';
  await msg.edit({
    embeds: [successEmbed(`Sistema de tickets **${status}**.`)],
    components: [],
  });
}

async function handleVerificationSetup(message, config, msg) {
  config.verification.enabled = !config.verification.enabled;
  await config.save();

  const status = config.verification.enabled ? 'activado' : 'desactivado';
  await msg.edit({
    embeds: [successEmbed(`Sistema de verificación **${status}**.`)],
    components: [],
  });
}

async function showFullConfig(interaction, config) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📊 Configuración Completa')
    .addFields(
      {
        name: '🔒 Seguridad',
        value: [
          `Anti-Spam: ${config.antiSpam?.enabled ? '✅' : '❌'} | Threshold: ${config.antiSpam?.threshold || 5}`,
          `Anti-Links: ${config.antiLinks?.enabled ? '✅' : '❌'}`,
          `Anti-Raid: ${config.antiRaid?.enabled ? '✅' : '❌'} | Threshold: ${config.antiRaid?.threshold || 10}`,
          `Anti-Nuke: ${config.antiNuke?.enabled ? '✅' : '❌'}`,
          `Anti-Mass Mention: ${config.antiMassMention?.enabled ? '✅' : '❌'}`,
        ].join('\n'),
      },
      {
        name: '📢 Logs',
        value: [
          `Seguridad: ${config.logs?.securityLog ? `<#${config.logs.securityLog}>` : 'No configurado'}`,
          `Moderación: ${config.logs?.modLog ? `<#${config.logs.modLog}>` : 'No configurado'}`,
          `General: ${config.logs?.generalLog ? `<#${config.logs.generalLog}>` : 'No configurado'}`,
          `Entradas: ${config.logs?.joinLog ? `<#${config.logs.joinLog}>` : 'No configurado'}`,
        ].join('\n'),
      }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}
