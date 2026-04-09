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
router.get('/domains-weeks', async (req: Request, res: Response) => {
  try {
    const { subject_id, teacher_id, kpi_id, section_id, grade_id } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const params = [
      p(subject_id),  // $1
      p(teacher_id),  // $2
      p(kpi_id),      // $3
      p(section_id),  // $4
      p(grade_id),    // $5
    ];

    const sql = `
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
          domain_id,
          domain_name,
          week_start,
          DENSE_RANK() OVER (ORDER BY week_start DESC) AS week_num,
          ROUND(AVG(score)::numeric, 1) AS avg_score
        FROM dashboard_fact_lectures
        WHERE week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
          AND week_start <= CURRENT_DATE::date
          AND score IS NOT NULL
          AND ($1::int IS NULL OR subject_id = $1)
          AND ($2::int IS NULL OR teacher_id = $2)
          AND ($3::int IS NULL OR kpi_id     = $3)
          AND ($4::int IS NULL OR section_id = $4)
          AND ($5::int IS NULL OR grade_id   = $5)
        GROUP BY domain_id, domain_name, week_start
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
router.get('/domains-subjects', async (req: Request, res: Response) => {
  try {
    const { teacher_id, domain_id, section_id, grade_id } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const params = [
      p(teacher_id),  // $1
      p(domain_id),   // $2
      p(section_id),  // $3
      p(grade_id),    // $4
    ];

    const sql = `
      SELECT
        domain_id,
        domain_name,
        STRING_AGG(
          subject_id || '|' || subject_name || '|' || COALESCE(avg_score::text, 'N/A'),
          ','
        ) AS subjects_data
      FROM (
        SELECT
          domain_id,
          domain_name,
          subject_id,
          subject_name,
          ROUND(AVG(score)::numeric, 1) AS avg_score
        FROM dashboard_fact_lectures
        WHERE week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
          AND score IS NOT NULL
          AND ($1::int IS NULL OR teacher_id = $1)
          AND ($2::int IS NULL OR domain_id  = $2)
          AND ($3::int IS NULL OR section_id = $3)
          AND ($4::int IS NULL OR grade_id   = $4)
        GROUP BY domain_id, domain_name, subject_id, subject_name
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
router.get('/teacher-performance', async (req: Request, res: Response) => {
  try {
    const { subject_id, kpi_id, domain_id, section_id, grade_id } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const params = [
      p(subject_id),  // $1
      p(kpi_id),      // $2
      p(domain_id),   // $3
      p(section_id),  // $4
      p(grade_id),    // $5
    ];

    const sql = `
      SELECT
        week_start,
        ROUND(AVG(score)::numeric, 1) AS avg_score,
        COUNT(DISTINCT lecture_id)     AS lecture_count
      FROM dashboard_fact_lectures
      WHERE week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
        AND score IS NOT NULL
        AND ($1::int IS NULL OR subject_id = $1)
        AND ($2::int IS NULL OR kpi_id     = $2)
        AND ($3::int IS NULL OR domain_id  = $3)
        AND ($4::int IS NULL OR section_id = $4)
        AND ($5::int IS NULL OR grade_id   = $5)
      GROUP BY week_start
      ORDER BY week_start;
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
router.get('/section-progress', async (req: Request, res: Response) => {
  try {
    const { subject_id, teacher_id, kpi_id, domain_id, grade_id } = req.query;

    const p = (v: any) => (v ? parseInt(String(v), 10) : null);
    const params = [
      p(subject_id),  // $1
      p(teacher_id),  // $2
      p(kpi_id),      // $3
      p(domain_id),   // $4
      p(grade_id),    // $5
    ];

    const sql = `
      SELECT
        dfl.section_id,
        sec.section_name,
        dfl.week_start,
        ROUND(AVG(dfl.score)::numeric, 1) AS avg_score,
        COUNT(DISTINCT dfl.lecture_id)     AS lecture_count
      FROM dashboard_fact_lectures dfl
      JOIN sections sec ON dfl.section_id = sec.section_id
      WHERE dfl.week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
        AND dfl.score IS NOT NULL
        AND ($1::int IS NULL OR dfl.subject_id = $1)
        AND ($2::int IS NULL OR dfl.teacher_id = $2)
        AND ($3::int IS NULL OR dfl.kpi_id     = $3)
        AND ($4::int IS NULL OR dfl.domain_id  = $4)
        AND ($5::int IS NULL OR dfl.grade_id   = $5)
      GROUP BY dfl.section_id, sec.section_name, dfl.week_start
      ORDER BY dfl.section_id, dfl.week_start;
    `;

    const rows = await getMany(sql, params);

    // Collect unique week_starts in order
    const weekSet = new Set<string>();
    for (const row of rows) {
      weekSet.add(String(row.week_start));
    }
    const weekStarts = Array.from(weekSet).sort();
    const weekLabels = weekStarts.map((_, i) => `W${i + 1}`);

    // Group by section
    const sectionMap: Record<number, { section_name: string; scoresByWeek: Record<string, number> }> = {};
    for (const row of rows) {
      const sid = row.section_id;
      if (!sectionMap[sid]) {
        sectionMap[sid] = { section_name: row.section_name, scoresByWeek: {} };
      }
      sectionMap[sid].scoresByWeek[String(row.week_start)] = Number(row.avg_score);
    }

    // Build sections array with scores aligned to weekStarts
    const sections = Object.entries(sectionMap).map(([sid, info]) => ({
      section_id: Number(sid),
      section_name: info.section_name,
      scores: weekStarts.map((ws) => info.scoresByWeek[ws] ?? null),
    }));

    res.status(200).json({
      success: true,
      data: { week_labels: weekLabels, sections },
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
router.get('/top-evidences', async (req: Request, res: Response) => {
  try {
    const { subject_id, teacher_id, kpi_id, domain_id, section_id, grade_id } = req.query;

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
      SELECT
        rank,
        kpi_id,
        kpi_name,
        teacher_id,
        teacher_name,
        section_id,
        section_name,
        ROUND(score::numeric, 1) AS kpi_score,
        confidence,
        evidence_id,
        lecture_id,
        file_id,
        filename,
        start_time,
        end_time,
        created_at
      FROM (
        SELECT
          ROW_NUMBER() OVER (ORDER BY dfe.confidence DESC NULLS LAST) AS rank,
          dfe.kpi_id,
          dfe.kpi_name,
          dfe.teacher_id,
          dfe.teacher_name,
          dfe.section_id,
          dfe.section_name,
          dfe.score,
          dfe.confidence,
          dfe.evidence_id,
          dfe.lecture_id,
          dfe.file_id,
          dfe.filename,
          dfe.start_time,
          dfe.end_time,
          dfe.created_at
        FROM dashboard_fact_evidences dfe
        WHERE dfe.week_start >= (CURRENT_DATE - INTERVAL '8 weeks')::date
          AND dfe.confidence IS NOT NULL
          AND ($1::int IS NULL OR dfe.subject_id = $1)
          AND ($2::int IS NULL OR dfe.teacher_id = $2)
          AND ($3::int IS NULL OR dfe.kpi_id     = $3)
          AND ($4::int IS NULL OR dfe.domain_id  = $4)
          AND ($5::int IS NULL OR dfe.section_id = $5)
          AND ($6::int IS NULL OR dfe.grade_id   = $6)
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
      confidence: Number(r.confidence),
      kpi_score: r.kpi_score !== null ? Number(r.kpi_score) : null,
      evidence_id: r.evidence_id,
      lecture_id: r.lecture_id,
      file_id: r.file_id,
      filename: r.filename,
      start_time: r.start_time,
      end_time: r.end_time,
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

export default router;
