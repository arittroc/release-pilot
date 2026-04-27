import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors());

// Logger
app.use((req, res, next) => {
  console.log(`[GATEWAY INCOMING]: ${req.method} ${req.url}`);
  next();
});

// --- CONTEXT-BASED PROXIES ---
// This guarantees that /api/auth/login stays exactly /api/auth/login

app.use(createProxyMiddleware('/api/auth', {
  target: 'http://auth-service:4004',
  changeOrigin: true,
}));

app.use(createProxyMiddleware('/api/services', {
  target: 'http://services-service:4001',
  changeOrigin: true,
}));

app.use(createProxyMiddleware('/api/releases', {
  target: 'http://releases-service:4002',
  changeOrigin: true,
}));

app.use(createProxyMiddleware('/api/incidents', {
  target: 'http://incidents-service:4003',
  changeOrigin: true,
}));

app.use(createProxyMiddleware('/api/incident/health', {
  target: 'http://incidents-service:4003',
  changeOrigin: true,
}));

// Global JSON 404 Handler
app.use((req, res) => {
  console.log(`[GATEWAY 404]: No match for ${req.url}`);
  res.status(404).json({ error: "Gateway: Route not found", path: req.url });
});

app.listen(4000, () => console.log('🚀 GATEWAY LIVE (CONTEXT-PROXY MODE)'));
