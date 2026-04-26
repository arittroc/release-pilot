import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

// Gateway internal health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

// --- CLUSTER-ALIGNED ROUTES ---

// 1. Auth Service (Port 4004)
app.use('/api/auth', createProxyMiddleware({
  target: 'http://auth-service:4004',
  changeOrigin: true,
  // We DO NOT strip the path because your backend routes include /api/auth
}));

// 2. Services Management (Port 4001)
app.use('/api/services', createProxyMiddleware({
  target: 'http://services-service:4001',
  changeOrigin: true,
}));

// 3. Releases Management (Port 4002)
app.use('/api/releases', createProxyMiddleware({
  target: 'http://releases-service:4002',
  changeOrigin: true,
}));

// 4. Incident Response (MATCHED TO PORT 4003 PER YOUR SVC LIST)
app.use('/api/incidents', createProxyMiddleware({
  target: 'http://incidents-service:4003',
  changeOrigin: true,
}));

// 5. Incident Health Pulse
app.use('/api/incident/health', createProxyMiddleware({
  target: 'http://incidents-service:4003',
  changeOrigin: true,
}));

app.listen(port, () => {
  console.log(`🚀 Gateway Synced with Cluster on port ${port}`);
});
