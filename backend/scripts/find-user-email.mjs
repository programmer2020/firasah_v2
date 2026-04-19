// Find email for user 11 so we can log in
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

const r = await pool.query(`
  SELECT user_id, name, email, role
  FROM users
  WHERE user_id IN (1, 11)
  ORDER BY user_id
`);
console.table(r.rows);
await pool.end();
