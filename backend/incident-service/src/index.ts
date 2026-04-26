import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { authenticateToken } from './middleware/auth';

dotenv.config();
const app = express();
const port = process.env.PORT || 4003; // Matched to your SVC port

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:skyie%40123@postgres:5432/releasepilot',
});

// Health Check (Matches plural slug logic from React)
app.get('/api/incidents/health', (req, res) => {
  res.json({ status: 'ok', service: 'incident-service' });
});

app.get('/api/incidents', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM incidents ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
});

app.post('/api/incidents', authenticateToken, async (req, res, next) => {
  const { service_name, issue_description, severity } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO incidents (service_name, issue_description, severity) VALUES ($1, $2, $3) RETURNING *',
      [service_name, issue_description, severity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(port, () => console.log(`🚨 Incident Service on port ${port}`));
