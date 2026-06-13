/**
 * playersData — Base de datos de jugadores ficticios
 * Organizados por rareza con stats coherentes
 */

const PLAYERS_DATA = [
  // ══════════════════════════════════
  //  MYTHIC (95-99 overall)
  // ══════════════════════════════════
  {
    name: 'Zael Vortex',
    description: 'La leyenda viviente del fútbol mundial. Sus habilidades desafían la física.',
    rarity: 'Mythic',
    overall: 99,
    position: 'CAM',
    nationality: 'Aracian',
    club: 'FC Infinito',
    foot: 'Izquierdo',
    stats: { pace: 96, shooting: 98, passing: 97, dribbling: 99, defense: 45, physical: 78 },
    price: 80000,
  },
  {
    name: 'Solaris Blaze',
    description: 'El delantero más temido del universo. Ningún portero lo ha podido detener.',
    rarity: 'Mythic',
    overall: 98,
    position: 'ST',
    nationality: 'Novaran',
    club: 'Los Inmortales FC',
    foot: 'Derecho',
    stats: { pace: 99, shooting: 98, passing: 82, dribbling: 95, defense: 35, physical: 91 },
    price: 75000,
  },
  {
    name: 'Kira Shadowstep',
    description: 'Una defensora que nunca pierde un duelo. Sus tackles son arte puro.',
    rarity: 'Mythic',
    overall: 96,
    position: 'CB',
    nationality: 'Eldarion',
    club: 'Muralla de Cristal',
    foot: 'Derecho',
    stats: { pace: 82, shooting: 50, passing: 78, dribbling: 74, defense: 99, physical: 96 },
    price: 65000,
  },

  // ══════════════════════════════════
  //  LEGENDARY (88-94 overall)
  // ══════════════════════════════════
  {
    name: 'Dravon Ashfall',
    description: 'Mediocampista con visión de juego incomparable.',
    rarity: 'Legendary',
    overall: 93,
    position: 'CM',
    nationality: 'Valoran',
    club: 'Centauro United',
    foot: 'Ambidiestro',
    stats: { pace: 82, shooting: 85, passing: 96, dribbling: 91, defense: 72, physical: 80 },
    price: 18000,
  },
  {
    name: 'Lyra Stormwind',
    description: 'La extremo más rápida de la historia. Nadie la puede seguir.',
    rarity: 'Legendary',
    overall: 92,
    position: 'LW',
    nationality: 'Sylvaran',
    club: 'Rayo Dorado SC',
    foot: 'Izquierdo',
    stats: { pace: 99, shooting: 88, passing: 86, dribbling: 93, defense: 40, physical: 65 },
    price: 16000,
  },
  {
    name: 'Torven Ironclad',
    description: 'El portero con los mejores reflejos del mundo ficticio.',
    rarity: 'Legendary',
    overall: 91,
    position: 'GK',
    nationality: 'Nordheim',
    club: 'Escudo de Hierro FC',
    foot: 'Derecho',
    stats: { pace: 50, shooting: 20, passing: 72, dribbling: 42, defense: 95, physical: 88 },
    price: 14000,
  },
  {
    name: 'Nexus Prime',
    description: 'Centrocampista total que domina cada centímetro del campo.',
    rarity: 'Legendary',
    overall: 90,
    position: 'CDM',
    nationality: 'Technar',
    club: 'Omega XI',
    foot: 'Derecho',
    stats: { pace: 80, shooting: 75, passing: 90, dribbling: 84, defense: 91, physical: 85 },
    price: 13000,
  },

  // ══════════════════════════════════
  //  EPIC (80-87 overall)
  // ══════════════════════════════════
  {
    name: 'Vega Crimsontide',
    description: 'Lateral ofensivo con un talento natural para el regate.',
    rarity: 'Epic',
    overall: 87,
    position: 'RB',
    nationality: 'Aurantia',
    club: 'Fuego Rojo CF',
    foot: 'Derecho',
    stats: { pace: 89, shooting: 72, passing: 83, dribbling: 85, defense: 79, physical: 74 },
    price: 6000,
  },
  {
    name: 'Zephyr Coldstream',
    description: 'Extremo zurdo con un centro perfecto y velocidad de vértigo.',
    rarity: 'Epic',
    overall: 85,
    position: 'RW',
    nationality: 'Polaran',
    club: 'Nieve Azul FC',
    foot: 'Izquierdo',
    stats: { pace: 92, shooting: 80, passing: 85, dribbling: 87, defense: 38, physical: 62 },
    price: 5500,
  },
  {
    name: 'Braxis Thornwall',
    description: 'Defensa central con una personalidad imponente en el área.',
    rarity: 'Epic',
    overall: 84,
    position: 'CB',
    nationality: 'Grindal',
    club: 'Bastión FC',
    foot: 'Derecho',
    stats: { pace: 70, shooting: 42, passing: 68, dribbling: 60, defense: 89, physical: 87 },
    price: 5000,
  },
  {
    name: 'Lira Goldweave',
    description: 'Mediapunta con una técnica individual excepcional.',
    rarity: 'Epic',
    overall: 83,
    position: 'CAM',
    nationality: 'Aureis',
    club: 'Dragón Dorado SC',
    foot: 'Derecho',
    stats: { pace: 78, shooting: 83, passing: 89, dribbling: 88, defense: 42, physical: 65 },
    price: 4500,
  },

  // ══════════════════════════════════
  //  RARE (70-79 overall)
  // ══════════════════════════════════
  {
    name: 'Marco Duskblade',
    description: 'Delantero joven con un futuro prometedor.',
    rarity: 'Rare',
    overall: 78,
    position: 'ST',
    nationality: 'Vespar',
    club: 'Jóvenes Estrellas CF',
    foot: 'Derecho',
    stats: { pace: 82, shooting: 79, passing: 65, dribbling: 76, defense: 32, physical: 72 },
    price: 2000,
  },
  {
    name: 'Sera Lightfoot',
    description: 'Extremo ágil que desborda constantemente.',
    rarity: 'Rare',
    overall: 76,
    position: 'LW',
    nationality: 'Featheran',
    club: 'Pluma Veloz SC',
    foot: 'Izquierdo',
    stats: { pace: 88, shooting: 70, passing: 72, dribbling: 80, defense: 30, physical: 55 },
    price: 1800,
  },
  {
    name: 'Drake Steelborn',
    description: 'Defensa robusto con buen juego aéreo.',
    rarity: 'Rare',
    overall: 74,
    position: 'CB',
    nationality: 'Ferron',
    club: 'Acero CF',
    foot: 'Derecho',
    stats: { pace: 62, shooting: 38, passing: 60, dribbling: 52, defense: 79, physical: 83 },
    price: 1500,
  },
  {
    name: 'Tyla Moonriver',
    description: 'Mediocampista versátil con buen pase largo.',
    rarity: 'Rare',
    overall: 72,
    position: 'CM',
    nationality: 'Lunara',
    club: 'Luna Nueva FC',
    foot: 'Ambidiestro',
    stats: { pace: 72, shooting: 65, passing: 79, dribbling: 74, defense: 60, physical: 65 },
    price: 1400,
  },

  // ══════════════════════════════════
  //  COMMON (50-69 overall)
  // ══════════════════════════════════
  {
    name: 'Aldo Quickpass',
    description: 'Un mediocampista trabajador y disciplinado.',
    rarity: 'Common',
    overall: 68,
    position: 'CM',
    nationality: 'Campora',
    club: 'Real Campora FC',
    foot: 'Derecho',
    stats: { pace: 65, shooting: 58, passing: 72, dribbling: 65, defense: 55, physical: 62 },
    price: 500,
  },
  {
    name: 'Bento Swiftcross',
    description: 'Lateral que da todo en el campo pero le falta calidad técnica.',
    rarity: 'Common',
    overall: 65,
    position: 'RB',
    nationality: 'Campora',
    club: 'Athletic Bento',
    foot: 'Derecho',
    stats: { pace: 74, shooting: 45, passing: 65, dribbling: 62, defense: 68, physical: 70 },
    price: 450,
  },
  {
    name: 'Cara Dustcloud',
    description: 'Portera joven que está aprendiendo los secretos del puesto.',
    rarity: 'Common',
    overall: 62,
    position: 'GK',
    nationality: 'Polveran',
    club: 'Polvo SC',
    foot: 'Derecho',
    stats: { pace: 42, shooting: 15, passing: 55, dribbling: 35, defense: 70, physical: 65 },
    price: 400,
  },
  {
    name: 'Finn Mudfield',
    description: 'Defensa central sin mucho brillo pero muy consistente.',
    rarity: 'Common',
    overall: 60,
    position: 'CB',
    nationality: 'Grindal',
    club: 'Barro United',
    foot: 'Izquierdo',
    stats: { pace: 58, shooting: 32, passing: 54, dribbling: 48, defense: 68, physical: 72 },
    price: 350,
  },
  {
    name: 'Paco Greenfield',
    description: 'Un delantero amateur que sueña con las grandes ligas.',
    rarity: 'Common',
    overall: 58,
    position: 'ST',
    nationality: 'Verdis',
    club: 'Hierba Fresca CF',
    foot: 'Derecho',
    stats: { pace: 70, shooting: 62, passing: 50, dribbling: 60, defense: 25, physical: 60 },
    price: 300,
  },
];

// ── Probabilidades de rareza al hacer claim ──────────────────────────────────
const RARITY_RATES = {
  Common:    0.50,  // 50%
  Rare:      0.28,  // 28%
  Epic:      0.15,  // 15%
  Legendary: 0.06,  //  6%
  Mythic:    0.01,  //  1%
};

/**
 * Obtiene un jugador aleatorio basado en las probabilidades
 */
function getRandomPlayer() {
  const roll = Math.random();
  let cumulative = 0;
  let rarity = 'Common';

  for (const [r, rate] of Object.entries(RARITY_RATES)) {
    cumulative += rate;
    if (roll < cumulative) {
      rarity = r;
      break;
    }
  }

  const pool = PLAYERS_DATA.filter(p => p.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Obtiene un jugador específico por nombre
 */
function getPlayerByName(name) {
  return PLAYERS_DATA.find(p =>
    p.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Obtiene todos los jugadores de una rareza
 */
function getPlayersByRarity(rarity) {
  return PLAYERS_DATA.filter(p => p.rarity === rarity);
}

module.exports = {
  PLAYERS_DATA,
  RARITY_RATES,
  getRandomPlayer,
  getPlayerByName,
  getPlayersByRarity,
};
