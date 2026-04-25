import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 4004;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/auth/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.get('/api/auth', (req, res) => {
  res.json({ message: "Auth Service is live" });
});

app.listen(port, () => {
  console.log(`🔐 Auth Service running on port ${port}`);
});
