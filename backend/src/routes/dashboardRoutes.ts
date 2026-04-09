/**
 * Dashboard Routes
 * Single optimized endpoint for dashboard KPI cards
 * Uses materialized views for lecture/teacher/upload metrics
 * and login_events for user sessions
 */

import { Router, Request, Response } from 'express';
import { getMany, getOne } from '../helpers/database.js';

const router = Router();

/**
 * GET /api/dashboard/kpi-cards
 * Returns all 4 KPI card metrics in a single response:
 *   - Lectures (distinct lectures from dashboard_fact_lectures MV)
 *   - Teachers (distinct teachers from dashboard_fact_lectures MV)
 *   - Upload Hours (SUM duration from fragments + sound_files)
 *   - User Sessions (distinct users from login_events)
 *
 * Optional query filters (all nullable):
 *   subject_id, teacher_id, kpi_id, domain_id, section_id, grade_id
 *
 * Each metric returns current_value, previous_value, mom_percent_change
 */
router.get('/kpi-cards', async (req: Request, res: Response) => {
  try {
    const {
      subject_id,
      teacher_id,
      kpi_id,
      domain_id,
      section_id,
      grade_id,
    } = req.query;

    // Convert to int or null
    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const params = [
      p(subject_id),  // $1
      p(teacher_id),  // $2
      p(kpi_id),      // $3
      p(domain_id),   // $4
      p(section_id),  // $5
      p(grade_id),    // $6
    ];

    const sql = `
      WITH date_params AS (
        SELECT
          DATE_TRUNC('month', CURRENT_DATE)::date   AS current_month_start,
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date AS prev_month_start
      ),

      -- 1) Lectures: count distinct lecture_id from materialized view
      lecture_count AS (
        SELECT
          'Lectures' AS metric,
          COUNT(DISTINCT lecture_id)
            FILTER (WHERE DATE_TRUNC('month', dfl.created_at)::date = dp.current_month_start)
            AS current_value,
          COUNT(DISTINCT lecture_id)
            FILTER (WHERE DATE_TRUNC('month', dfl.created_at)::date = dp.prev_month_start)
            AS previous_value
        FROM dashboard_fact_lectures dfl, date_params dp
        WHERE ($1::int IS NULL OR dfl.subject_id  = $1)
          AND ($2::int IS NULL OR dfl.teacher_id  = $2)
          AND ($3::int IS NULL OR dfl.kpi_id      = $3)
          AND ($4::int IS NULL OR dfl.domain_id   = $4)
          AND ($5::int IS NULL OR dfl.section_id  = $5)
          AND ($6::int IS NULL OR dfl.grade_id    = $6)
      ),

      -- 2) Teachers: total count from teachers table (all registered teachers)
      --    Not from MV — MV only has teachers with evaluated lectures
      teacher_count AS (
        SELECT
          'Teachers' AS metric,
          COUNT(*)::bigint AS current_value,
          COUNT(*)::bigint AS previous_value
        FROM teachers
      ),

      -- 3) Upload Hours: SUM(fragments.duration) joined through sound_files
      --    (not in the MV, so we query the source tables directly)
      upload_count AS (
        SELECT
          'Upload Hours' AS metric,
          COALESCE(
            ROUND(
              SUM(CAST(f.duration AS DECIMAL))
                FILTER (WHERE DATE_TRUNC('month', sf.created_at)::date = dp.current_month_start)
              / 3600
            , 0),
            0
          ) AS current_value,
          COALESCE(
            ROUND(
              SUM(CAST(f.duration AS DECIMAL))
                FILTER (WHERE DATE_TRUNC('month', sf.created_at)::date = dp.prev_month_start)
              / 3600
            , 0),
            0
          ) AS previous_value
        FROM fragments f
        INNER JOIN sound_files sf ON f.file_id = sf.file_id,
        date_params dp
      ),

      -- 4) User Sessions: count login events (each login = 1 session)
      --    Not DISTINCT — every login counts as a separate session
      user_count AS (
        SELECT
          'User Sessions' AS metric,
          COUNT(*)
            FILTER (WHERE DATE_TRUNC('month', le.login_timestamp)::date = dp.current_month_start)
            AS current_value,
          COUNT(*)
            FILTER (WHERE DATE_TRUNC('month', le.login_timestamp)::date = dp.prev_month_start)
            AS previous_value
        FROM login_events le, date_params dp
        WHERE le.login_timestamp >= dp.prev_month_start
      )

      SELECT
        metric,
        current_value::int,
        previous_value::int,
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

    const rows = await getMany(sql, params);

    // Build a convenient keyed object for the frontend
    const cards: Record<string, any> = {};
    for (const row of rows) {
      cards[row.metric] = {
        current_value: Number(row.current_value) || 0,
        previous_value: Number(row.previous_value) || 0,
        mom_percent_change: row.mom_percent_change !== null
          ? Number(row.mom_percent_change)
          : 0,
      };
    }

    res.status(200).json({
      success: true,
      data: cards,
    });
  } catch (error: any) {
    console.error('Dashboard KPI Cards Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard KPI cards',
      error: error.message,
    });
  }
});

export default router;
