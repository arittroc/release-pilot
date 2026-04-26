import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:skyie%40123@postgres:5432/releasepilot'
});

async function fix() {
  try {
    // 1. Generate a real mathematical hash for "admin123"
    const hash = await bcrypt.hash('admin123', 10);
    
    // 2. Clear out the old fake admin
    await pool.query("DELETE FROM users WHERE username = 'admin'");
    
    // 3. Insert the real one
    await pool.query("INSERT INTO users (username, password_hash, role) VALUES ('admin', $1, 'admin')", [hash]);
    
    console.log('✅ Admin user created with a REAL bcrypt hash!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fix();
