import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors());

// Logger
app.use((req, res, next) => {
  console.log(`[GATEWAY]: Intercepted ${req.method} ${req.originalUrl}`);
  next();
});

// Self-Health Check (Handles both single and double /api prefix)
app.get(['/api/health', '/api/api/health'], (req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

// --- HELPER FUNCTION: PRESERVES THE FULL URL ---
const keepFullUrl = (target: string) => ({
  target,
  changeOrigin: true,
  // This is the magic: It ignores Express's chopping and forces the full path
  pathRewrite: (path: string, req: express.Request) => req.originalUrl,
});

// --- ROUTES ---
app.use('/api/auth', createProxyMiddleware(keepFullUrl('http://auth-service:4004')));
app.use('/api/services', createProxyMiddleware(keepFullUrl('http://services-service:4001')));
app.use('/api/releases', createProxyMiddleware(keepFullUrl('http://releases-service:4002')));
app.use('/api/incidents', createProxyMiddleware(keepFullUrl('http://incidents-service:4003')));
app.use('/api/incident/health', createProxyMiddleware(keepFullUrl('http://incidents-service:4003')));
app.use('/api/noti-service', createProxyMiddleware({
  target: 'http://noti-service:4005',
  changeOrigin: true,
  pathRewrite: keepFullUrl,
}));


// Global JSON 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Gateway: Route not found", path: req.originalUrl });
});

app.listen(4000, () => console.log('🚀 GATEWAY LIVE (FULL URL PRESERVATION MODE)'));
