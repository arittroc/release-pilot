import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 4001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

app.get('/api/services/health', (req, res) => {
  res.json({ status: 'ok', service: 'services-service' });
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ DATABASE ERROR:", err); // Added this line!
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/services', async (req, res) => {
  const { name, slug, description, owner_team, repo_url } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO services (name, slug, description, owner_team, repo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, slug, description, owner_team, repo_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ INSERT ERROR:", err); // Added this line!
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`📦 Services Service running on port ${port}`);
});
