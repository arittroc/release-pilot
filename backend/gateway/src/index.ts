import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors());

// The Logger: Still active so we can watch the traffic
app.use((req, res, next) => {
  console.log(`[GATEWAY INCOMING]: ${req.method} ${req.url}`);
  next();
});

// 1. AUTH SERVICE: Strips the prefix (so /api/auth/login becomes /login)
app.use('/api/auth', createProxyMiddleware({
  target: 'http://auth-service:4004',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' }, 
}));

// 2. SERVICES API: Strips the prefix
app.use('/api/services', createProxyMiddleware({
  target: 'http://services-service:4001',
  changeOrigin: true,
  pathRewrite: { '^/api/services': '' },
}));

// 3. RELEASES API: Strips the prefix
app.use('/api/releases', createProxyMiddleware({
  target: 'http://releases-service:4002',
  changeOrigin: true,
  pathRewrite: { '^/api/releases': '' },
}));

// 4. INCIDENTS API: NOT stripped (because we hardcoded the full /api/incidents path yesterday)
app.use('/api/incidents', createProxyMiddleware({
  target: 'http://incidents-service:4003',
  changeOrigin: true,
}));

// Global JSON 404 Handler
app.use((req, res) => {
  console.log(`[GATEWAY 404]: No match for ${req.url}`);
  res.status(404).json({ error: "Gateway: Route not found", path: req.url });
});

app.listen(4000, () => console.log('🚀 GATEWAY LIVE & STRIPPING PREFIXES'));
