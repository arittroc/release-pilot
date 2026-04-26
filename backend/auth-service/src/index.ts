import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4004; // Auth service runs on 4004

// We need a super-secret key to sign the tokens. 
// In a real app, this goes in a .env file!
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-releasepilot-key-2026';

app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:skyie%40123@postgres:5432/releasepilot',
});

// Health Check (Required for your dashboard's green pulse!)
app.get('/api/auth/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// The Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check if the user exists in the database
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // 2. Compare the typed password with the hashed password in the DB
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Generate the JWT (The "Digital ID Badge")
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' } // Badge expires in 24 hours
    );

    // 4. Send the badge back to the frontend
    res.json({
      message: 'Login successful',
      token,
      user: { username: user.username, role: user.role }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`🔐 Auth Service is running on port ${port}`);
});
