/**
 * Ticket — Sistema de tickets de soporte
 */

const { Schema, model } = require('mongoose');

const TicketSchema = new Schema({
  ticketId:    { type: String, required: true, unique: true },
  guildId:     { type: String, required: true },
  channelId:   { type: String, required: true },
  creatorId:   { type: String, required: true },
  topic:       { type: String, default: 'Sin especificar' },
  
  status: {
    type: String,
    enum: ['open', 'claimed', 'closed', 'resolved'],
    default: 'open',
  },

  claimedBy:   { type: String, default: null },
  closedBy:    { type: String, default: null },
  closedAt:    { type: Date, default: null },
  closeReason: { type: String, default: null },

  messages: [{
    authorId:  { type: String },
    content:   { type: String },
    timestamp: { type: Date, default: Date.now },
  }],

  rating:    { type: Number, min: 1, max: 5, default: null },
  feedback:  { type: String, default: null },

}, { timestamps: true });

TicketSchema.index({ guildId: 1, creatorId: 1 });
TicketSchema.index({ status: 1 });

module.exports = model('Ticket', TicketSchema);
