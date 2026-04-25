import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

// This explicitly tells Express NOT to strip the path during the handoff
const preservePath = (path: string, req: express.Request) => req.originalUrl;

app.use('/api/auth', createProxyMiddleware({ 
  target: 'http://auth-service:4004', 
  changeOrigin: true,
  pathRewrite: preservePath
}));

app.use('/api/services', createProxyMiddleware({ 
  target: 'http://services-service:4001', 
  changeOrigin: true,
  pathRewrite: preservePath
}));

app.use('/api/releases', createProxyMiddleware({ 
  target: 'http://releases-service:4002', 
  changeOrigin: true,
  pathRewrite: preservePath
}));

app.use('/api/incidents', createProxyMiddleware({ 
  target: 'http://incidents-service:4003', 
  changeOrigin: true,
  pathRewrite: preservePath
}));

app.listen(port, () => {
  console.log(`🚀 API Gateway is running on port ${port}`);
});
