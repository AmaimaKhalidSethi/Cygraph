const mongoose = require('mongoose');

const AttackLogSchema = new mongoose.Schema(
  {
    attackerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: function() {
        return this.eventType !== 'reset';
      },
    },
    victimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      default: null,
    },
    blockedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      default: null,
    },
    path: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Node',
      },
    ],
    eventType: {
      type: String,
      enum: ['attack_start', 'node_compromised', 'node_blocked', 'reset'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttackLog', AttackLogSchema);