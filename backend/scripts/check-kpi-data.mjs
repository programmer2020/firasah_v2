// Quick diagnostic to see real counts for KPI cards
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

const run = async () => {
  const q = async (title, sql) => {
    const r = await pool.query(sql);
    console.log('---', title, '---');
    console.table(r.rows);
  };

  // 1. date context
  await q('Date params', `
    SELECT
      CURRENT_DATE::text AS today,
      DATE_TRUNC('month', CURRENT_DATE)::date::text AS current_month_start,
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date::text AS prev_month_start
  `);

  // 2. lectures per month (all)
  await q('Lectures by month (from lecture + sound_files)', `
    SELECT
      DATE_TRUNC('month', sf.created_at)::date AS month,
      sf.user_id,
      COUNT(DISTINCT l.lecture_id) AS lecture_ct,
      COUNT(DISTINCT sf.file_id) AS file_ct,
      COUNT(DISTINCT st.teacher_id) AS teacher_ct,
      ROUND(COALESCE(SUM(CAST(f.duration AS numeric))/3600.0, 0), 2) AS hours
    FROM lecture l
    INNER JOIN sound_files sf ON l.file_id = sf.file_id
    LEFT JOIN section_time_slots st ON l.time_slot_id = st.time_slot_id
    LEFT JOIN fragments f ON f.file_id = sf.file_id
    GROUP BY 1,2
    ORDER BY 1 DESC
  `);

  // 3. What's in dashboard_fact_lectures
  await q('dashboard_fact_lectures content', `
    SELECT
      DATE_TRUNC('month', dfl.created_at)::date AS month,
      COUNT(*) AS row_ct,
      COUNT(DISTINCT dfl.lecture_id) AS distinct_lecture,
      COUNT(DISTINCT dfl.file_id) AS distinct_file,
      COUNT(DISTINCT dfl.teacher_id) AS distinct_teacher
    FROM dashboard_fact_lectures dfl
    GROUP BY 1
    ORDER BY 1 DESC
  `);

  // 4. Login events schema
  await q('login_events columns', `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'login_events'
    ORDER BY ordinal_position
  `);

  // 5. All users
  await q('Users', `
    SELECT user_id, name, created_at::date
    FROM users
    ORDER BY user_id
  `);

  // 6. login_events
  await q('Login events by month', `
    SELECT
      DATE_TRUNC('month', login_timestamp)::date AS month,
      COUNT(*) AS total_logins,
      COUNT(DISTINCT user_id) AS distinct_users
    FROM login_events
    GROUP BY 1
    ORDER BY 1 DESC
  `);

  // 7. lecture columns
  await q('lecture columns', `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'lecture'
    ORDER BY ordinal_position
  `);

  // 8. fragments - total duration per file per month
  await q('Fragments duration by file/month', `
    SELECT
      DATE_TRUNC('month', sf.created_at)::date AS month,
      sf.user_id,
      COUNT(DISTINCT sf.file_id) AS file_ct,
      ROUND(COALESCE(SUM(CAST(f.duration AS numeric))/3600.0, 0), 2) AS hours_from_fragments
    FROM fragments f
    INNER JOIN sound_files sf ON f.file_id = sf.file_id
    GROUP BY 1, 2
    ORDER BY 1 DESC, 2
  `);

  // 9. lecture.duration sum (excluding duplicates)
  await q('Unique sound_files with one lecture per file', `
    SELECT
      DATE_TRUNC('month', sf.created_at)::date AS month,
      sf.user_id,
      COUNT(DISTINCT sf.file_id) AS files,
      ROUND(COALESCE(SUM(DISTINCT CAST(l.duration AS numeric))/3600.0, 0), 2) AS hours_from_lecture
    FROM sound_files sf
    LEFT JOIN lecture l ON l.file_id = sf.file_id
    GROUP BY 1, 2
    ORDER BY 1 DESC, 2
  `);

  await pool.end();
};

run().catch((e) => { console.error(e); process.exit(1); });
