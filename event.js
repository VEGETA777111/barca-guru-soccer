/**
 * Comando: .event — Sistema de eventos de Soccer Guru
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ComponentType,
} = require('discord.js');
const Player = require('../../models/Player');
const User   = require('../../models/User');
const { getRandomPlayerWithRarity } = require('./pack');
const { PLAYERS_DATA } = require('../../data/players');
const { errorEmbed, COLORS } = require('../../utils/embeds');

// Eventos activos en memoria (en producción, usar DB)
const activeEvents = new Map();

module.exports = {
  name: 'event',
  aliases: ['evento', 'events'],
  description: 'Gestiona y participa en eventos de Soccer Guru',
  usage: '.event [start|info|join]',
  category: 'soccer',
  guildOnly: true,
  cooldown: 5000,

  async execute(message, args, client, config) {
    const sub     = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (!sub || sub === 'info') {
      return showActiveEvent(message, guildId);
    }

    if (sub === 'start') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply({ embeds: [errorEmbed('Necesitas **Gestionar Servidor** para iniciar eventos.')] });
      }
      return startEvent(message, args.slice(1), guildId, client);
    }

    if (sub === 'join') {
      return joinEvent(message, guildId, client);
    }

    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.soccer)
        .setTitle('🎪 Sistema de Eventos')
        .setDescription([
          '**Subcomandos disponibles:**',
          '',
          '`.event info` — Ver evento activo',
          '`.event join` — Unirse al evento activo',
          '`.event start <tipo>` — Iniciar un evento *(Admin)*',
          '',
          '**Tipos de evento:**',
          '`legendary` — Drop especial de cartas Legendary',
          '`race` — Carrera de claims: el primero gana',
          '`bonus` — Bonus de monedas x2 por 1 hora',
        ].join('\n'))
      ],
    });
  },
};

// ── Mostrar evento activo ─────────────────────────────────────────────────────
async function showActiveEvent(message, guildId) {
  const event = activeEvents.get(guildId);

  if (!event) {
    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.soccer)
        .setTitle('🎪 Eventos')
        .setDescription('No hay ningún evento activo en este momento.\n\nUn administrador puede iniciar uno con `.event start <tipo>`.')
        .setTimestamp()
      ],
    });
  }

  const remaining = Math.floor((event.endsAt - Date.now()) / 1000);

  const embed = new EmbedBuilder()
    .setColor(0xFF6600)
    .setTitle(`🎪 Evento Activo: ${event.name}`)
    .setDescription(event.description)
    .addFields(
      { name: '⏳ Termina', value: `<t:${Math.floor(event.endsAt / 1000)}:R>`, inline: true },
      { name: '👥 Participantes', value: `${event.participants.size}`, inline: true },
      { name: '🏆 Premio', value: event.prize, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Usa .event join para participar' });

  await message.reply({ embeds: [embed] });
}

// ── Iniciar evento ─────────────────────────────────────────────────────────────
async function startEvent(message, args, guildId, client) {
  const type = args[0]?.toLowerCase() || 'legendary';

  if (activeEvents.has(guildId)) {
    return message.reply({ embeds: [errorEmbed('Ya hay un evento activo. Espera a que termine.')] });
  }

  const events = {
    legendary: {
      name: '⭐ Drop Legendario',
      description: 'El primer usuario en escribir `.event join` recibirá una carta **Legendary** garantizada.',
      prize: '🟡 1× Carta Legendary',
      duration: 5 * 60 * 1000,
      type: 'first_join',
      rarity: 'Legendary',
    },
    mythic: {
      name: '🔴 Drop Mítico',
      description: '**¡EVENTO ESPECIAL!** El primer usuario en escribir `.event join` recibirá una carta **Mythic**.',
      prize: '🔴 1× Carta Mythic',
      duration: 3 * 60 * 1000,
      type: 'first_join',
      rarity: 'Mythic',
    },
    bonus: {
      name: '💰 Bonus de Monedas',
      description: 'Los primeros 5 usuarios en `.event join` recibirán **2000 🪙** gratis.',
      prize: '💰 2000 🪙 para 5 usuarios',
      duration: 10 * 60 * 1000,
      type: 'multi_join',
      maxParticipants: 5,
      coinsReward: 2000,
    },
  };

  const eventData = events[type] || events.legendary;

  const event = {
    ...eventData,
    endsAt:       Date.now() + eventData.duration,
    participants: new Set(),
    guildId,
    ended:        false,
  };

  activeEvents.set(guildId, event);

  const embed = new EmbedBuilder()
    .setColor(0xFF6600)
    .setTitle(`🎪 ¡NUEVO EVENTO! — ${event.name}`)
    .setDescription(event.description)
    .addFields(
      { name: '⏳ Duración', value: `${eventData.duration / 60000} minutos`, inline: true },
      { name: '🏆 Premio', value: event.prize, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: '¡Escribe .event join para participar!' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_join-${guildId}`)
      .setLabel('🎮 Participar ahora')
      .setStyle(ButtonStyle.Success),
  );

  const msg = await message.reply({ content: '@everyone', embeds: [embed], components: [row] });

  // Collector de botón
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: eventData.duration,
  });

  collector.on('collect', async (interaction) => {
    await processEventJoin(interaction, event, guildId, client, msg);
  });

  // Auto-terminar al expirar
  setTimeout(async () => {
    activeEvents.delete(guildId);
    if (!event.ended) {
      event.ended = true;
      await msg.edit({
        embeds: [embed.setColor(0xAAAAAA).setTitle(`❌ Evento Terminado — ${event.name}`)],
        components: [],
      }).catch(() => {});
    }
  }, eventData.duration);
}

// ── Unirse al evento ──────────────────────────────────────────────────────────
async function joinEvent(message, guildId, client) {
  const event = activeEvents.get(guildId);
  if (!event) {
    return message.reply({ embeds: [errorEmbed('No hay ningún evento activo.')] });
  }
  return processEventJoinMsg(message, event, guildId, client);
}

async function processEventJoin(interaction, event, guildId, client, msg) {
  if (event.ended) {
    return interaction.reply({ content: '❌ Este evento ya terminó.', ephemeral: true });
  }
  if (event.participants.has(interaction.user.id)) {
    return interaction.reply({ content: '⚠️ Ya participaste en este evento.', ephemeral: true });
  }

  await interaction.deferUpdate();
  await processEventReward(interaction.user, event, guildId, client, interaction);
}

async function processEventJoinMsg(message, event, guildId, client) {
  if (event.ended) return;
  if (event.participants.has(message.author.id)) {
    return message.reply({ embeds: [errorEmbed('Ya participaste en este evento.')] });
  }
  await processEventReward(message.author, event, guildId, client, null, message);
}

async function processEventReward(user, event, guildId, client, interaction = null, message = null) {
  const reply = async (opts) => {
    if (interaction) return interaction.followUp(opts);
    if (message)     return message.reply(opts);
  };

  event.participants.add(user.id);
  const userDoc = await User.findOrCreate(user.id, guildId);

  if (event.type === 'first_join' && event.participants.size === 1) {
    // Dar carta especial al primer jugador
    const pool   = PLAYERS_DATA.filter(p => p.rarity === event.rarity);
    const pData  = pool[Math.floor(Math.random() * pool.length)];

    if (pData) {
      const newPlayer = await Player.create({
        ...pData,
        ownerId:   user.id,
        guildId,
        claimedAt: new Date(),
        isSpecial: true,
        eventName: event.name,
      });

      userDoc.soccer.inventory.push(newPlayer._id);
      await userDoc.save();

      await reply({
        embeds: [new EmbedBuilder()
          .setColor(event.rarity === 'Mythic' ? 0xFF4500 : 0xF1C40F)
          .setTitle(`🏆 ¡${user.username} ganó el evento!`)
          .setDescription([
            `${user} fue el primero y gana:`,
            `${event.rarity === 'Mythic' ? '🔴' : '🟡'} **${pData.name}** (${pData.rarity} | ${pData.overall} OVR)`,
          ].join('\n'))
          .setTimestamp()
        ],
      });

      event.ended = true;
      activeEvents.delete(guildId);
    }
  }

  else if (event.type === 'multi_join') {
    if (event.participants.size <= (event.maxParticipants || 5)) {
      userDoc.economy.coins += event.coinsReward || 2000;
      userDoc.economy.totalEarned += event.coinsReward || 2000;
      await userDoc.save();

      await reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFFD700)
          .setDescription(`🎉 ${user} obtuvo **${event.coinsReward.toLocaleString()} 🪙** del evento!\n(Participante ${event.participants.size}/${event.maxParticipants})`)
          .setTimestamp()
        ],
      });

      if (event.participants.size >= event.maxParticipants) {
        event.ended = true;
        activeEvents.delete(guildId);
      }
    } else {
      await reply({ content: '❌ El evento ya está lleno.', ephemeral: !!interaction });
    }
  }
}
