const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['server', 'workstation', 'router', 'database', 'iot'],
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    os: {
      type: String,
      default: 'Unknown',
    },
    hasFirewall: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['secure', 'warning', 'compromised'],
      default: 'secure',
    },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Node', NodeSchema);