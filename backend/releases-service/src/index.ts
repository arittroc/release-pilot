import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

app.get('/api/releases/health', (req, res) => { res.json({ status: 'ok' }); });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'releases-service' });
});

// Get all releases
app.get('/api/releases', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM delivery.releases ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

app.listen(port, () => {
  console.log(`Releases Service is running on port ${port}`);
});
