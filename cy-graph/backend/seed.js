const mongoose = require('mongoose');
require('dotenv').config();

const Node = require('./models/Node');
const Edge = require('./models/Edge');
const FirewallRule = require('./models/FirewallRule');

// ── Seed Nodes (same as prototype) ─────────────────────
const nodesData = [
  { name: 'CORE-ROUTER-01', type: 'router',      ip: '192.168.1.1',  os: 'Cisco IOS',    hasFirewall: true,  status: 'secure',  position: { x: 500, y: 350 } },
  { name: 'WEB-SERVER-01',  type: 'server',      ip: '192.168.1.10', os: 'Ubuntu 22.04', hasFirewall: true,  status: 'secure',  position: { x: 300, y: 230 } },
  { name: 'DB-SERVER-01',   type: 'database',    ip: '192.168.1.11', os: 'CentOS 8',     hasFirewall: true,  status: 'secure',  position: { x: 700, y: 230 } },
  { name: 'WORKST-AHMED',   type: 'workstation', ip: '192.168.1.20', os: 'Windows 11',   hasFirewall: false, status: 'warning', position: { x: 220, y: 430 } },
  { name: 'WORKST-SARA',    type: 'workstation', ip: '192.168.1.21', os: 'macOS 14',     hasFirewall: true,  status: 'secure',  position: { x: 400, y: 510 } },
  { name: 'IOT-CAMERA-01',  type: 'iot',         ip: '192.168.1.50', os: 'RTOS 2.1',     hasFirewall: false, status: 'warning', position: { x: 650, y: 510 } },
  { name: 'SWITCH-FLOOR1',  type: 'router',      ip: '192.168.1.2',  os: 'Cisco IOS',    hasFirewall: true,  status: 'secure',  position: { x: 320, y: 360 } },
  { name: 'APP-SERVER-01',  type: 'server',      ip: '192.168.1.12', os: 'Debian 12',    hasFirewall: true,  status: 'secure',  position: { x: 580, y: 150 } },
  { name: 'WORKST-ALI',     type: 'workstation', ip: '192.168.1.22', os: 'Windows 10',   hasFirewall: false, status: 'warning', position: { x: 780, y: 430 } },
  { name: 'BACKUP-SERVER',  type: 'server',      ip: '192.168.1.13', os: 'Ubuntu 20.04', hasFirewall: true,  status: 'secure',  position: { x: 760, y: 310 } },
  { name: 'IOT-PRINTER',    type: 'iot',         ip: '192.168.1.51', os: 'Embedded',     hasFirewall: false, status: 'warning', position: { x: 560, y: 550 } },
  { name: 'WORKST-MARIA',   type: 'workstation', ip: '192.168.1.23', os: 'macOS 13',     hasFirewall: true,  status: 'secure',  position: { x: 440, y: 150 } },
  { name: 'MAIL-SERVER',    type: 'server',      ip: '192.168.1.14', os: 'Ubuntu 22.04', hasFirewall: true,  status: 'secure',  position: { x: 220, y: 180 } },
  { name: 'DNS-SERVER',     type: 'server',      ip: '192.168.1.15', os: 'CentOS 7',     hasFirewall: true,  status: 'secure',  position: { x: 780, y: 180 } },
  { name: 'IOT-HVAC',       type: 'iot',         ip: '192.168.1.52', os: 'RTOS 1.9',     hasFirewall: false, status: 'warning', position: { x: 190, y: 530 } },
];

// ── Seed Firewall Rules ─────────────────────────────────
const rulesData = [
  { name: 'BLOCK-TELNET',    source: 'ANY',       destination: 'ANY',        port: 23,   protocol: 'TCP', action: 'DENY',  enabled: true  },
  { name: 'ALLOW-HTTPS',     source: '0.0.0.0/0', destination: 'WEB-SERVER', port: 443,  protocol: 'TCP', action: 'ALLOW', enabled: true  },
  { name: 'BLOCK-RDP-EXT',   source: 'EXTERNAL',  destination: 'ANY',        port: 3389, protocol: 'TCP', action: 'DENY',  enabled: true  },
  { name: 'ALLOW-DNS',       source: 'INTERNAL',  destination: 'DNS-SERVER', port: 53,   protocol: 'UDP', action: 'ALLOW', enabled: true  },
  { name: 'BLOCK-SMB',       source: 'EXTERNAL',  destination: 'ANY',        port: 445,  protocol: 'TCP', action: 'DENY',  enabled: false },
  { name: 'ALLOW-SSH-ADMIN', source: '10.0.0.5',  destination: 'ANY',        port: 22,   protocol: 'TCP', action: 'ALLOW', enabled: true  },
];

// ── Main Seed Function ──────────────────────────────────
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Clear existing data
    await Node.deleteMany({});
    await Edge.deleteMany({});
    await FirewallRule.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Insert nodes
    const insertedNodes = await Node.insertMany(nodesData);
    console.log(`✅ Inserted ${insertedNodes.length} nodes`);

    // Map node names to their MongoDB _id
    const nodeMap = {};
    insertedNodes.forEach((n) => {
      nodeMap[n.name] = n._id;
    });

    // ── Define edges using node names ─────────────────────
    const edgePairs = [
      ['CORE-ROUTER-01', 'WEB-SERVER-01'],
      ['CORE-ROUTER-01', 'DB-SERVER-01'],
      ['CORE-ROUTER-01', 'SWITCH-FLOOR1'],
      ['CORE-ROUTER-01', 'APP-SERVER-01'],
      ['CORE-ROUTER-01', 'BACKUP-SERVER'],
      ['CORE-ROUTER-01', 'DNS-SERVER'],
      ['WEB-SERVER-01',  'MAIL-SERVER'],
      ['WEB-SERVER-01',  'APP-SERVER-01'],
      ['DB-SERVER-01',   'BACKUP-SERVER'],
      ['SWITCH-FLOOR1',  'WORKST-AHMED'],
      ['SWITCH-FLOOR1',  'WORKST-SARA'],
      ['SWITCH-FLOOR1',  'IOT-CAMERA-01'],
      ['SWITCH-FLOOR1',  'IOT-HVAC'],
      ['WORKST-ALI',     'BACKUP-SERVER'],
      ['WORKST-ALI',     'IOT-PRINTER'],
      ['WORKST-SARA',    'IOT-PRINTER'],
      ['WORKST-AHMED',   'MAIL-SERVER'],
      ['APP-SERVER-01',  'WORKST-MARIA'],
      ['DB-SERVER-01',   'DNS-SERVER'],
      ['IOT-CAMERA-01',  'IOT-PRINTER'],
    ];

    const edgesData = edgePairs.map(([src, tgt]) => ({
      source: nodeMap[src],
      target: nodeMap[tgt],
      encrypted: Math.random() > 0.3,
    }));

    const insertedEdges = await Edge.insertMany(edgesData);
    console.log(`✅ Inserted ${insertedEdges.length} edges`);

    // Insert firewall rules
    const insertedRules = await FirewallRule.insertMany(rulesData);
    console.log(`✅ Inserted ${insertedRules.length} firewall rules`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   Nodes:          ${insertedNodes.length}`);
    console.log(`   Edges:          ${insertedEdges.length}`);
    console.log(`   Firewall Rules: ${insertedRules.length}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedDatabase();