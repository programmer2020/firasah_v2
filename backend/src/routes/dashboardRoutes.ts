/**
 * Dashboard Routes
 * Single optimized endpoint for dashboard KPI cards
 * Uses materialized views for lecture/teacher/upload metrics
 * and login_events for user sessions
 */

import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import { authenticate, AuthRequest, getTenantFilter } from '../middleware/auth.js';
import { getMany, getOne, executeQuery } from '../helpers/database.js';
import { evaluateSpeechAgainstKPIs } from '../services/evaluationsService.js';

// Resolve the bundled ffmpeg binary path (falls back to PATH if static is missing)
const FFMPEG_PATH: string = (ffmpegStatic as unknown as string) || 'ffmpeg';

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
router.get('/kpi-cards', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      subject_id,
      teacher_id,
      kpi_id,
      domain_id,
      section_id,
      grade_id,
      week_num,
      min_score,
      max_score,
    } = req.query;

    // Convert to int or null
    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const pf = (v: any) => (v ? parseFloat(String(v)) : null);
    const { userId: ownerFilter } = getTenantFilter(req);
    const params = [
      p(subject_id),  // $1
      p(teacher_id),  // $2
      p(kpi_id),      // $3
      p(domain_id),   // $4
      p(section_id),  // $5
      p(grade_id),    // $6
      ownerFilter,    // $7
    ];

    const sql = `
      WITH date_params AS (
        SELECT
          CURRENT_DATE AS today,
          DATE_TRUNC('month', CURRENT_DATE)::date AS current_month_start,
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date AS prev_month_start,
          -- Expose $3 (kpi_id) and $4 (domain_id) here so Postgres can infer their types.
          -- They are kept in the param signature for API stability but don't filter the raw-table counts below.
          $3::int AS _kpi_filter_noop,
          $4::int AS _domain_filter_noop
      ),

      -- Lectures: distinct lecture_id per month from the raw lecture+sound_files join.
      -- Filters on subject/teacher/section/grade come via section_time_slots (nullable join,
      -- only applied when the corresponding filter param is non-null).
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

      -- Teachers: distinct teacher_id across lectures in the month.
      -- Requires a valid time_slot (teacher_id lives on section_time_slots), so INNER JOIN.
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

      -- Upload Hours: total audio hours per month.
      -- Sum DISTINCT lecture.duration per file (one lecture per file ideally), then /3600 → hours.
      -- Using a sub-aggregation avoids the JOIN duplication (multiple time_slots per file).
      file_durations AS (
        SELECT
          sf.file_id,
          sf.user_id,
          DATE_TRUNC('month', sf.created_at)::date AS month,
          -- Take the maximum lecture duration per file (they all should match, but MAX is safe)
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

      -- User Sessions: distinct users who logged in this month (from login_events).
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
        -- All metrics carry at most one decimal place (Upload Hours has decimals; others are whole numbers)
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

/**
 * GET /api/dashboard/domains-weeks
 * Returns domain scores pivoted across the last 8 weeks for the heatmap.
 * Uses DENSE_RANK so all domains share the same week numbering.
 *
 * Optional query filters (all nullable):
 *   subject_id, teacher_id, kpi_id, section_id, grade_id
 *
 * Response: array of { domain_id, domain_name, weeks: [w1, w2, ..., w8] }
 *   week_1 = most recent week, week_8 = oldest
 */
router.get('/domains-weeks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { subject_id, teacher_id, kpi_id, section_id, grade_id, week_num, min_score, max_score } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const pf = (v: any) => (v ? parseFloat(String(v)) : null);
    const { userId: ownerFilter } = getTenantFilter(req);
    const params = [
      p(subject_id),  // $1
      p(teacher_id),  // $2
      p(kpi_id),      // $3
      p(section_id),  // $4
      p(grade_id),    // $5
      ownerFilter,    // $6
      p(week_num),    // $7
      pf(min_score),  // $8
      pf(max_score),  // $9
    ];

    const sql = `
      WITH target_week AS (
        SELECT week_start AS ws FROM (
          SELECT DISTINCT week_start,
                 DENSE_RANK() OVER (ORDER BY week_start DESC) AS rn
          FROM dashboard_fact_lectures
          WHERE week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
            AND week_start <= CURRENT_DATE
        ) w WHERE rn = $7::int
        LIMIT 1
      )
      SELECT
        domain_id,
        domain_name,
        MAX(CASE WHEN week_num = 1 THEN avg_score END) AS week_1,
        MAX(CASE WHEN week_num = 2 THEN avg_score END) AS week_2,
        MAX(CASE WHEN week_num = 3 THEN avg_score END) AS week_3,
        MAX(CASE WHEN week_num = 4 THEN avg_score END) AS week_4,
        MAX(CASE WHEN week_num = 5 THEN avg_score END) AS week_5,
        MAX(CASE WHEN week_num = 6 THEN avg_score END) AS week_6,
        MAX(CASE WHEN week_num = 7 THEN avg_score END) AS week_7,
        MAX(CASE WHEN week_num = 8 THEN avg_score END) AS week_8
      FROM (
        SELECT
          dfl.domain_id,
          dfl.domain_name,
          dfl.week_start,
          DENSE_RANK() OVER (ORDER BY dfl.week_start DESC) AS week_num,
          ROUND(AVG(dfl.score)::numeric, 1) AS avg_score
        FROM dashboard_fact_lectures dfl
        LEFT JOIN sound_files sf_owner ON dfl.file_id = sf_owner.file_id
        WHERE dfl.week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
          AND dfl.week_start <= CURRENT_DATE::date
          AND dfl.score IS NOT NULL
          AND ($1::int IS NULL OR dfl.subject_id = $1)
          AND ($2::int IS NULL OR dfl.teacher_id = $2)
          AND ($3::int IS NULL OR dfl.kpi_id     = $3)
          AND ($4::int IS NULL OR dfl.section_id = $4)
          AND ($5::int IS NULL OR dfl.grade_id   = $5)
          AND ($6::int IS NULL OR sf_owner.user_id = $6)
          AND ($7::int IS NULL OR dfl.week_start = (SELECT ws FROM target_week))
          AND ($8::float IS NULL OR dfl.score >= $8)
          AND ($9::float IS NULL OR dfl.score <= $9)
        GROUP BY dfl.domain_id, dfl.domain_name, dfl.week_start
      ) weekly_avg
      WHERE week_num <= 8
      GROUP BY domain_id, domain_name
      ORDER BY domain_id;
    `;

    const rows = await getMany(sql, params);

    // Also fetch ALL domains (with English name) so we show domains with no scores too
    const allDomains = await getMany(
      `SELECT domain_id, domain_name, domain_name_en FROM public.domains ORDER BY sort_order ASC, domain_id ASC`
    );

    // Build a map of domain_id -> week scores from the MV query
    const scoreMap: Record<number, number[]> = {};
    for (const row of rows) {
      scoreMap[row.domain_id] = [
        row.week_1 !== null ? Number(row.week_1) : null,
        row.week_2 !== null ? Number(row.week_2) : null,
        row.week_3 !== null ? Number(row.week_3) : null,
        row.week_4 !== null ? Number(row.week_4) : null,
        row.week_5 !== null ? Number(row.week_5) : null,
        row.week_6 !== null ? Number(row.week_6) : null,
        row.week_7 !== null ? Number(row.week_7) : null,
        row.week_8 !== null ? Number(row.week_8) : null,
      ] as any;
    }

    // Merge: all domains, with real scores where available, null where not
    const data = allDomains.map((d: any) => ({
      domain_id: d.domain_id,
      domain_name: (d.domain_name_en || d.domain_name || '').replace(/^Domain\s*/i, ''),
      weeks: scoreMap[d.domain_id] || [null, null, null, null, null, null, null, null],
    }));

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Dashboard Domains-Weeks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch domains-weeks heatmap data',
      error: error.message,
    });
  }
});

/**
 * GET /api/dashboard/domains-subjects
 * Returns domain × subject score matrix for the "Domains vs Subject" heatmap.
 *
 * Optional query filters (all nullable):
 *   teacher_id, domain_id, section_id, grade_id
 *
 * Response: { subjects: [{id, name}], domains: [{domain_id, domain_name, scores: {subject_id: avg_score}}] }
 */
router.get('/domains-subjects', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { teacher_id, domain_id, section_id, grade_id, week_num, min_score, max_score } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const pf = (v: any) => (v ? parseFloat(String(v)) : null);
    const { userId: ownerFilter } = getTenantFilter(req);
    const params = [
      p(teacher_id),  // $1
      p(domain_id),   // $2
      p(section_id),  // $3
      p(grade_id),    // $4
      ownerFilter,    // $5
      p(week_num),    // $6
      pf(min_score),  // $7
      pf(max_score),  // $8
    ];

    const sql = `
      WITH target_week AS (
        SELECT week_start AS ws FROM (
          SELECT DISTINCT week_start,
                 DENSE_RANK() OVER (ORDER BY week_start DESC) AS rn
          FROM dashboard_fact_lectures
          WHERE week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
            AND week_start <= CURRENT_DATE
        ) w WHERE rn = $6::int
        LIMIT 1
      )
      SELECT
        domain_id,
        domain_name,
        STRING_AGG(
          subject_id || '|' || subject_name || '|' || COALESCE(avg_score::text, 'N/A'),
          ','
        ) AS subjects_data
      FROM (
        SELECT
          dfl.domain_id,
          dfl.domain_name,
          dfl.subject_id,
          dfl.subject_name,
          ROUND(AVG(dfl.score)::numeric, 1) AS avg_score
        FROM dashboard_fact_lectures dfl
        LEFT JOIN sound_files sf_owner ON dfl.file_id = sf_owner.file_id
        WHERE dfl.week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
          AND dfl.score IS NOT NULL
          AND ($1::int IS NULL OR dfl.teacher_id = $1)
          AND ($2::int IS NULL OR dfl.domain_id  = $2)
          AND ($3::int IS NULL OR dfl.section_id = $3)
          AND ($4::int IS NULL OR dfl.grade_id   = $4)
          AND ($5::int IS NULL OR sf_owner.user_id = $5)
          AND ($6::int IS NULL OR dfl.week_start = (SELECT ws FROM target_week))
          AND ($7::float IS NULL OR dfl.score >= $7)
          AND ($8::float IS NULL OR dfl.score <= $8)
        GROUP BY dfl.domain_id, dfl.domain_name, dfl.subject_id, dfl.subject_name
      ) kpi_subject_scores
      GROUP BY domain_id, domain_name
      ORDER BY domain_id;
    `;

    const rows = await getMany(sql, params);

    // Parse STRING_AGG results into structured data
    // Build a set of all subjects and a map of domain -> {subject_id: score}
    const subjectMap: Record<number, string> = {};
    const domainScores: Record<number, { domain_name: string; scores: Record<number, number | null> }> = {};

    for (const row of rows) {
      const dId = row.domain_id;
      domainScores[dId] = { domain_name: row.domain_name, scores: {} };

      if (row.subjects_data) {
        const parts = row.subjects_data.split(',');
        for (const part of parts) {
          const [sidStr, sName, scoreStr] = part.split('|');
          const sid = parseInt(sidStr, 10);
          subjectMap[sid] = sName;
          domainScores[dId].scores[sid] = scoreStr === 'N/A' ? null : parseFloat(scoreStr);
        }
      }
    }

    // Get all subjects sorted by id
    const subjectIds = Object.keys(subjectMap).map(Number).sort((a, b) => a - b);
    const subjects = subjectIds.map((id) => ({ id, name: subjectMap[id] }));

    // Get all domains from public.domains to include empty ones
    const allDomains = await getMany(
      `SELECT domain_id, domain_name, domain_name_en FROM public.domains ORDER BY sort_order ASC, domain_id ASC`
    );

    const domainsResult = allDomains.map((d: any) => {
      const ds = domainScores[d.domain_id];
      const scores: Record<number, number | null> = {};
      for (const sid of subjectIds) {
        scores[sid] = ds?.scores[sid] ?? null;
      }
      return {
        domain_id: d.domain_id,
        domain_name: (d.domain_name_en || d.domain_name || '').replace(/^Domain\s*/i, ''),
        scores,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        subjects,
        domains: domainsResult,
      },
    });
  } catch (error: any) {
    console.error('Dashboard Domains-Subjects Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch domains-subjects heatmap data',
      error: error.message,
    });
  }
});

/**
 * GET /api/dashboard/teacher-performance
 * Returns weekly avg score + lecture count for the "Teacher Performance Metrics" bar chart.
 * Last 8 weeks from dashboard_fact_lectures MV.
 *
 * Optional query filters: subject_id, kpi_id, domain_id, section_id, grade_id
 *
 * Response: { weeks: [ { week_start, week_label, avg_score, lecture_count } ] }
 */
router.get('/teacher-performance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { subject_id, kpi_id, domain_id, section_id, grade_id, week_num, min_score, max_score } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const pf = (v: any) => (v ? parseFloat(String(v)) : null);
    const { userId: ownerFilter } = getTenantFilter(req);
    const params = [
      p(subject_id),  // $1
      p(kpi_id),      // $2
      p(domain_id),   // $3
      p(section_id),  // $4
      p(grade_id),    // $5
      ownerFilter,    // $6
      p(week_num),    // $7
      pf(min_score),  // $8
      pf(max_score),  // $9
    ];

    const sql = `
      WITH target_week AS (
        SELECT week_start AS ws FROM (
          SELECT DISTINCT week_start,
                 DENSE_RANK() OVER (ORDER BY week_start DESC) AS rn
          FROM dashboard_fact_lectures
          WHERE week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
            AND week_start <= CURRENT_DATE
        ) w WHERE rn = $7::int
        LIMIT 1
      )
      SELECT
        dfl.week_start,
        ROUND(AVG(dfl.score)::numeric, 1) AS avg_score,
        COUNT(DISTINCT dfl.lecture_id)     AS lecture_count
      FROM dashboard_fact_lectures dfl
      LEFT JOIN sound_files sf_owner ON dfl.file_id = sf_owner.file_id
      WHERE dfl.week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
        AND dfl.score IS NOT NULL
        AND ($1::int IS NULL OR dfl.subject_id = $1)
        AND ($2::int IS NULL OR dfl.kpi_id     = $2)
        AND ($3::int IS NULL OR dfl.domain_id  = $3)
        AND ($4::int IS NULL OR dfl.section_id = $4)
        AND ($5::int IS NULL OR dfl.grade_id   = $5)
        AND ($6::int IS NULL OR sf_owner.user_id = $6)
        AND ($7::int IS NULL OR dfl.week_start = (SELECT ws FROM target_week))
        AND ($8::float IS NULL OR dfl.score >= $8)
        AND ($9::float IS NULL OR dfl.score <= $9)
      GROUP BY dfl.week_start
      ORDER BY dfl.week_start;
    `;

    const rows = await getMany(sql, params);

    // Build week labels like "W1", "W2" etc. (oldest = W1, newest = W8)
    const weeks = rows.map((row: any, idx: number) => ({
      week_start: row.week_start,
      week_label: `Week ${idx + 1}`,
      avg_score: Number(row.avg_score) || 0,
      lecture_count: Number(row.lecture_count) || 0,
    }));

    res.status(200).json({ success: true, data: { weeks } });
  } catch (error: any) {
    console.error('Dashboard Teacher-Performance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher performance data',
      error: error.message,
    });
  }
});

/**
 * GET /api/dashboard/section-progress
 * Returns weekly avg score per section (class) for the "Progress Tracking" line chart.
 * Each section becomes a separate line.
 *
 * Optional query filters: subject_id, teacher_id, kpi_id, domain_id, grade_id
 *
 * Response: { week_labels: ["W1",...], sections: [{ section_id, section_name, scores: [s1,...] }] }
 */
router.get('/section-progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { subject_id, teacher_id, kpi_id, domain_id, grade_id, week_num, min_score, max_score } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const pf = (v: any) => (v ? parseFloat(String(v)) : null);
    const { userId: ownerFilter } = getTenantFilter(req);
    const params = [
      p(subject_id),  // $1
      p(teacher_id),  // $2
      p(kpi_id),      // $3
      p(domain_id),   // $4
      p(grade_id),    // $5
      ownerFilter,    // $6
      p(week_num),    // $7
      pf(min_score),  // $8
      pf(max_score),  // $9
    ];

    const sql = `
      WITH target_week AS (
        SELECT week_start AS ws FROM (
          SELECT DISTINCT week_start,
                 DENSE_RANK() OVER (ORDER BY week_start DESC) AS rn
          FROM dashboard_fact_lectures
          WHERE week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
            AND week_start <= CURRENT_DATE
        ) w WHERE rn = $7::int
        LIMIT 1
      )
      SELECT
        dfl.class_id,
        cls.class_name,
        dfl.week_start,
        ROUND(AVG(dfl.score)::numeric, 1) AS avg_score,
        COUNT(DISTINCT dfl.lecture_id)     AS lecture_count
      FROM dashboard_fact_lectures dfl
      JOIN classes cls ON dfl.class_id = cls.class_id
      LEFT JOIN sound_files sf_owner ON dfl.file_id = sf_owner.file_id
      WHERE dfl.week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
        AND dfl.score IS NOT NULL
        AND ($1::int IS NULL OR dfl.subject_id = $1)
        AND ($2::int IS NULL OR dfl.teacher_id = $2)
        AND ($3::int IS NULL OR dfl.kpi_id     = $3)
        AND ($4::int IS NULL OR dfl.domain_id  = $4)
        AND ($5::int IS NULL OR dfl.grade_id   = $5)
        AND ($6::int IS NULL OR sf_owner.user_id = $6)
        AND ($7::int IS NULL OR dfl.week_start = (SELECT ws FROM target_week))
        AND ($8::float IS NULL OR dfl.score >= $8)
        AND ($9::float IS NULL OR dfl.score <= $9)
      GROUP BY dfl.class_id, cls.class_name, dfl.week_start
      ORDER BY dfl.class_id, dfl.week_start;
    `;

    const rows = await getMany(sql, params);

    // Collect unique week_starts in order
    const weekSet = new Set<string>();
    for (const row of rows) {
      weekSet.add(String(row.week_start));
    }
    const weekStarts = Array.from(weekSet).sort();
    const weekLabels = weekStarts.map((_, i) => `W${i + 1}`);

    // Group by class
    const classMap: Record<number, { class_name: string; scoresByWeek: Record<string, number> }> = {};
    for (const row of rows) {
      const cid = row.class_id;
      if (!classMap[cid]) {
        classMap[cid] = { class_name: row.class_name, scoresByWeek: {} };
      }
      classMap[cid].scoresByWeek[String(row.week_start)] = Number(row.avg_score);
    }

    // Build classes array with scores aligned to weekStarts
    const classes = Object.entries(classMap).map(([cid, info]) => ({
      class_id: Number(cid),
      class_name: info.class_name,
      scores: weekStarts.map((ws) => info.scoresByWeek[ws] ?? null),
    }));

    res.status(200).json({
      success: true,
      data: { week_labels: weekLabels, classes },
    });
  } catch (error: any) {
    console.error('Dashboard Section-Progress Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch section progress data',
      error: error.message,
    });
  }
});

/**
 * GET /api/dashboard/top-evidences
 * Returns top 10 high-confidence KPI evidence samples.
 * Uses dashboard_fact_evidences MV.
 *
 * Optional query filters: subject_id, teacher_id, kpi_id, domain_id, section_id, grade_id
 */
router.get('/top-evidences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { subject_id, teacher_id, kpi_id, domain_id, section_id, grade_id, week_num, min_score, max_score, min_confidence } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const pf = (v: any) => (v ? parseFloat(String(v)) : null);
    const { userId: ownerFilter } = getTenantFilter(req);
    const params = [
      p(subject_id),      // $1
      p(teacher_id),      // $2
      p(kpi_id),          // $3
      p(domain_id),       // $4
      p(section_id),      // $5
      p(grade_id),        // $6
      ownerFilter,        // $7
      p(week_num),        // $8
      pf(min_score),      // $9
      pf(max_score),      // $10
      pf(min_confidence), // $11
    ];

    const sql = `
      WITH target_week AS (
        SELECT week_start AS ws FROM (
          SELECT DISTINCT week_start,
                 DENSE_RANK() OVER (ORDER BY week_start DESC) AS rn
          FROM dashboard_fact_lectures
          WHERE week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
            AND week_start <= CURRENT_DATE
        ) w WHERE rn = $8::int
        LIMIT 1
      )
      SELECT
        rank,
        kpi_id,
        kpi_name,
        teacher_id,
        teacher_name,
        section_id,
        section_name,
        class_name,
        ROUND(score::numeric, 1) AS kpi_score,
        confidence,
        evidence_id,
        lecture_id,
        file_id,
        filename,
        start_time,
        end_time,
        created_at,
        facts,
        interpretation,
        limitations
      FROM (
        SELECT
          ROW_NUMBER() OVER (ORDER BY dfe.confidence DESC NULLS LAST) AS rank,
          dfe.kpi_id,
          dfe.kpi_name,
          dfe.teacher_id,
          dfe.teacher_name,
          dfe.section_id,
          dfe.section_name,
          cls.class_name,
          dfe.score,
          dfe.confidence,
          dfe.evidence_id,
          dfe.lecture_id,
          dfe.file_id,
          dfe.filename,
          dfe.start_time,
          dfe.end_time,
          dfe.created_at,
          ev.facts,
          ev.interpretation,
          ev.limitations
        FROM dashboard_fact_evidences dfe
        LEFT JOIN evidences ev ON dfe.evidence_id = ev.evidence_id
        LEFT JOIN classes cls ON dfe.section_id = cls.section_id AND dfe.grade_id = cls.grade_id
        LEFT JOIN sound_files sf_owner ON dfe.file_id = sf_owner.file_id
        WHERE dfe.week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
          AND dfe.confidence IS NOT NULL
          AND ($1::int IS NULL OR dfe.subject_id = $1)
          AND ($2::int IS NULL OR dfe.teacher_id = $2)
          AND ($3::int IS NULL OR dfe.kpi_id     = $3)
          AND ($4::int IS NULL OR dfe.domain_id  = $4)
          AND ($5::int IS NULL OR dfe.section_id = $5)
          AND ($6::int IS NULL OR dfe.grade_id   = $6)
          AND ($7::int IS NULL OR sf_owner.user_id = $7)
          AND ($8::int IS NULL OR dfe.week_start = (SELECT ws FROM target_week))
          AND ($9::float IS NULL OR dfe.score >= $9)
          AND ($10::float IS NULL OR dfe.score <= $10)
          AND ($11::float IS NULL OR dfe.confidence > $11)
      ) ranked_evidences
      WHERE rank <= 10
      ORDER BY rank;
    `;

    const rows = await getMany(sql, params);

    const data = rows.map((r: any) => ({
      rank: Number(r.rank),
      kpi_id: r.kpi_id,
      kpi_name: r.kpi_name,
      teacher_name: r.teacher_name,
      section_name: r.section_name,
      class_name: r.class_name || r.section_name,
      confidence: Number(r.confidence),
      kpi_score: r.kpi_score !== null ? Number(r.kpi_score) : null,
      evidence_id: r.evidence_id,
      lecture_id: r.lecture_id,
      file_id: r.file_id,
      filename: r.filename,
      start_time: r.start_time,
      end_time: r.end_time,
      created_at: r.created_at || null,
      facts: r.facts || null,
      interpretation: r.interpretation || null,
      limitations: r.limitations || null,
    }));

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Dashboard Top-Evidences Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top evidences',
      error: error.message,
    });
  }
});

/**
 * GET /api/dashboard/filter-options
 * Returns available filter options for the dashboard dropdowns.
 * Response: { subjects: [{id, name}], grades: [{id, name}], sections: [{id, name}] }
 */
router.get('/filter-options', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [subjectRows, gradeRows, sectionRows] = await Promise.all([
      getMany('SELECT subject_id AS id, subject_name AS name FROM subjects ORDER BY subject_id'),
      getMany('SELECT grade_id AS id, grade_name AS name FROM grades ORDER BY grade_id'),
      getMany('SELECT section_id AS id, section_name AS name FROM sections ORDER BY section_id'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        subjects: subjectRows,
        grades: gradeRows,
        sections: sectionRows,
      },
    });
  } catch (error: any) {
    console.error('Dashboard Filter-Options Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filter options',
      error: error.message,
    });
  }
});

/**
 * POST /api/dashboard/re-evaluate
 * Re-runs KPI evaluation on all existing fragments to update evidence times.
 */
router.post('/re-evaluate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Delete old evidences
    await executeQuery('DELETE FROM evidences', []);
    console.log('[Re-evaluate] Cleared old evidences');

    // Get all fragments with transcripts
    const frags = await getMany(
      `SELECT f.fragment_id, f.lecture_id, f.transcript, f.start_time, f.end_time
       FROM fragments f
       WHERE f.transcript IS NOT NULL AND f.transcript != '[transcription_pending]'
       ORDER BY f.lecture_id, f.fragment_order`,
      []
    );

    let totalEvidences = 0;
    for (const frag of frags) {
      const fragStart = Number(frag.start_time ?? 0);
      const fragEnd = Number(frag.end_time ?? 0);
      if (!frag.transcript?.trim() || !frag.lecture_id) continue;

      console.log(`[Re-evaluate] Evaluating lecture_id=${frag.lecture_id}, fragment ${fragStart}s-${fragEnd}s...`);
      const evals = await evaluateSpeechAgainstKPIs(
        frag.transcript, frag.lecture_id,
        undefined, undefined,
        fragStart, fragEnd
      );
      const created = evals.filter(e => e.status !== 'Insufficient').length;
      totalEvidences += created;
      console.log(`[Re-evaluate] lecture_id=${frag.lecture_id} [${fragStart}s-${fragEnd}s]: ${created} evidence(s)`);
    }

    // Refresh MVs
    await executeQuery('REFRESH MATERIALIZED VIEW dashboard_fact_evidences', []);
    await executeQuery('REFRESH MATERIALIZED VIEW dashboard_fact_lectures', []);

    res.status(200).json({
      success: true,
      message: `Re-evaluation complete: ${frags.length} fragments processed, ${totalEvidences} evidences created`,
    });
  } catch (error: any) {
    console.error('Re-evaluate Error:', error);
    res.status(500).json({ success: false, message: 'Re-evaluation failed', error: error.message });
  }
});

/**
 * GET /api/dashboard/evidences/:evidence_id/clip
 * Streams a short audio clip (only the segment from start_time to end_time)
 * for the given evidence. Uses ffmpeg to extract the slice on the fly.
 */
router.get('/evidences/:evidence_id/clip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const evidenceId = parseInt(String(req.params.evidence_id), 10);
    if (!evidenceId || Number.isNaN(evidenceId)) {
      return res.status(400).json({ success: false, message: 'Invalid evidence_id' });
    }

    const sql = `
      SELECT
        e.start_time AS ev_start,
        e.end_time   AS ev_end,
        ts.start_time AS slot_start,
        sf.filepath,
        sf.filename
      FROM evidences e
      JOIN lecture l ON e.lecture_id = l.lecture_id
      LEFT JOIN section_time_slots ts ON l.time_slot_id = ts.time_slot_id
      LEFT JOIN sound_files sf ON l.file_id = sf.file_id
      WHERE e.evidence_id = $1
      LIMIT 1
    `;
    const row = await getOne(sql, [evidenceId]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Evidence not found' });
    }
    if (!row.filepath) {
      return res.status(404).json({ success: false, message: 'Audio file not linked to evidence' });
    }
    if (!row.ev_start || !row.ev_end) {
      return res.status(400).json({ success: false, message: 'Evidence has no time range' });
    }

    const toSec = (t: string): number => {
      const [h, m, s] = String(t).split(':').map(Number);
      return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    };
    const slotStart = row.slot_start ? toSec(row.slot_start) : 0;
    const evStart = toSec(row.ev_start);
    const evEnd = toSec(row.ev_end);
    let offsetSec = evStart - slotStart;
    if (offsetSec < 0) offsetSec += 24 * 3600; // wrap across midnight
    let durationSec = evEnd - evStart;
    if (durationSec <= 0) durationSec += 24 * 3600;
    durationSec = Math.max(1, Math.min(durationSec, 600)); // cap at 10 min

    // Resolve absolute audio path. filepath is stored with OS-specific separators
    // (e.g. "uploads\\audio\\foo.mp3"). Normalize before joining.
    const normalizedRelative = String(row.filepath).replace(/\\/g, path.sep).replace(/\//g, path.sep);
    let audioPath = path.isAbsolute(normalizedRelative)
      ? normalizedRelative
      : path.join(process.cwd(), normalizedRelative);

    // If the audio file is missing at the resolved path, try the original cwd
    // (the upload may have been created by a different worktree/process).
    if (!fs.existsSync(audioPath)) {
      const alt = path.join(process.cwd(), 'uploads', 'audio', path.basename(normalizedRelative));
      if (fs.existsSync(alt)) {
        audioPath = alt;
      } else {
        console.error(`[evidence-clip ${evidenceId}] Audio missing: ${audioPath}`);
        return res.status(404).json({ success: false, message: 'Audio file missing on disk' });
      }
    }

    // If this is a video container, prefer the pre-converted mp3 sibling (if any).
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    if (videoExts.includes(path.extname(audioPath).toLowerCase())) {
      const mp3Sibling = audioPath.replace(path.extname(audioPath), '.mp3');
      if (fs.existsSync(mp3Sibling)) audioPath = mp3Sibling;
    }

    // Ensure we have a runnable ffmpeg binary.
    if (!FFMPEG_PATH || (FFMPEG_PATH !== 'ffmpeg' && !fs.existsSync(FFMPEG_PATH))) {
      console.error(`[evidence-clip ${evidenceId}] ffmpeg binary not found at: ${FFMPEG_PATH}`);
      return res.status(500).json({ success: false, message: 'ffmpeg binary not available on server' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', 'none');

    const ffArgs = [
      '-ss', String(offsetSec),
      '-t', String(durationSec),
      '-i', audioPath,
      '-vn',
      '-f', 'mp3',
      '-acodec', 'libmp3lame',
      '-ab', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-loglevel', 'error',
      'pipe:1',
    ];

    const ff = spawn(FFMPEG_PATH, ffArgs, { windowsHide: true });
    let stderrBuf = '';
    let responded = false;

    ff.stdout.pipe(res, { end: false });
    ff.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
    });
    ff.on('error', (err) => {
      console.error(`[evidence-clip ${evidenceId}] ffmpeg spawn error:`, err, 'binary:', FFMPEG_PATH);
      if (!res.headersSent) {
        responded = true;
        res.status(500).json({ success: false, message: 'Failed to start ffmpeg', error: err.message });
      } else if (!responded) {
        responded = true;
        res.end();
      }
    });
    ff.on('close', (code) => {
      if (code !== 0 && !res.headersSent) {
        responded = true;
        console.error(`[evidence-clip ${evidenceId}] ffmpeg exited with code ${code}. stderr: ${stderrBuf}`);
        return res.status(500).json({ success: false, message: 'ffmpeg exited with error', code, stderr: stderrBuf.slice(-400) });
      }
      if (!responded) {
        responded = true;
        res.end();
      }
    });
    req.on('close', () => {
      try { ff.kill('SIGKILL'); } catch {}
    });
  } catch (error: any) {
    console.error('Evidence Clip Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate clip', error: error.message });
    } else {
      res.end();
    }
  }
});

export default router;
