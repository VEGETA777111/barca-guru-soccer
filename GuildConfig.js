/**
 * GuildConfig — Configuración por servidor
 */

const { Schema, model } = require('mongoose');

const GuildConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },

  // ── Prefijo ──────────────────────────────────────────────────────────────
  prefix: { type: String, default: '.' },

  // ── Logs ─────────────────────────────────────────────────────────────────
  logs: {
    securityLog: { type: String, default: null },
    modLog:      { type: String, default: null },
    generalLog:  { type: String, default: null },
    joinLog:     { type: String, default: null },
    economyLog:  { type: String, default: null },
  },

  // ── Roles ─────────────────────────────────────────────────────────────────
  roles: {
    modRole:      { type: String, default: null },
    adminRole:    { type: String, default: null },
    muteRole:     { type: String, default: null },
    verifiedRole: { type: String, default: null },
    djRole:       { type: String, default: null },
  },

  // ── Sistema de verificación ───────────────────────────────────────────────
  verification: {
    enabled:   { type: Boolean, default: false },
    channelId: { type: String, default: null },
    roleId:    { type: String, default: null },
    type:      { type: String, enum: ['reaction', 'captcha', 'button'], default: 'button' },
    message:   { type: String, default: null },
  },

  // ── Anti-Spam ─────────────────────────────────────────────────────────────
  antiSpam: {
    enabled:      { type: Boolean, default: false },
    threshold:    { type: Number, default: 5 },
    muteDuration: { type: Number, default: 60000 },
  },

  // ── Anti-Links ────────────────────────────────────────────────────────────
  antiLinks: {
    enabled: { type: Boolean, default: false },
  },

  // ── Anti-Raid ─────────────────────────────────────────────────────────────
  antiRaid: {
    enabled:      { type: Boolean, default: false },
    threshold:    { type: Number, default: 10 },
    window:       { type: Number, default: 10000 },
    lockDuration: { type: Number, default: 300000 },
  },

  // ── Anti-Bots ─────────────────────────────────────────────────────────────
  antiBots: {
    enabled: { type: Boolean, default: false },
  },

  // ── Anti-Nuke ─────────────────────────────────────────────────────────────
  antiNuke: {
    enabled:   { type: Boolean, default: false },
    threshold: { type: Number, default: 3 },
  },

  // ── Anti-Mass Mention ─────────────────────────────────────────────────────
  antiMassMention: {
    enabled:   { type: Boolean, default: false },
    threshold: { type: Number, default: 5 },
  },

  // ── Whitelist ────────────────────────────────────────────────────────────
  whitelist: {
    users: [{ type: String }],
    roles: [{ type: String }],
    bots:  [{ type: String }],
    channels: [{ type: String }],
  },

  // ── Blacklist ────────────────────────────────────────────────────────────
  blacklist: {
    users:   [{ type: String }],
    words:   [{ type: String }],
    domains: [{ type: String }],
  },

  // ── Tickets ──────────────────────────────────────────────────────────────
  tickets: {
    enabled:       { type: Boolean, default: false },
    channelId:     { type: String, default: null },
    categoryId:    { type: String, default: null },
    supportRoleId: { type: String, default: null },
    logChannelId:  { type: String, default: null },
    counter:       { type: Number, default: 0 },
  },

  // ── Canales protegidos ────────────────────────────────────────────────────
  protectedChannels: [{ type: String }],
  protectedRoles:    [{ type: String }],

  // ── Soccer Guru ───────────────────────────────────────────────────────────
  soccer: {
    claimChannelId:   { type: String, default: null },
    shopChannelId:    { type: String, default: null },
    claimIntervalMs:  { type: Number, default: 3600000 }, // 1h
    startingCoins:    { type: Number, default: 1000 },
  },

}, { timestamps: true });

module.exports = model('GuildConfig', GuildConfigSchema);
