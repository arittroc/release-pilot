import { pool } from './src/db/index';
import bcrypt from 'bcrypt';

async function seed() {
  try {
    console.log('🔨 Building users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);
    console.log('✅ Table created!');

    console.log('🔐 Hashing password...');
    const hash = await bcrypt.hash('admin123', 10);
    
    await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      ['admin', hash]
    );
    console.log('🚀 Admin user injected successfully!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

seed();
