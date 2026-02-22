const express = require('express');
const router = express.Router();
const FirewallRule = require('../models/FirewallRule');

// GET all rules
router.get('/rules', async (req, res) => {
  try {
    const rules = await FirewallRule.find().sort({ createdAt: 1 });
    res.json({ success: true, count: rules.length, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create rule
router.post('/rules', async (req, res) => {
  try {
    const rule = await FirewallRule.create(req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update rule (toggle enable, change action etc)
router.put('/rules/:id', async (req, res) => {
  try {
    const rule = await FirewallRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await FirewallRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, message: `Rule ${rule.name} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;