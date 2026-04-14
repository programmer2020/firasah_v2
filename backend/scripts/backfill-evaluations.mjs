/**
 * Targeted backfill: only evaluates lectures that already have a transcript
 * but no lecture_kpi record. Does NOT delete any existing evidences.
 *
 * Reuses the compiled JS from dist/ so the logic matches the running server.
 */
import 'dotenv/config';
import pg from 'pg';
import { evaluateSpeechAgainstKPIs } from '../dist/services/evaluationsService.js';

const { Pool } = pg;
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

const run = async () => {
  // Pick up lectures that have a transcript (>0 chars) AND zero lecture_kpi rows.
  const { rows: targets } = await pool.query(`
    SELECT l.lecture_id, l.file_id, LENGTH(COALESCE(l.transcript, '')) AS tlen
    FROM lecture l
    WHERE LENGTH(COALESCE(l.transcript, '')) > 0
      AND NOT EXISTS (SELECT 1 FROM lecture_kpi lk WHERE lk.lecture_id = l.lecture_id)
    ORDER BY l.lecture_id
  `);

  if (targets.length === 0) {
    console.log('No lectures need backfilling — all transcribed lectures already have KPI records.');
    await pool.end();
    return;
  }

  console.log(`Found ${targets.length} lecture(s) needing backfill:`);
  console.table(targets);

  let okCt = 0;
  let failCt = 0;
  const failures = [];

  for (const t of targets) {
    const { rows: frags } = await pool.query(
      `SELECT transcript, start_time, end_time
       FROM fragments
       WHERE file_id = $1 AND transcript IS NOT NULL AND transcript <> '[transcription_pending]'
       ORDER BY fragment_order`,
      [t.file_id]
    );

    if (frags.length === 0) {
      console.warn(`[backfill] lecture_id=${t.lecture_id}: no usable fragments, skipping`);
      continue;
    }

    console.log(`[backfill] lecture_id=${t.lecture_id}: ${frags.length} fragment(s)`);
    let lectureOk = true;
    for (const f of frags) {
      const fragStart = Number(f.start_time ?? 0);
      const fragEnd = Number(f.end_time ?? 0);
      if (!f.transcript?.trim()) continue;

      // Retry with exponential backoff (1s, 2s) — same shape as the pipeline fix
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const evals = await evaluateSpeechAgainstKPIs(
            f.transcript, t.lecture_id,
            undefined, undefined,
            fragStart, fragEnd
          );
          console.log(`  ✅ frag ${fragStart}s-${fragEnd}s → ${evals.length} evaluation(s)`);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const status = err?.status || err?.response?.status;
          const retriable = !status || status === 429 || (status >= 500 && status < 600) || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';
          if (attempt < 3 && retriable) {
            const delayMs = 1000 * Math.pow(2, attempt - 1);
            console.warn(`  ⏳ attempt ${attempt} failed: ${err?.message || err}; retrying in ${delayMs}ms`);
            await new Promise(r => setTimeout(r, delayMs));
            continue;
          }
          break;
        }
      }
      if (lastErr) {
        lectureOk = false;
        console.error(`  ❌ frag ${fragStart}s-${fragEnd}s failed:`, lastErr?.message || lastErr);
        failures.push({ lecture_id: t.lecture_id, fragStart, fragEnd, err: lastErr?.message || String(lastErr) });
      }
    }

    if (lectureOk) okCt++; else failCt++;
  }

  console.log('');
  console.log(`=== Backfill summary ===`);
  console.log(`Lectures OK:     ${okCt}`);
  console.log(`Lectures failed: ${failCt}`);
  if (failures.length) {
    console.log('Failures:');
    console.table(failures);
  }

  await pool.end();
};

run().catch((e) => { console.error(e); process.exit(1); });
