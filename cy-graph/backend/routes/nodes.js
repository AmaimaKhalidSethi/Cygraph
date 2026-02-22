const express = require('express');
const router = express.Router();
const Node = require('../models/Node');

// GET all nodes
router.get('/', async (req, res) => {
  try {
    const nodes = await Node.find();
    res.json({ success: true, count: nodes.length, data: nodes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single node
router.get('/:id', async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) return res.status(404).json({ success: false, error: 'Node not found' });
    res.json({ success: true, data: node });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create node
router.post('/', async (req, res) => {
  try {
    const node = await Node.create(req.body);
    res.status(201).json({ success: true, data: node });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update node (status, position, firewall etc)
router.put('/:id', async (req, res) => {
  try {
    const node = await Node.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!node) return res.status(404).json({ success: false, error: 'Node not found' });
    res.json({ success: true, data: node });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE node
router.delete('/:id', async (req, res) => {
  try {
    const node = await Node.findByIdAndDelete(req.params.id);
    if (!node) return res.status(404).json({ success: false, error: 'Node not found' });
    res.json({ success: true, message: `Node ${node.name} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT reset all nodes to default status
router.put('/action/reset', async (req, res) => {
  try {
    await Node.updateMany(
      {},
      { $set: { status: 'secure' } }
    );
    // re-set warning for nodes without firewall
    await Node.updateMany(
      { hasFirewall: false },
      { $set: { status: 'warning' } }
    );
    const nodes = await Node.find();
    res.json({ success: true, message: 'Network reset', data: nodes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;