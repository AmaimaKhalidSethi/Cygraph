const express = require('express');
const router = express.Router();
const Edge = require('../models/Edge');

// GET all edges
router.get('/', async (req, res) => {
  try {
    const edges = await Edge.find()
      .populate('source', 'name type ip status')
      .populate('target', 'name type ip status');
    res.json({ success: true, count: edges.length, data: edges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create edge
router.post('/', async (req, res) => {
  try {
    const edge = await Edge.create(req.body);
    const populated = await edge.populate('source target');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE edge
router.delete('/:id', async (req, res) => {
  try {
    const edge = await Edge.findByIdAndDelete(req.params.id);
    if (!edge) return res.status(404).json({ success: false, error: 'Edge not found' });
    res.json({ success: true, message: 'Edge deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;