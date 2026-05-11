import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { connectDB } from './config/db.js';
import { initSockets } from './sockets/index.js';
import authRoutes from './routes/auth.js';
import restaurantRoutes from './routes/restaurants.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payment.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB(process.env.MONGO_URI);
  const server = http.createServer(app);
  initSockets(server, process.env.CLIENT_ORIGIN || '*');
  server.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
