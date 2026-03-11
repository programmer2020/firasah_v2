/**
 * Evaluation pg_cron Service
 *
 * Manages a PostgreSQL pg_cron job that periodically executes:
 *   SELECT public.run_evaluation_aggregation_job();
 */

import { executeQuery } from '../helpers/database.js';
import {
  ensureAggregationFunctionForCurrentDb,
  ensureAggregationSchemaForCurrentDb,
  getInAppEvaluationSchedulerStatus,
  InAppSchedulerStatus,
  startInAppEvaluationScheduler,
  stopInAppEvaluationScheduler,
} from './evaluationAggregationWorker.js';

export const EVALUATION_PG_CRON_JOB_NAME = 'evaluation_aggregation_12h';
export const EVALUATION_PG_CRON_DEFAULT_SCHEDULE =
  process.env.EVALUATION_PG_CRON_SCHEDULE || '0 */12 * * *';
const EVALUATION_PG_CRON_COMMAND = 'SELECT public.run_evaluation_aggregation_job();';

type CronJobRow = {
  jobid: number;
  schedule: string;
  active: boolean;
  command: string;
  jobname: string | null;
};

export type EvaluationPgCronStatus = {
  pgCronAvailable: boolean;
  enabled: boolean;
  jobName: string;
  schedule: string | null;
  jobId: number | null;
  command: string | null;
  info: string;
};

export type EvaluationScheduleStatus = {
  enabled: boolean;
  activeMode: 'pg_cron' | 'in_app' | 'none';
  schedule: string | null;
  info: string;
  pgCron: EvaluationPgCronStatus;
  inApp: InAppSchedulerStatus;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const formatIntervalMs = (intervalMs: number): string => {
  const totalMinutes = Math.floor(intervalMs / 60000);
  if (totalMinutes % (60 * 24) === 0) return `${totalMinutes / (60 * 24)} day(s)`;
  if (totalMinutes % 60 === 0) return `${totalMinutes / 60} hour(s)`;
  return `${totalMinutes} minute(s)`;
};

const parseCronToIntervalMs = (schedule: string): number | null => {
  const normalized = schedule.trim();

  // Every N hours: 0 */12 * * *
  const hourlyMatch = normalized.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
  if (hourlyMatch) {
    const hours = Number.parseInt(hourlyMatch[1], 10);
    if (Number.isFinite(hours) && hours > 0) return hours * 60 * 60 * 1000;
  }

  // Every N minutes: */15 * * * *
  const minuteMatch = normalized.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (minuteMatch) {
    const minutes = Number.parseInt(minuteMatch[1], 10);
    if (Number.isFinite(minutes) && minutes > 0) return minutes * 60 * 1000;
  }

  return null;
};

const isPgCronInstalled = async (): Promise<boolean> => {
  const result = await executeQuery(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_extension
      WHERE extname = 'pg_cron'
    ) AS installed;
  `);

  return Boolean(result.rows[0]?.installed);
};

const ensurePgCronExtension = async (): Promise<void> => {
  try {
    await executeQuery('CREATE EXTENSION IF NOT EXISTS pg_cron;');
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(`Unable to enable pg_cron extension: ${message}`);
  }

  const installed = await isPgCronInstalled();
  if (!installed) {
    throw new Error('pg_cron extension is not installed on this database.');
  }
};

const getLatestJobByName = async (jobName: string): Promise<CronJobRow | null> => {
  const result = await executeQuery(
    `
      SELECT
        jobid::int AS jobid,
        schedule,
        active,
        command,
        jobname
      FROM cron.job
      WHERE jobname = $1
      ORDER BY jobid DESC
      LIMIT 1;
    `,
    [jobName]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0] as CronJobRow;
  return {
    jobid: Number(row.jobid),
    schedule: row.schedule,
    active: Boolean(row.active),
    command: row.command,
    jobname: row.jobname,
  };
};

const unscheduleJobsByName = async (jobName: string): Promise<number> => {
  const jobs = await executeQuery(
    `
      SELECT jobid::int AS jobid
      FROM cron.job
      WHERE jobname = $1;
    `,
    [jobName]
  );

  let unscheduledCount = 0;
  for (const job of jobs.rows as Array<{ jobid: number }>) {
    await executeQuery('SELECT cron.unschedule($1::int);', [Number(job.jobid)]);
    unscheduledCount += 1;
  }

  return unscheduledCount;
};

export const getEvaluationPgCronStatus = async (): Promise<EvaluationPgCronStatus> => {
  try {
    const installed = await isPgCronInstalled();
    if (!installed) {
      return {
        pgCronAvailable: false,
        enabled: false,
        jobName: EVALUATION_PG_CRON_JOB_NAME,
        schedule: null,
        jobId: null,
        command: null,
        info: 'pg_cron is not installed on the selected database.',
      };
    }

    const job = await getLatestJobByName(EVALUATION_PG_CRON_JOB_NAME);
    if (!job) {
      return {
        pgCronAvailable: true,
        enabled: false,
        jobName: EVALUATION_PG_CRON_JOB_NAME,
        schedule: null,
        jobId: null,
        command: null,
        info: 'pg_cron is available. 12-hour job is currently disabled.',
      };
    }

    return {
      pgCronAvailable: true,
      enabled: Boolean(job.active),
      jobName: job.jobname || EVALUATION_PG_CRON_JOB_NAME,
      schedule: job.schedule,
      jobId: Number(job.jobid),
      command: job.command,
      info: job.active
        ? 'pg_cron job is enabled.'
        : 'pg_cron job exists but is disabled.',
    };
  } catch (error) {
    return {
      pgCronAvailable: false,
      enabled: false,
      jobName: EVALUATION_PG_CRON_JOB_NAME,
      schedule: null,
      jobId: null,
      command: null,
      info: `Failed to read pg_cron status: ${getErrorMessage(error)}`,
    };
  }
};

export const getEvaluationScheduleStatus = async (): Promise<EvaluationScheduleStatus> => {
  const pgCron = await getEvaluationPgCronStatus();
  const inApp = getInAppEvaluationSchedulerStatus();

  if (pgCron.enabled) {
    return {
      enabled: true,
      activeMode: 'pg_cron',
      schedule: pgCron.schedule,
      info: pgCron.info,
      pgCron,
      inApp,
    };
  }

  if (inApp.enabled) {
    return {
      enabled: true,
      activeMode: 'in_app',
      schedule: `every ${formatIntervalMs(inApp.intervalMs)}`,
      info: 'pg_cron unavailable, using in-app scheduler.',
      pgCron,
      inApp,
    };
  }

  return {
    enabled: false,
    activeMode: 'none',
    schedule: null,
    info: pgCron.pgCronAvailable
      ? 'No active schedule. You can enable pg_cron schedule.'
      : 'pg_cron unavailable. Enable in-app schedule from this page.',
    pgCron,
    inApp,
  };
};

export const enableEvaluationPgCronJob = async (
  schedule: string = EVALUATION_PG_CRON_DEFAULT_SCHEDULE
): Promise<EvaluationPgCronStatus> => {
  const normalizedSchedule = schedule.trim() || EVALUATION_PG_CRON_DEFAULT_SCHEDULE;

  await ensureAggregationSchemaForCurrentDb();
  await ensureAggregationFunctionForCurrentDb();
  await ensurePgCronExtension();

  await unscheduleJobsByName(EVALUATION_PG_CRON_JOB_NAME);

  await executeQuery(
    'SELECT cron.schedule($1::text, $2::text, $3::text) AS jobid;',
    [EVALUATION_PG_CRON_JOB_NAME, normalizedSchedule, EVALUATION_PG_CRON_COMMAND]
  );

  return getEvaluationPgCronStatus();
};

export const enableEvaluationSchedule = async (
  schedule: string = EVALUATION_PG_CRON_DEFAULT_SCHEDULE
): Promise<EvaluationScheduleStatus> => {
  const normalizedSchedule = schedule.trim() || EVALUATION_PG_CRON_DEFAULT_SCHEDULE;

  // Always make sure schema and SQL function exist first.
  await ensureAggregationSchemaForCurrentDb();
  await ensureAggregationFunctionForCurrentDb();

  let pgCronError: string | null = null;
  try {
    const pgCronStatus = await enableEvaluationPgCronJob(normalizedSchedule);
    if (pgCronStatus.enabled) {
      stopInAppEvaluationScheduler();
      return getEvaluationScheduleStatus();
    }
  } catch (error) {
    pgCronError = getErrorMessage(error);
  }

  const parsedInterval = parseCronToIntervalMs(normalizedSchedule);
  const intervalMs = parsedInterval || 12 * 60 * 60 * 1000;
  startInAppEvaluationScheduler(intervalMs);

  const status = await getEvaluationScheduleStatus();
  return {
    ...status,
    info: pgCronError
      ? `pg_cron unavailable (${pgCronError}). Fallback in-app scheduler enabled every ${formatIntervalMs(intervalMs)}.`
      : `Fallback in-app scheduler enabled every ${formatIntervalMs(intervalMs)}.`,
  };
};

export const disableEvaluationPgCronJob = async (): Promise<EvaluationPgCronStatus> => {
  const installed = await isPgCronInstalled();
  if (!installed) {
    return {
      pgCronAvailable: false,
      enabled: false,
      jobName: EVALUATION_PG_CRON_JOB_NAME,
      schedule: null,
      jobId: null,
      command: null,
      info: 'pg_cron is not installed on the selected database.',
    };
  }

  await unscheduleJobsByName(EVALUATION_PG_CRON_JOB_NAME);
  return getEvaluationPgCronStatus();
};

export const disableEvaluationSchedule = async (): Promise<EvaluationScheduleStatus> => {
  try {
    await disableEvaluationPgCronJob();
  } catch (error) {
    // Best effort. We still want to stop in-app scheduler.
    console.warn('[Evaluation Scheduler] Failed to disable pg_cron job:', getErrorMessage(error));
  }

  stopInAppEvaluationScheduler();
  const status = await getEvaluationScheduleStatus();
  return {
    ...status,
    info: 'All scheduler modes disabled.',
  };
};
