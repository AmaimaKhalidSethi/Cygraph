const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ─────────────────────────────────────────────
app.use('/api/nodes',    require('./routes/nodes'));
app.use('/api/edges',    require('./routes/edges'));
app.use('/api/attack',   require('./routes/attack'));
app.use('/api/firewall', require('./routes/firewall'));

// ── Health Check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CY-GRAPH backend is running',
    time: new Date().toISOString(),
    routes: ['/api/nodes', '/api/edges', '/api/attack', '/api/firewall'],
  });
});

// ── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

// ── MongoDB + Server Start ───────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected');
    app.listen(process.env.PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
      console.log(`🌐 Open: http://localhost:${process.env.PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });