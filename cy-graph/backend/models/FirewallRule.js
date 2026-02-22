const mongoose = require('mongoose');

const FirewallRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: 'ANY',
    },
    destination: {
      type: String,
      default: 'ANY',
    },
    port: {
      type: Number,
      required: true,
    },
    protocol: {
      type: String,
      enum: ['TCP', 'UDP', 'ICMP', 'ANY'],
      default: 'TCP',
    },
    action: {
      type: String,
      enum: ['ALLOW', 'DENY'],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FirewallRule', FirewallRuleSchema);