// Run the exact KPI-cards SQL against Neon and show results
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

const sql = `
WITH date_params AS (
  SELECT
    CURRENT_DATE AS today,
    DATE_TRUNC('month', CURRENT_DATE)::date AS current_month_start,
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date AS prev_month_start,
    $3::int AS _kpi_filter_noop,
    $4::int AS _domain_filter_noop
),

lecture_count AS (
  SELECT
    'Lectures' AS metric,
    COUNT(DISTINCT l.lecture_id)
      FILTER (WHERE DATE_TRUNC('month', sf.created_at)::date = dp.current_month_start)
      ::numeric AS current_value,
    COUNT(DISTINCT l.lecture_id)
      FILTER (WHERE DATE_TRUNC('month', sf.created_at)::date = dp.prev_month_start)
      ::numeric AS previous_value
  FROM lecture l
  INNER JOIN sound_files sf ON l.file_id = sf.file_id
  LEFT JOIN section_time_slots st ON l.time_slot_id = st.time_slot_id
  LEFT JOIN classes c ON st.class_id = c.class_id
  CROSS JOIN date_params dp
  WHERE ($1::int IS NULL OR st.subject_id = $1)
    AND ($2::int IS NULL OR st.teacher_id = $2)
    AND ($5::int IS NULL OR c.section_id  = $5)
    AND ($6::int IS NULL OR c.grade_id    = $6)
    AND ($7::int IS NULL OR sf.user_id    = $7)
),

teacher_count AS (
  SELECT
    'Teachers' AS metric,
    COUNT(DISTINCT st.teacher_id)
      FILTER (WHERE DATE_TRUNC('month', sf.created_at)::date = dp.current_month_start)
      ::numeric AS current_value,
    COUNT(DISTINCT st.teacher_id)
      FILTER (WHERE DATE_TRUNC('month', sf.created_at)::date = dp.prev_month_start)
      ::numeric AS previous_value
  FROM lecture l
  INNER JOIN sound_files sf ON l.file_id = sf.file_id
  INNER JOIN section_time_slots st ON l.time_slot_id = st.time_slot_id
  LEFT JOIN classes c ON st.class_id = c.class_id
  CROSS JOIN date_params dp
  WHERE ($1::int IS NULL OR st.subject_id = $1)
    AND ($5::int IS NULL OR c.section_id  = $5)
    AND ($6::int IS NULL OR c.grade_id    = $6)
    AND ($7::int IS NULL OR sf.user_id    = $7)
),

file_durations AS (
  SELECT
    sf.file_id,
    sf.user_id,
    DATE_TRUNC('month', sf.created_at)::date AS month,
    COALESCE(MAX(CAST(l.duration AS numeric)), 0) AS duration_sec
  FROM sound_files sf
  LEFT JOIN lecture l ON l.file_id = sf.file_id
  GROUP BY sf.file_id, sf.user_id, DATE_TRUNC('month', sf.created_at)::date
),
upload_count AS (
  SELECT
    'Upload Hours' AS metric,
    COALESCE(
      ROUND(SUM(fd.duration_sec) FILTER (WHERE fd.month = dp.current_month_start) / 3600.0, 1),
      0
    ) AS current_value,
    COALESCE(
      ROUND(SUM(fd.duration_sec) FILTER (WHERE fd.month = dp.prev_month_start) / 3600.0, 1),
      0
    ) AS previous_value
  FROM file_durations fd
  CROSS JOIN date_params dp
  WHERE ($7::int IS NULL OR fd.user_id = $7)
),

user_count AS (
  SELECT
    'User Sessions' AS metric,
    COUNT(DISTINCT le.user_id)
      FILTER (WHERE DATE_TRUNC('month', le.login_timestamp)::date = dp.current_month_start)
      ::numeric AS current_value,
    COUNT(DISTINCT le.user_id)
      FILTER (WHERE DATE_TRUNC('month', le.login_timestamp)::date = dp.prev_month_start)
      ::numeric AS previous_value
  FROM login_events le
  CROSS JOIN date_params dp
)

SELECT
  metric,
  current_value,
  previous_value,
  ROUND(
    (CASE
      WHEN previous_value = 0 THEN NULL
      ELSE ((current_value::float - previous_value) / previous_value * 100)
    END)::numeric,
    1
  ) AS mom_percent_change
FROM (
  SELECT * FROM lecture_count
  UNION ALL
  SELECT * FROM teacher_count
  UNION ALL
  SELECT * FROM upload_count
  UNION ALL
  SELECT * FROM user_count
) metrics
ORDER BY CASE
  WHEN metric = 'Lectures'      THEN 1
  WHEN metric = 'Teachers'      THEN 2
  WHEN metric = 'Upload Hours'  THEN 3
  WHEN metric = 'User Sessions' THEN 4
END;
`;

const run = async () => {
  // Test with no filters (public admin view) and with user_id=11
  for (const uid of [null, 11, 1]) {
    const params = [null, null, null, null, null, null, uid];
    const r = await pool.query(sql, params);
    console.log(`\n=== KPI cards for user_id=${uid} ===`);
    console.table(r.rows);
  }
  await pool.end();
};
run().catch((e) => { console.error(e); process.exit(1); });
