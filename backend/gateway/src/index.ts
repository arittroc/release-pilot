import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors());

// THE LOGGING FIX: This will show you exactly what is failing
app.use((req, res, next) => {
  console.log(`[GATEWAY INCOMING]: ${req.method} ${req.url}`);
  next();
});

// Helper to create a non-stripping proxy
const proxy = (target: string) => createProxyMiddleware({
  target,
  changeOrigin: true,
  // pathRewrite is REMOVED to prevent 404s on the backend
});

app.use('/api/auth', proxy('http://auth-service:4004'));
app.use('/api/services', proxy('http://services-service:4001'));
app.use('/api/releases', proxy('http://releases-service:4002'));
app.use('/api/incidents', proxy('http://incidents-service:4003'));

// Global 404 Handler for the Gateway
app.use((req, res) => {
  console.log(`[GATEWAY 404]: No match for ${req.url}`);
  res.status(404).json({ error: "Gateway: Route not found", path: req.url });
});

app.listen(4000, () => console.log('🚀 GATEWAY SYNCED & LOGGING'));
