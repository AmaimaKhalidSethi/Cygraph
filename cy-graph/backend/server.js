const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const morgan     = require('morgan');
const http       = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

// ── Socket.io setup ─────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ── Make io accessible in routes if needed ──────────────
app.set('io', io);

// ── Middleware ──────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ─────────────────────────────────────────────
app.use('/api/nodes',    require('./routes/nodes'));
app.use('/api/edges',    require('./routes/edges'));
app.use('/api/attack',   require('./routes/attack'));
app.use('/api/firewall', require('./routes/firewall'));
app.use('/api/vulnerabilities', require('./routes/vulnerabilities'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/vulnerabilities', require('./routes/vulnerabilities'));


// ── Health Check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'ok',
    message: 'CY-GRAPH backend is running',
    time:    new Date().toISOString(),
    sockets: io.engine.clientsCount,
    routes:  ['/api/nodes', '/api/edges', '/api/attack', '/api/firewall'],
  });
});

// ── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

// ── Socket Handler ──────────────────────────────────────
require('./socket/attackHandler')(io);

// ── MongoDB + Server Start ───────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected');
    server.listen(process.env.PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
      console.log(`🌐 Open: http://localhost:${process.env.PORT}/api/health`);
      console.log(`📡 Socket.io ready for connections`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });