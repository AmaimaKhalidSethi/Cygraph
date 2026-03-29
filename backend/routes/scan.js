const express = require('express');
const router  = express.Router();
const Node    = require('../models/Node');

// Common ports list
const COMMON_PORTS = [
  { port: 21,    service: 'FTP',              dangerous: true  },
  { port: 22,    service: 'SSH',              dangerous: false },
  { port: 23,    service: 'Telnet (DANGER!)', dangerous: true  },
  { port: 25,    service: 'SMTP',             dangerous: false },
  { port: 53,    service: 'DNS',              dangerous: false },
  { port: 80,    service: 'HTTP',             dangerous: false },
  { port: 443,   service: 'HTTPS',            dangerous: false },
  { port: 445,   service: 'SMB',              dangerous: true  },
  { port: 3306,  service: 'MySQL',            dangerous: true  },
  { port: 3389,  service: 'RDP (EXPOSED!)',   dangerous: true  },
  { port: 5432,  service: 'PostgreSQL',       dangerous: false },
  { port: 6379,  service: 'Redis',            dangerous: true  },
  { port: 8080,  service: 'HTTP-Alt',         dangerous: false },
  { port: 27017, service: 'MongoDB (DANGER!)',dangerous: true  },
  { port: 1883,  service: 'MQTT',             dangerous: true  },
];

// POST /api/scan — start scan, results via socket
router.post('/', async (req, res) => {
  try {
    const { ip, socketId } = req.body;
    if (!ip) return res.status(400).json({ success: false, error: 'IP required' });

    // Find node by IP in MongoDB
    const node = await Node.findOne({ ip });
    const io   = req.app.get('io');

    res.json({ success: true, message: 'Scan started', ip });

    // Stream results via socket with delay
    let i = 0;
    const interval = setInterval(async () => {
      if (i >= COMMON_PORTS.length) {
        clearInterval(interval);
        io.emit('scan:complete', { ip, total: COMMON_PORTS.length });
        return;
      }

      const { port, service, dangerous } = COMMON_PORTS[i];

      // Determine state based on node data
      let state = 'closed';
      if (node) {
        if (node.type === 'server'   && [22, 80, 443, 8080].includes(port)) state = 'open';
        if (node.type === 'database' && [3306, 5432, 27017].includes(port)) state = 'open';
        if (node.type === 'router'   && [22, 53, 80].includes(port))        state = 'open';
        if (node.type === 'iot'      && [23, 80, 1883, 8080].includes(port))state = 'open';
        if (!node.hasFirewall        && dangerous)                           state = 'open';
        if ([53, 5432].includes(port))                                       state = 'filtered';
      } else {
        // Unknown IP — random results
        state = Math.random() > 0.6 ? 'open' : Math.random() > 0.5 ? 'closed' : 'filtered';
      }

      io.emit('scan:result', {
        port, service, state, dangerous,
        progress: Math.round(((i + 1) / COMMON_PORTS.length) * 100),
      });

      i++;
    }, 350);

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;