/**
 * Trade — Intercambio de jugadores entre usuarios
 */

const { Schema, model } = require('mongoose');

const TradeSchema = new Schema({
  guildId:    { type: String, required: true },
  
  sender: {
    userId:    { type: String, required: true },
    playerId:  { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    coins:     { type: Number, default: 0 },
  },

  receiver: {
    userId:    { type: String, required: true },
    playerId:  { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    coins:     { type: Number, default: 0 },
  },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
    default: 'pending',
  },

  expiresAt: { type: Date, required: true },
  messageId: { type: String, default: null },

}, { timestamps: true });

TradeSchema.index({ guildId: 1, status: 1 });
TradeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = model('Trade', TradeSchema);
