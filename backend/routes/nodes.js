const express = require('express');
const router = express.Router();
const Node = require('../models/Node');
const Edge = require('../models/Edge');

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

    // Delete all edges connected to this node
    const edgeResult = await Edge.deleteMany({
      $or: [{ source: req.params.id }, { target: req.params.id }]
    });

    res.json({
      success: true,
      message: `${node.name} deleted`,
      edgesRemoved: edgeResult.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;