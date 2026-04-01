/**
 * Migration: Rename PK columns from `id` to `table_name_id`
 *
 * Tables affected:
 *   users.id       → users.user_id
 *   lecture.id      → lecture.lecture_id
 *   fragments.id    → fragments.fragment_id
 *   evidences.id    → evidences.evidence_id
 *   evaluations.id  → evaluations.evaluation_id
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const renames = [
  { table: 'users',       oldCol: 'id', newCol: 'user_id' },
  { table: 'lecture',      oldCol: 'id', newCol: 'lecture_id' },
  { table: 'fragments',    oldCol: 'id', newCol: 'fragment_id' },
  { table: 'evidences',    oldCol: 'id', newCol: 'evidence_id' },
  { table: 'evaluations',  oldCol: 'id', newCol: 'evaluation_id' },
];

async function run() {
  const client = await pool.connect();
  try {
    for (const { table, oldCol, newCol } of renames) {
      // Check if old column exists
      const check = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      `, [table, oldCol]);

      if (check.rows.length === 0) {
        // Check if already renamed
        const check2 = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = $2
        `, [table, newCol]);

        if (check2.rows.length > 0) {
          console.log(`✅ ${table}.${newCol} — already renamed, skipping`);
        } else {
          console.log(`⚠️  ${table} — neither '${oldCol}' nor '${newCol}' found, skipping`);
        }
        continue;
      }

      console.log(`🔄 Renaming ${table}.${oldCol} → ${table}.${newCol} ...`);
      await client.query(`ALTER TABLE "${table}" RENAME COLUMN "${oldCol}" TO "${newCol}"`);
      console.log(`✅ ${table}.${newCol} — done`);
    }

    console.log('\n🎉 All PK columns renamed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
