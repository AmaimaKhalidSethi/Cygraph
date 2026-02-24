const Node      = require('../models/Node');
const Edge      = require('../models/Edge');
const AttackLog = require('../models/AttackLog');

// ── BFS Attack Propagation ──────────────────────────────
async function runBFS(io, startNodeId) {
  try {
    // Load full graph from MongoDB
    const allNodes = await Node.find();
    const allEdges = await Edge.find();

    // Build adjacency map: nodeId → [connectedNodeIds]
    const adjacency = {};
    allNodes.forEach((n) => {
      adjacency[n._id.toString()] = [];
    });

    allEdges.forEach((e) => {
      const src = e.source.toString();
      const tgt = e.target.toString();
      if (adjacency[src]) adjacency[src].push(tgt);
      if (adjacency[tgt]) adjacency[tgt].push(src);
    });

    // Mark start node as compromised
    await Node.findByIdAndUpdate(startNodeId, { status: 'compromised' });

    await AttackLog.create({
      attackerId: startNodeId,
      victimId:   startNodeId,
      eventType:  'attack_start',
      message:    `Attack initiated on ${allNodes.find(n => n._id.toString() === startNodeId)?.name}`,
    });

    io.emit('attack:spread', {
      compromised: [startNodeId],
      blocked:     [],
      message:     `⚡ Attack started`,
    });

    // BFS
    const visited = new Set([startNodeId]);
    let   queue   = [startNodeId];

    while (queue.length > 0) {
      const nextQueue    = [];
      const compromised  = [];
      const blocked      = [];

      for (const currentId of queue) {
        const neighbors = adjacency[currentId] || [];

        for (const neighborId of neighbors) {
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);

          const neighborNode = allNodes.find(
            (n) => n._id.toString() === neighborId
          );
          if (!neighborNode) continue;

          if (neighborNode.hasFirewall) {
            // Firewall blocks the attack
            blocked.push(neighborId);

            await AttackLog.create({
              attackerId: startNodeId,
              blockedById: neighborId,
              eventType:  'node_blocked',
              message:    `🛡 ${neighborNode.name} blocked by firewall`,
            });

          } else {
            // Node gets compromised
            await Node.findByIdAndUpdate(neighborId, { status: 'compromised' });
            compromised.push(neighborId);
            nextQueue.push(neighborId);

            await AttackLog.create({
              attackerId: startNodeId,
              victimId:   neighborId,
              eventType:  'node_compromised',
              message:    `✗ ${neighborNode.name} compromised`,
            });
          }
        }
      }

      // Broadcast this wave to ALL devices
      if (compromised.length > 0 || blocked.length > 0) {
        io.emit('attack:wave', { compromised, blocked });
      }

      // Wait 800ms before next wave (visual effect)
      if (nextQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      queue = nextQueue;
    }

    // Attack complete
    io.emit('attack:complete', {
      message: 'Infection wave complete',
    });

  } catch (err) {
    console.error('BFS Error:', err.message);
    io.emit('attack:error', { message: err.message });
  }
}

// ── Reset Network ───────────────────────────────────────
async function resetNetwork(io) {
  try {
    await Node.updateMany({}, { $set: { status: 'secure' } });
    await Node.updateMany({ hasFirewall: false }, { $set: { status: 'warning' } });

    const nodes = await Node.find();

    await AttackLog.create({
      attackerId: nodes[0]._id,
      eventType:  'reset',
      message:    'Network reset — all systems nominal',
    });

    io.emit('reset:done', {
      nodes,
      message: 'Network reset complete',
    });

    console.log('🔄 Network reset broadcast to all devices');
  } catch (err) {
    console.error('Reset Error:', err.message);
  }
}

// ── Main Socket Handler ─────────────────────────────────
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🟢 Device connected:    ${socket.id}`);

    // ── Ping test ─────────────────────────────────────
    socket.on('ping', () => {
      socket.emit('pong', {
        message: 'CY-GRAPH socket alive',
        time:    new Date().toISOString(),
      });
    });

    // ── Attack start ──────────────────────────────────
    socket.on('attack:start', async ({ nodeId }) => {
      console.log(`⚡ Attack started on node: ${nodeId}`);
      await runBFS(io, nodeId);
    });

    // ── Reset network ─────────────────────────────────
    socket.on('reset:network', async () => {
      console.log('🔄 Reset requested');
      await resetNetwork(io);
    });

    // ── Add node ──────────────────────────────────────
    socket.on('node:add', async (nodeData) => {
      try {
        const node = await Node.create(nodeData);
        io.emit('node:added', { node });
        console.log(`➕ Node added: ${node.name}`);
      } catch (err) {
        socket.emit('node:error', { message: err.message });
      }
    });

    // ── Save node position (drag) ─────────────────────
    socket.on('node:position', async ({ nodeId, x, y }) => {
      try {
        await Node.findByIdAndUpdate(nodeId, {
          position: { x, y },
        });
      } catch (err) {
        console.error('Position save error:', err.message);
      }
    });

    // ── Toggle firewall ───────────────────────────────
    socket.on('node:firewall', async ({ nodeId, hasFirewall }) => {
      try {
        const node = await Node.findByIdAndUpdate(
          nodeId,
          { hasFirewall },
          { new: true }
        );
        io.emit('node:updated', { node });
        console.log(`🛡 Firewall toggled on ${node.name}: ${hasFirewall}`);
      } catch (err) {
        socket.emit('node:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Device disconnected: ${socket.id}`);
    });
  });
};