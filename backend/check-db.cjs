require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try { await p.query("REFRESH MATERIALIZED VIEW dashboard_fact_lectures"); console.log('Refreshed dashboard_fact_lectures'); } catch(e) { console.log('MV refresh failed:', e.message); }
  try { await p.query("REFRESH MATERIALIZED VIEW dashboard_fact_evidences"); console.log('Refreshed dashboard_fact_evidences'); } catch(e) { console.log('MV refresh failed:', e.message); }
  await p.end();
})();
