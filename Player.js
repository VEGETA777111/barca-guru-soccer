/**
 * Player — Carta de jugador Soccer Guru
 */

const { Schema, model } = require('mongoose');

const StatsSchema = new Schema({
  pace:       { type: Number, min: 1, max: 99 },
  shooting:   { type: Number, min: 1, max: 99 },
  passing:    { type: Number, min: 1, max: 99 },
  dribbling:  { type: Number, min: 1, max: 99 },
  defense:    { type: Number, min: 1, max: 99 },
  physical:   { type: Number, min: 1, max: 99 },
}, { _id: false });

const PlayerSchema = new Schema({
  // ── Identidad ──────────────────────────────────────────────────────────────
  name:        { type: String, required: true },
  description: { type: String, default: 'Un jugador extraordinario.' },
  imageUrl:    { type: String, default: null },

  // ── Atributos de carta ────────────────────────────────────────────────────
  rarity: {
    type: String,
    enum: ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'],
    default: 'Common',
  },
  overall:     { type: Number, min: 50, max: 99, required: true },
  position:    { type: String, required: true },
  nationality: { type: String, required: true },
  club:        { type: String, required: true },
  foot:        { type: String, enum: ['Derecho', 'Izquierdo', 'Ambidiestro'], default: 'Derecho' },

  // ── Estadísticas ──────────────────────────────────────────────────────────
  stats: { type: StatsSchema, required: true },

  // ── Propietario ───────────────────────────────────────────────────────────
  ownerId:  { type: String, default: null }, // null = disponible
  guildId:  { type: String, required: true },

  // ── Economía ──────────────────────────────────────────────────────────────
  price:        { type: Number, default: 0 },   // Precio base
  marketPrice:  { type: Number, default: null }, // En mercado (null = no en venta)
  isOnMarket:   { type: Boolean, default: false },

  // ── Metadatos ─────────────────────────────────────────────────────────────
  claimedAt: { type: Date, default: null },
  isSpecial: { type: Boolean, default: false },  // Carta de evento
  eventName: { type: String, default: null },

}, { timestamps: true });

PlayerSchema.index({ guildId: 1, rarity: 1 });
PlayerSchema.index({ ownerId: 1, guildId: 1 });
PlayerSchema.index({ name: 1 });

// ── Precio base por rareza ────────────────────────────────────────────────────
PlayerSchema.methods.getBasePrice = function() {
  const prices = {
    Common:    500,
    Rare:      1500,
    Epic:      4000,
    Legendary: 12000,
    Mythic:    50000,
  };
  return prices[this.rarity] || 500;
};

// ── Color de embed por rareza ─────────────────────────────────────────────────
PlayerSchema.methods.getRarityColor = function() {
  const colors = {
    Common:    0xAAAAAA,
    Rare:      0x4169E1,
    Epic:      0x9B59B6,
    Legendary: 0xF1C40F,
    Mythic:    0xFF4500,
  };
  return colors[this.rarity] || 0xAAAAAA;
};

module.exports = model('Player', PlayerSchema);
