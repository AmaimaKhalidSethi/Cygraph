const express       = require('express');
const router        = express.Router();
const Vulnerability = require('../models/Vulnerability');
const Node          = require('../models/Node');

// GET all vulnerabilities
router.get('/', async (req, res) => {
  try {
    const vulns = await Vulnerability.find()
      .populate('affectedNode', 'name type ip')
      .sort({ cvssScore: -1 });
    res.json({ success: true, count: vulns.length, data: vulns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create vulnerability
router.post('/', async (req, res) => {
  try {
    const vuln = await Vulnerability.create(req.body);
    res.status(201).json({ success: true, data: vuln });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update status (patch button)
router.put('/:id', async (req, res) => {
  try {
    const vuln = await Vulnerability.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('affectedNode', 'name type ip');
    if (!vuln) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: vuln });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await Vulnerability.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;