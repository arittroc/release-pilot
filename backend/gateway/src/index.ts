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

// --- HELPER: This prevents the proxy from stripping the "/api" prefix ---
const proxyOptions = (target: string) => ({
  target,
  changeOrigin: true,
  // This ensures the full path (e.g., /api/services) is sent to the backend
  pathRewrite: async (path: string) => path, 
});

// --- ROUTES ---

// Auth Service (Port 4004)
app.use('/api/auth', createProxyMiddleware(proxyOptions('http://auth-service:4004')));

// Services Management (Port 4001)
app.use('/api/services', createProxyMiddleware(proxyOptions('http://services-service:4001')));

// Releases Management (Port 4002)
app.use('/api/releases', createProxyMiddleware(proxyOptions('http://releases-service:4002')));

// Incident Response (Port 4005)
app.use('/api/incidents', createProxyMiddleware(proxyOptions('http://incident-service:4005')));

// Incident Health Pulse (Used by Dashboard)
app.use('/api/incident/health', createProxyMiddleware(proxyOptions('http://incident-service:4005')));

app.listen(port, () => {
  console.log(`🚀 Gateway Bridge Re-established on port ${port}`);
});
