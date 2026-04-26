import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

// Gateway internal health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

// --- AUTH SERVICE (Port 4004) ---
app.use('/api/auth', createProxyMiddleware({
  target: 'http://auth-service:4004',
  changeOrigin: true,
  // This ensures /api/auth/login stays /api/auth/login when it hits the service
  pathRewrite: { '^/api/auth': '/api/auth' } 
}));

// --- SERVICES API (Port 4001) ---
app.use('/api/services', createProxyMiddleware({
  target: 'http://services-service:4001',
  changeOrigin: true,
  pathRewrite: { '^/api/services': '/api/services' }
}));

// --- RELEASES API (Port 4002) ---
app.use('/api/releases', createProxyMiddleware({
  target: 'http://releases-service:4002',
  changeOrigin: true,
  pathRewrite: { '^/api/releases': '/api/releases' }
}));

// --- INCIDENT RESPONSE (Port 4005) ---
app.use('/api/incidents', createProxyMiddleware({
  target: 'http://incident-service:4005',
  changeOrigin: true,
  pathRewrite: { '^/api/incidents': '/api/incidents' }
}));

// --- INCIDENT HEALTH (Dashboard Pulse) ---
app.use('/api/incident/health', createProxyMiddleware({
  target: 'http://incident-service:4005',
  changeOrigin: true,
  pathRewrite: { '^/api/incident/health': '/api/incident/health' }
}));

app.listen(port, () => {
  console.log(`🚀 Gateway Bridge Restored on port ${port}`);
});
