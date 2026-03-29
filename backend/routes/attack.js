const express = require('express');
const router = express.Router();
const AttackLog = require('../models/AttackLog');

// GET all logs (paginated)
router.get('/logs', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const logs = await AttackLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('attackerId', 'name')
      .populate('victimId',   'name')
      .populate('blockedById','name');

    const total = await AttackLog.countDocuments();

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE clear all logs
router.delete('/logs', async (req, res) => {
  try {
    await AttackLog.deleteMany({});
    res.json({ success: true, message: 'All logs cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;