import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

// --- 1. Gateway Internal Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

// --- 2. Auth Service (Port 4004) ---
app.use('/api/auth', createProxyMiddleware({
  target: 'http://auth-service:4004',
  changeOrigin: true,
}));

// --- 3. Services Management (Port 4001) ---
app.use('/api/services', createProxyMiddleware({
  target: 'http://services-service:4001',
  changeOrigin: true,
}));

// --- 4. Releases Management (Port 4002) ---
app.use('/api/releases', createProxyMiddleware({
  target: 'http://releases-service:4002',
  changeOrigin: true,
}));

// --- 5. Incident Response (Port 4005) ---
// Note: We updated the target to incident-service:4005 to match our new deployment
app.use('/api/incidents', createProxyMiddleware({
  target: 'http://incident-service:4005',
  changeOrigin: true,
}));

// --- 6. Incident Health Check (Dashboard Pulse) ---
// This specific route is what makes the "Incident Response" card turn green!
app.use('/api/incident/health', createProxyMiddleware({
  target: 'http://incident-service:4005',
  changeOrigin: true,
}));

app.listen(port, () => {
  console.log(`🚀 ReleasePilot API Gateway is patrolling on port ${port}`);
});
