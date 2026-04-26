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

/**
 * FIXED PROXY LOGIC:
 * We use a "context" array to tell the proxy NOT to strip the path.
 * This ensures /api/auth/login reaches the service as /api/auth/login.
 */

// 1. Auth Service (Port 4004)
app.use('/api/auth', createProxyMiddleware({
  target: 'http://auth-service:4004',
  changeOrigin: true,
  pathRewrite: (path) => path, // Keeps the path exactly as it is
}));

// 2. Services API (Port 4001)
app.use('/api/services', createProxyMiddleware({
  target: 'http://services-service:4001',
  changeOrigin: true,
  pathRewrite: (path) => path,
}));

// 3. Releases API (Port 4002)
app.use('/api/releases', createProxyMiddleware({
  target: 'http://releases-service:4002',
  changeOrigin: true,
  pathRewrite: (path) => path,
}));

// 4. Incident Response (Port 4005) - MATCHED TO PLURAL "incidents-service"
app.use('/api/incidents', createProxyMiddleware({
  target: 'http://incidents-service:4005',
  changeOrigin: true,
  pathRewrite: (path) => path,
}));

// 5. Incident Health (Dashboard Pulse)
app.use('/api/incident/health', createProxyMiddleware({
  target: 'http://incidents-service:4005',
  changeOrigin: true,
  pathRewrite: (path) => path,
}));

app.listen(port, () => {
  console.log(`🚀 Gateway Bridge Finalized on port ${port}`);
});
