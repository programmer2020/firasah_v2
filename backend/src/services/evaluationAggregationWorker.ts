/**
 * Evaluation Aggregation Worker
 *
 * This worker:
 * 1) Finds evidences where iscalculated = false
 * 2) Aggregates counts by (lecture_id, kpi_id)
 * 3) Upserts into lecture_kpi
 * 4) Marks those evidences as iscalculated = true
 *
 * It can be invoked manually via API and by pg_cron schedule.
 */

import { executeQuery, transaction } from '../helpers/database.js';
import { getDatabaseStatus } from '../config/database-manager.js';

const WORKER_LOCK_KEY = 72491031;
const DEFAULT_IN_APP_INTERVAL_MS =
  Number(process.env.EVALUATION_IN_APP_INTERVAL_MS) || 12 * 60 * 60 * 1000;

let workerRunning = false;
const ensuredSchemaKeys = new Set<string>();
const ensuredFunctionKeys = new Set<string>();
let inAppSchedulerTimer: NodeJS.Timeout | null = null;
let inAppSchedulerIntervalMs = DEFAULT_IN_APP_INTERVAL_MS;
let inAppSchedulerNextRunAt: string | null = null;
let inAppSchedulerLastRunAt: string | null = null;
let inAppSchedulerLastError: string | null = null;

type WorkerRunResult = {
  skipped: boolean;
  groupsProcessed: number;
  evidencesProcessed: number;
  evidencesMarked: number;
};

export type InAppSchedulerStatus = {
  enabled: boolean;
  intervalMs: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
};

const toInt = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const SQL_CONFIDENCE_EXTRACT_EXPR = `
  COALESCE(e.confidence, 0)
`.trim();

const sqlMarkExpression = (countExpr: string): string => `
  CASE
    WHEN COALESCE(${countExpr}, 0) >= 3 THEN 's'
    WHEN COALESCE(${countExpr}, 0) >= 2 THEN 'g'
    WHEN COALESCE(${countExpr}, 0) >= 1 THEN 'l'
    ELSE 'n'
  END
`.trim();

const sqlKpiScoreExpression = (avgConfidenceExpr: string, evidenceCountExpr: string): string => `
  LEAST(
    ROUND(COALESCE((${avgConfidenceExpr})::numeric, 0), 2) + (COALESCE(${evidenceCountExpr}, 0) * 2),
    100
  )
`.trim();

const currentDatabaseKey = (): string => {
  const status = getDatabaseStatus();
  return `${status.host}|${status.database}|${status.type}`;
};

export const ensureAggregationSchemaForCurrentDb = async (): Promise<void> => {
  const dbKey = currentDatabaseKey();
  if (ensuredSchemaKeys.has(dbKey)) {
    return;
  }

  await transaction(async (client) => {
    // Add marker column used to prevent recounting the same evidence rows.
    await client.query(`
      ALTER TABLE evidences
      ADD COLUMN IF NOT EXISTS iscalculated BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // Ensure lecture_kpi has mark and updated_at columns
    await client.query(`
      ALTER TABLE lecture_kpi
      ADD COLUMN IF NOT EXISTS mark VARCHAR(1) DEFAULT 'n',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // Backfill mark for any rows where it is NULL or not a valid letter.
    await client.query(`
      UPDATE lecture_kpi
      SET
        mark = ${sqlMarkExpression('COALESCE(evidence_count, 0)')},
        score = ${sqlKpiScoreExpression('COALESCE(avg_confidence, 0)', 'COALESCE(evidence_count, 0)')},
        updated_at = COALESCE(updated_at, NOW())
      WHERE mark IS NULL
         OR mark NOT IN ('s', 'g', 'l', 'n')
         OR score IS NULL;
    `);

    // Create index for efficient aggregation queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_evidences_lecture_kpi_iscalculated
      ON evidences(lecture_id, kpi_id, iscalculated);
    `);

    // Reconcile lecture_kpi from all evidence rows so legacy data also gets correct scores.
    await client.query(`
      WITH lecture_evidence_metrics AS (
        SELECT
          e.lecture_id,
          e.kpi_id,
          COUNT(*)::int AS evidence_count,
          ROUND(AVG(${SQL_CONFIDENCE_EXTRACT_EXPR})::numeric, 2) AS avg_confidence
        FROM evidences e
        WHERE e.lecture_id IS NOT NULL
        GROUP BY e.lecture_id, e.kpi_id
      )
      INSERT INTO lecture_kpi (
        lecture_id,
        kpi_id,
        avg_confidence,
        evidence_count,
        score,
        mark,
        created_at,
        updated_at
      )
      SELECT
        lem.lecture_id,
        lem.kpi_id,
        COALESCE(lem.avg_confidence, 0),
        lem.evidence_count,
        ${sqlKpiScoreExpression('COALESCE(lem.avg_confidence, 0)', 'lem.evidence_count')},
        ${sqlMarkExpression('lem.evidence_count')},
        NOW(),
        NOW()
      FROM lecture_evidence_metrics lem
      ON CONFLICT (lecture_id, kpi_id)
      DO UPDATE SET
        avg_confidence = EXCLUDED.avg_confidence,
        evidence_count = EXCLUDED.evidence_count,
        score = EXCLUDED.score,
        mark = EXCLUDED.mark,
        updated_at = NOW();
    `);
  });

  ensuredSchemaKeys.add(dbKey);
  console.log(`[Evaluation Worker] Schema ensured for DB: ${dbKey}`);
};

export const ensureAggregationFunctionForCurrentDb = async (): Promise<void> => {
  const dbKey = currentDatabaseKey();
  if (ensuredFunctionKeys.has(dbKey)) {
    return;
  }

  await transaction(async (client) => {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.run_evaluation_aggregation_job()
      RETURNS TABLE(
        skipped BOOLEAN,
        groups_processed INTEGER,
        evidences_processed INTEGER,
        evidences_marked INTEGER
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        has_lock BOOLEAN;
      BEGIN
        SELECT pg_try_advisory_xact_lock(${WORKER_LOCK_KEY}) INTO has_lock;
        IF NOT has_lock THEN
          RETURN QUERY SELECT TRUE, 0, 0, 0;
          RETURN;
        END IF;

        RETURN QUERY
        WITH pending AS (
          SELECT
            e.evidence_id,
            e.lecture_id,
            e.kpi_id,
            ${SQL_CONFIDENCE_EXTRACT_EXPR} AS confidence
          FROM evidences e
          WHERE COALESCE(e.iscalculated, FALSE) = FALSE
            AND e.lecture_id IS NOT NULL
          FOR UPDATE OF e SKIP LOCKED
        ),
        grouped AS (
          SELECT
            lecture_id,
            kpi_id,
            COUNT(*)::int AS pending_count,
            ROUND(AVG(confidence)::numeric, 2) AS pending_avg_confidence
          FROM pending
          GROUP BY lecture_id, kpi_id
        ),
        upserted AS (
          INSERT INTO lecture_kpi (
            lecture_id,
            kpi_id,
            avg_confidence,
            evidence_count,
            score,
            mark,
            created_at,
            updated_at
          )
          SELECT
            g.lecture_id,
            g.kpi_id,
            COALESCE(g.pending_avg_confidence, 0),
            g.pending_count,
            ${sqlKpiScoreExpression('COALESCE(g.pending_avg_confidence, 0)', 'g.pending_count')},
            ${sqlMarkExpression('g.pending_count')},
            NOW(),
            NOW()
          FROM grouped g
          ON CONFLICT (lecture_id, kpi_id)
          DO UPDATE SET
            evidence_count = COALESCE(lecture_kpi.evidence_count, 0) + EXCLUDED.evidence_count,
            avg_confidence = CASE
              WHEN (COALESCE(lecture_kpi.evidence_count, 0) + EXCLUDED.evidence_count) > 0 THEN
                ROUND((
                  (COALESCE(lecture_kpi.avg_confidence, 0) * COALESCE(lecture_kpi.evidence_count, 0))
                  + (COALESCE(EXCLUDED.avg_confidence, 0) * EXCLUDED.evidence_count)
                ) / NULLIF(COALESCE(lecture_kpi.evidence_count, 0) + EXCLUDED.evidence_count, 0), 2)
              ELSE 0
            END,
            score = ${sqlKpiScoreExpression(`
              CASE
                WHEN (COALESCE(lecture_kpi.evidence_count, 0) + EXCLUDED.evidence_count) > 0 THEN
                  ROUND((
                    (COALESCE(lecture_kpi.avg_confidence, 0) * COALESCE(lecture_kpi.evidence_count, 0))
                    + (COALESCE(EXCLUDED.avg_confidence, 0) * EXCLUDED.evidence_count)
                  ) / NULLIF(COALESCE(lecture_kpi.evidence_count, 0) + EXCLUDED.evidence_count, 0), 2)
                ELSE 0
              END
            `, 'COALESCE(lecture_kpi.evidence_count, 0) + EXCLUDED.evidence_count')},
            mark = ${sqlMarkExpression('COALESCE(lecture_kpi.evidence_count, 0) + EXCLUDED.evidence_count')},
            updated_at = NOW()
          RETURNING lecture_id, kpi_id
        ),
        marked AS (
          UPDATE evidences e
          SET
            iscalculated = TRUE,
            updated_at = NOW()
          WHERE e.evidence_id IN (SELECT evidence_id FROM pending)
          RETURNING e.evidence_id
        )
        SELECT
          FALSE::BOOLEAN,
          COALESCE((SELECT COUNT(*) FROM grouped), 0)::int,
          COALESCE((SELECT SUM(pending_count) FROM grouped), 0)::int,
          COALESCE((SELECT COUNT(*) FROM marked), 0)::int;
      END;
      $$;
    `);
  });

  ensuredFunctionKeys.add(dbKey);
  console.log(`[Evaluation Worker] SQL function ensured for DB: ${dbKey}`);
};

export const runEvaluationAggregationWorker = async (): Promise<WorkerRunResult> => {
  if (workerRunning) {
    return {
      skipped: true,
      groupsProcessed: 0,
      evidencesProcessed: 0,
      evidencesMarked: 0,
    };
  }

  workerRunning = true;
  try {
    await ensureAggregationSchemaForCurrentDb();
    await ensureAggregationFunctionForCurrentDb();

    const response = await executeQuery(`
      SELECT skipped, groups_processed, evidences_processed, evidences_marked
      FROM public.run_evaluation_aggregation_job();
    `);

    const row = response.rows[0] || {};
    const result: WorkerRunResult = {
      skipped: Boolean(row.skipped),
      groupsProcessed: toInt(row.groups_processed),
      evidencesProcessed: toInt(row.evidences_processed),
      evidencesMarked: toInt(row.evidences_marked),
    };

    if (!result.skipped) {
      console.log(
        `[Evaluation Worker] Done: groups=${result.groupsProcessed}, evidences=${result.evidencesProcessed}, marked=${result.evidencesMarked}`
      );
    }

    return result;
  } catch (error) {
    console.error('[Evaluation Worker] Failed:', error);
    throw error;
  } finally {
    workerRunning = false;
  }
};

const refreshInAppNextRunAt = () => {
  if (!inAppSchedulerTimer) {
    inAppSchedulerNextRunAt = null;
    return;
  }

  inAppSchedulerNextRunAt = new Date(Date.now() + inAppSchedulerIntervalMs).toISOString();
};

const runInAppSchedulerCycle = async (): Promise<void> => {
  inAppSchedulerLastRunAt = new Date().toISOString();
  inAppSchedulerLastError = null;

  try {
    await runEvaluationAggregationWorker();
  } catch (error) {
    inAppSchedulerLastError = getErrorMessage(error);
    console.error('[Evaluation Worker] In-app scheduler cycle failed:', error);
  } finally {
    refreshInAppNextRunAt();
  }
};

export const startInAppEvaluationScheduler = (
  intervalMs: number = DEFAULT_IN_APP_INTERVAL_MS
): InAppSchedulerStatus => {
  const normalizedInterval = Number.isFinite(intervalMs) && intervalMs > 0
    ? Math.max(60_000, Math.floor(intervalMs))
    : DEFAULT_IN_APP_INTERVAL_MS;

  if (inAppSchedulerTimer) {
    clearInterval(inAppSchedulerTimer);
    inAppSchedulerTimer = null;
  }

  inAppSchedulerIntervalMs = normalizedInterval;
  inAppSchedulerTimer = setInterval(() => {
    void runInAppSchedulerCycle();
  }, inAppSchedulerIntervalMs);

  if (typeof inAppSchedulerTimer.unref === 'function') {
    inAppSchedulerTimer.unref();
  }

  refreshInAppNextRunAt();
  void runInAppSchedulerCycle();

  console.log(
    `[Evaluation Worker] In-app scheduler started. Interval=${inAppSchedulerIntervalMs}ms`
  );

  return getInAppEvaluationSchedulerStatus();
};

export const stopInAppEvaluationScheduler = (): InAppSchedulerStatus => {
  if (inAppSchedulerTimer) {
    clearInterval(inAppSchedulerTimer);
    inAppSchedulerTimer = null;
  }

  inAppSchedulerNextRunAt = null;
  console.log('[Evaluation Worker] In-app scheduler stopped.');

  return getInAppEvaluationSchedulerStatus();
};

export const getInAppEvaluationSchedulerStatus = (): InAppSchedulerStatus => {
  return {
    enabled: Boolean(inAppSchedulerTimer),
    intervalMs: inAppSchedulerIntervalMs,
    nextRunAt: inAppSchedulerNextRunAt,
    lastRunAt: inAppSchedulerLastRunAt,
    lastError: inAppSchedulerLastError,
  };
};
