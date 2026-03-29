const mongoose = require('mongoose');

const EdgeSchema = new mongoose.Schema(
  {
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: true,
    },
    bandwidth: {
      type: String,
      default: '1Gbps',
    },
    encrypted: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Edge', EdgeSchema);