const jwt       = require('jsonwebtoken');
const Node      = require('../models/Node');
const Edge      = require('../models/Edge');
const AttackLog = require('../models/AttackLog');

// ── BFS Attack Function ───────────────────────────────
async function runBFS(io, startNodeId) {
  try {
    const allNodes = await Node.find();
    const allEdges = await Edge.find();

    // Build adjacency map
    const adjacency = {};
    allNodes.forEach(n => { adjacency[n._id.toString()] = []; });
    allEdges.forEach(e => {
      const src = e.source.toString();
      const tgt = e.target.toString();
      if (adjacency[src]) adjacency[src].push(tgt);
      if (adjacency[tgt]) adjacency[tgt].push(src);
    });

    // Check if starting node has firewall
    const startNode = allNodes.find(n => n._id.toString() === startNodeId);
    if (!startNode) {
      io.emit('attack:error', { message: 'Starting node not found' });
      return;
    }

    if (startNode.hasFirewall) {
      await AttackLog.create({
        attackerId: startNodeId,
        blockedById: startNodeId,
        eventType: 'node_blocked',
        message: `🛡 Attack blocked — ${startNode.name} has firewall protection`,
      });
      io.emit('attack:spread', {
        compromised: [],
        blocked: [startNodeId],
        message: `🛡 Attack blocked by firewall on ${startNode.name}`,
      });
      return;
    }

    // Mark start node compromised
    const updatedStartNode = await Node.findByIdAndUpdate(startNodeId, { status: 'compromised' }, { new: true });

    await AttackLog.create({
      attackerId: startNodeId,
      victimId:   startNodeId,
      eventType:  'attack_start',
      message:    `Attack initiated on ${startNode?.name}`,
    });

    io.emit('attack:spread', {
      compromised: [startNodeId],
      blocked:     [],
      message:     `⚡ Attack started on ${startNode?.name}`,
    });

    // Emit node update for starting node
    io.emit('node:updated', { node: updatedStartNode });

    // BFS loop
    const visited = new Set([startNodeId]);
    let queue     = [startNodeId];

    while (queue.length > 0) {
      const nextQueue   = [];
      const compromised = [];
      const blocked     = [];

      for (const currentId of queue) {
        const neighbors = adjacency[currentId] || [];

        for (const neighborId of neighbors) {
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);

          const neighbor = allNodes.find(n => n._id.toString() === neighborId);
          if (!neighbor) continue;

          if (neighbor.hasFirewall) {
            blocked.push(neighborId);
            await AttackLog.create({
              attackerId:  startNodeId,
              blockedById: neighborId,
              eventType:   'node_blocked',
              message:     `🛡 ${neighbor.name} blocked by firewall`,
            });
          } else {
            const updatedNode = await Node.findByIdAndUpdate(neighborId, { status: 'compromised' }, { new: true });
            compromised.push(neighborId);
            nextQueue.push(neighborId);
            await AttackLog.create({
              attackerId: startNodeId,
              victimId:   neighborId,
              eventType:  'node_compromised',
              message:    `✗ ${neighbor.name} compromised`,
            });
            // Emit node update for real-time UI sync
            io.emit('node:updated', { node: updatedNode });
          }
        }
      }

      if (compromised.length > 0 || blocked.length > 0) {
        io.emit('attack:wave', { compromised, blocked });
      }

      if (nextQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      queue = nextQueue;
    }

    // Log attack completion
    await AttackLog.create({
      attackerId: startNodeId,
      eventType: 'attack_complete',
      message: 'Attack simulation completed - infection wave finished',
    });

    io.emit('attack:complete', { message: 'Infection wave complete' });

  } catch (err) {
    console.error('BFS Error:', err.message);
    io.emit('attack:error', { message: err.message });
  }
}

// ── Reset Network Function ────────────────────────────
async function resetNetwork(io) {
  try {
    await Node.updateMany({},                  { $set: { status: 'secure'  } });
    await Node.updateMany({ hasFirewall: false },{ $set: { status: 'warning' } });

    // Clear all attack logs on reset
    await AttackLog.deleteMany({});

    // Create a reset log entry (attackerId can be null for system events)
    await AttackLog.create({
      attackerId: null,
      eventType: 'reset',
      message: 'Network reset - all attack logs cleared',
    });

    const nodes = await Node.find().lean(); // lean() — plain JS objects

    io.emit('reset:done', {
      nodes,
      message: 'Network reset complete',
    });

    console.log('🔄 Network reset — broadcast to all clients');
  } catch (err) {
    console.error('Reset Error:', err.message);
    io.emit('attack:error', { message: 'Reset failed: ' + err.message });
  }
}

// ── Main Socket Handler ───────────────────────────────
module.exports = (io) => {

  // ── JWT Auth Middleware ───────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user   = decoded;
      console.log(`🔐 Socket auth: ${decoded.username} (${decoded.role})`);
      next();
    } catch (err) {
      console.error('❌ Socket auth failed:', err.message);
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🟢 Connected: ${socket.user.username} (${socket.user.role}) — ${socket.id}`);

    socket.on('ping', () => {
      socket.emit('pong', {
        message: 'CY-GRAPH socket alive',
        user:    socket.user.username,
        time:    new Date().toISOString(),
      });
    });

    // ── Attack — admin only ─────────────────────────
    socket.on('attack:start', async ({ nodeId }) => {
      if (socket.user.role !== 'admin') {
        socket.emit('auth:error', { message: 'Admin access required' });
        console.warn(`⛔ Attack blocked — ${socket.user.username} is not admin`);
        return;
      }

      // Validate node exists
      try {
        const targetNode = await Node.findById(nodeId);
        if (!targetNode) {
          socket.emit('attack:error', { message: 'Target node not found' });
          return;
        }
      } catch (err) {
        socket.emit('attack:error', { message: 'Invalid node ID' });
        return;
      }

      console.log(`⚡ Attack by ${socket.user.username} on: ${nodeId}`);
      await runBFS(io, nodeId);
    });

    // ── Reset — admin only ──────────────────────────
    socket.on('reset:network', async () => {
      if (socket.user.role !== 'admin') {
        socket.emit('auth:error', { message: 'Admin access required' });
        return;
      }
      console.log(`🔄 Reset by ${socket.user.username}`);
      await resetNetwork(io);
    });

    // ── Add node — admin only ───────────────────────
    socket.on('node:add', async (nodeData) => {
      if (socket.user.role !== 'admin') {
        socket.emit('auth:error', { message: 'Admin access required' });
        return;
      }
      try {
        const node = await Node.create(nodeData);
        io.emit('node:added', { node });
        console.log(`➕ Node added by ${socket.user.username}: ${node.name}`);
      } catch (err) {
        socket.emit('node:error', { message: err.message });
      }
    });

    // ── Save position — all users ───────────────────
    socket.on('node:position', async ({ nodeId, x, y }) => {
      try {
        await Node.findByIdAndUpdate(nodeId, { position: { x, y } });
      } catch (err) {
        console.error('Position save error:', err.message);
      }
    });

    // ── Toggle firewall — admin only ────────────────
    socket.on('node:firewall', async ({ nodeId, hasFirewall }) => {
      if (socket.user.role !== 'admin') {
        socket.emit('auth:error', { message: 'Admin access required' });
        return;
      }
      try {
        const node = await Node.findByIdAndUpdate(
          nodeId,
          { hasFirewall },
          { new: true }
        );
        io.emit('node:updated', { node });
        console.log(`🛡 Firewall toggled by ${socket.user.username} on ${node.name}: ${hasFirewall}`);
      } catch (err) {
        socket.emit('node:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Disconnected: ${socket.user.username} — ${socket.id}`);
    });
  });
};
