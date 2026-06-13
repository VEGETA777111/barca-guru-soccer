/**
 * User — Perfil de usuario (economía, XP, soccer)
 */

const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  userId:  { type: String, required: true },
  guildId: { type: String, required: true },

  // ── Economía ──────────────────────────────────────────────────────────────
  economy: {
    coins:       { type: Number, default: 1000 },
    bank:        { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    lastDaily:   { type: Date, default: null },
  },

  // ── XP / Niveles ──────────────────────────────────────────────────────────
  xp: {
    current:  { type: Number, default: 0 },
    level:    { type: Number, default: 1 },
    total:    { type: Number, default: 0 },
    lastXp:   { type: Date, default: null },
  },

  // ── Soccer Guru ───────────────────────────────────────────────────────────
  soccer: {
    inventory:   [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    lastClaim:   { type: Date, default: null },
    totalClaims: { type: Number, default: 0 },
    wins:        { type: Number, default: 0 },
    losses:      { type: Number, default: 0 },
    trades:      { type: Number, default: 0 },
    favoriteId:  { type: Schema.Types.ObjectId, ref: 'Player', default: null },
  },

  // ── Perfil ───────────────────────────────────────────────────────────────
  profile: {
    bio:        { type: String, default: null },
    badges:     [{ type: String }],
    background: { type: String, default: 'default' },
  },

  // ── Moderación ────────────────────────────────────────────────────────────
  warnings: [{
    reason:    { type: String },
    moderator: { type: String },
    date:      { type: Date, default: Date.now },
  }],

  isBanned:      { type: Boolean, default: false },
  isBlacklisted: { type: Boolean, default: false },

}, { timestamps: true });

// Índice compuesto para búsquedas rápidas
UserSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// ── Métodos de instancia ──────────────────────────────────────────────────────
UserSchema.methods.addCoins = function(amount) {
  this.economy.coins = Math.max(0, this.economy.coins + amount);
  if (amount > 0) this.economy.totalEarned += amount;
  return this;
};

UserSchema.methods.removeCoins = function(amount) {
  if (this.economy.coins < amount) return false;
  this.economy.coins -= amount;
  return true;
};

UserSchema.methods.addXP = function(amount) {
  this.xp.current += amount;
  this.xp.total += amount;
  const xpNeeded = this.getXPForNextLevel();
  let leveled = false;

  while (this.xp.current >= xpNeeded) {
    this.xp.current -= xpNeeded;
    this.xp.level++;
    leveled = true;
  }

  return leveled;
};

UserSchema.methods.getXPForNextLevel = function() {
  return Math.floor(100 * Math.pow(1.3, this.xp.level - 1));
};

UserSchema.methods.getXPProgress = function() {
  const needed = this.getXPForNextLevel();
  return {
    current: this.xp.current,
    needed,
    percentage: Math.floor((this.xp.current / needed) * 100),
  };
};

// ── Métodos estáticos ─────────────────────────────────────────────────────────
UserSchema.statics.findOrCreate = async function(userId, guildId) {
  let user = await this.findOne({ userId, guildId });
  if (!user) {
    user = await this.create({ userId, guildId });
  }
  return user;
};

module.exports = model('User', UserSchema);
