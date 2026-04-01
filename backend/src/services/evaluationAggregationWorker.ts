/**
 * Evaluation Aggregation Worker
 *
 * This worker:
 * 1) Finds evidences where iscalculated = false
 * 2) Aggregates counts by (file_id, kpi_id)
 * 3) Upserts counts into evaluations
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
  COALESCE(
    ((regexp_match(COALESCE(e.evidence_txt, ''), 'Confidence:\\s*([0-9]+(?:\\.[0-9]+)?)%?', 'i'))[1])::numeric,
    0
  )
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

    // Add fragment_id column if it doesn't exist
    await client.query(`
      ALTER TABLE evidences
      ADD COLUMN IF NOT EXISTS fragment_id INTEGER REFERENCES fragments(fragment_id) ON DELETE CASCADE;
    `);

    await client.query(`
      ALTER TABLE evaluations
      ADD COLUMN IF NOT EXISTS avg_confidence NUMERIC(5, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS kpi_score NUMERIC(5, 2) NOT NULL DEFAULT 0;
    `);

    // Ensure the mark column in evaluations is VARCHAR(1) (not numeric).
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name   = 'evaluations'
            AND column_name  = 'mark'
            AND data_type    = 'numeric'
        ) THEN
          ALTER TABLE evaluations ALTER COLUMN mark TYPE VARCHAR(1) USING NULL;
        END IF;
      END $$;
    `);

    // Backfill mark for any rows where it is NULL or not a valid letter.
    await client.query(`
      UPDATE evaluations
      SET
        avg_confidence = COALESCE(avg_confidence, 0),
        kpi_score = ${sqlKpiScoreExpression('COALESCE(avg_confidence, 0)', 'COALESCE(evidence_count, 0)')},
        mark = ${sqlMarkExpression('COALESCE(evidence_count, 0)')}
      WHERE mark IS NULL
         OR mark NOT IN ('s', 'g', 'l', 'n')
         OR avg_confidence IS NULL
         OR kpi_score IS NULL;
    `);

    // Safely create index, handling case where fragment_id column exists
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_evidences_fragment_kpi_iscalculated
      ON evidences(fragment_id, kpi_id, iscalculated)
      WHERE fragment_id IS NOT NULL;
    `);

    // Merge duplicated evaluations rows before enforcing uniqueness.
    await client.query(`
      WITH duplicate_groups AS (
        SELECT
          file_id,
          kpi_id,
          MIN(evaluation_id) AS keep_id,
          SUM(COALESCE(evidence_count, 0))::int AS merged_evidence_count,
          MAX(mark) AS merged_mark,
          MAX(updated_at) AS latest_updated_at
        FROM evaluations
        GROUP BY file_id, kpi_id
        HAVING COUNT(*) > 1
      )
      UPDATE evaluations e
      SET
        evidence_count = dg.merged_evidence_count,
        mark = CASE
          WHEN dg.merged_evidence_count >= 3 THEN 's'
          WHEN dg.merged_evidence_count >= 2 THEN 'g'
          WHEN dg.merged_evidence_count >= 1 THEN 'l'
          ELSE 'n'
        END,
        updated_at = COALESCE(dg.latest_updated_at, NOW())
      FROM duplicate_groups dg
      WHERE e.evaluation_id = dg.keep_id;
    `);

    await client.query(`
      WITH duplicate_groups AS (
        SELECT file_id, kpi_id, MIN(evaluation_id) AS keep_id
        FROM evaluations
        GROUP BY file_id, kpi_id
        HAVING COUNT(*) > 1
      )
      DELETE FROM evaluations e
      USING duplicate_groups dg
      WHERE e.file_id = dg.file_id
        AND e.kpi_id = dg.kpi_id
        AND e.evaluation_id <> dg.keep_id;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_evaluations_file_kpi
      ON evaluations(file_id, kpi_id);
    `);

    // Reconcile evaluations from all evidence rows so legacy data also gets avg_confidence and kpi_score.
    await client.query(`
      WITH evidence_metrics AS (
        SELECT
          COALESCE(f.file_id, e.file_id) AS file_id,
          e.kpi_id,
          COUNT(*)::int AS evidence_count,
          ROUND(AVG(${SQL_CONFIDENCE_EXTRACT_EXPR})::numeric, 2) AS avg_confidence
        FROM evidences e
        LEFT JOIN fragments f ON e.fragment_id = f.fragment_id
        WHERE COALESCE(f.file_id, e.file_id) IS NOT NULL
        GROUP BY COALESCE(f.file_id, e.file_id), e.kpi_id
      )
      INSERT INTO evaluations (
        file_id,
        kpi_id,
        evidence_count,
        avg_confidence,
        kpi_score,
        mark,
        created_at,
        updated_at
      )
      SELECT
        em.file_id,
        em.kpi_id,
        em.evidence_count,
        COALESCE(em.avg_confidence, 0),
        ${sqlKpiScoreExpression('COALESCE(em.avg_confidence, 0)', 'em.evidence_count')},
        ${sqlMarkExpression('em.evidence_count')},
        NOW(),
        NOW()
      FROM evidence_metrics em
      ON CONFLICT (file_id, kpi_id)
      DO UPDATE SET
        evidence_count = EXCLUDED.evidence_count,
        avg_confidence = EXCLUDED.avg_confidence,
        kpi_score = EXCLUDED.kpi_score,
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
            COALESCE(f.file_id, e.file_id) AS file_id,
            e.kpi_id,
            ${SQL_CONFIDENCE_EXTRACT_EXPR} AS confidence
          FROM evidences e
          LEFT JOIN fragments f ON e.fragment_id = f.fragment_id
          WHERE COALESCE(e.iscalculated, FALSE) = FALSE
          FOR UPDATE OF e SKIP LOCKED
        ),
        grouped AS (
          SELECT
            file_id,
            kpi_id,
            COUNT(*)::int AS pending_count,
            ROUND(AVG(confidence)::numeric, 2) AS pending_avg_confidence
          FROM pending
          WHERE file_id IS NOT NULL
          GROUP BY file_id, kpi_id
        ),
        upserted AS (
          INSERT INTO evaluations (
            file_id,
            kpi_id,
            evidence_count,
            avg_confidence,
            kpi_score,
            mark,
            created_at,
            updated_at
          )
          SELECT
            g.file_id,
            g.kpi_id,
            g.pending_count,
            COALESCE(g.pending_avg_confidence, 0),
            ${sqlKpiScoreExpression('COALESCE(g.pending_avg_confidence, 0)', 'g.pending_count')},
            ${sqlMarkExpression('g.pending_count')},
            NOW(), NOW()
          FROM grouped g
          ON CONFLICT (file_id, kpi_id)
          DO UPDATE SET
            evidence_count = COALESCE(evaluations.evidence_count, 0) + EXCLUDED.evidence_count,
            avg_confidence = CASE
              WHEN (COALESCE(evaluations.evidence_count, 0) + EXCLUDED.evidence_count) > 0 THEN
                ROUND((
                  (
                    COALESCE(evaluations.avg_confidence, 0) * COALESCE(evaluations.evidence_count, 0)
                  ) + (
                    COALESCE(EXCLUDED.avg_confidence, 0) * EXCLUDED.evidence_count
                  )
                ) / NULLIF(COALESCE(evaluations.evidence_count, 0) + EXCLUDED.evidence_count, 0), 2)
              ELSE 0
            END,
            kpi_score = ${sqlKpiScoreExpression(`
              CASE
                WHEN (COALESCE(evaluations.evidence_count, 0) + EXCLUDED.evidence_count) > 0 THEN
                  ROUND((
                    (
                      COALESCE(evaluations.avg_confidence, 0) * COALESCE(evaluations.evidence_count, 0)
                    ) + (
                      COALESCE(EXCLUDED.avg_confidence, 0) * EXCLUDED.evidence_count
                    )
                  ) / NULLIF(COALESCE(evaluations.evidence_count, 0) + EXCLUDED.evidence_count, 0), 2)
                ELSE 0
              END
            `, 'COALESCE(evaluations.evidence_count, 0) + EXCLUDED.evidence_count')},
            mark = ${sqlMarkExpression('COALESCE(evaluations.evidence_count, 0) + EXCLUDED.evidence_count')},
            updated_at = NOW()
          RETURNING file_id, kpi_id
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
