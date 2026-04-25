import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 4003;

app.use(cors());
app.use(express.json());

app.get('/api/incidents/health', (req, res) => { res.json({ status: 'ok' }); });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'incidents-service' });
});

// Get all incidents
app.get('/api/incidents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ops.incidents ORDER BY started_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// Get events for a specific incident
app.get('/api/incidents/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM ops.incident_events WHERE incident_id = $1 ORDER BY created_at ASC', [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch incident events' });
  }
});

app.listen(port, () => {
  console.log(`Incidents Service is running on port ${port}`);
});
