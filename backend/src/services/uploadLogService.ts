/**
 * Upload Log Service
 * Persists a full audit trail for every sound-file upload pipeline event.
 *
 * Events flow:
 *  upload_received → (video_conversion) → sound_file_created → pipeline_started
 *    → denoising_started → denoising_completed
 *    → duration_analyzed → lecture_created
 *    → fragment_splitting_started
 *      → fragment_split → fragment_transcribed → fragment_saved  (×N)
 *      → fragment_failed                                          (on error)
 *    → lecture_updated → pipeline_completed
 *    → pipeline_failed  (on critical error)
 */

import { executeQuery, getMany, getOne } from '../helpers/database.js';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

/** Pipeline stage names for structured logging */
export type StageName =
  | 'upload'
  | 'video_conversion'
  | 'db_record'
  | 'denoising'
  | 'duration_analysis'
  | 'lecture_creation'
  | 'fragment_splitting'
  | 'transcription'
  | 'fragment_saving'
  | 'lecture_update'
  | 'evaluation'
  | 'pipeline'
  | 'text_processing'
  | 'retry';

export interface UploadLogEntry {
  log_id: number;
  file_id: number | null;
  event: string;
  level: LogLevel;
  message: string | null;
  metadata: Record<string, any> | null;
  stage_name: StageName | null;
  duration_ms: number | null;
  user_id: number | null;
  file_size_bytes: number | null;
  fragment_index: number | null;
  total_fragments: number | null;
  error_details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface LogExtra {
  stageName?: StageName;
  durationMs?: number;
  userId?: number;
  fileSizeBytes?: number;
  fragmentIndex?: number;
  totalFragments?: number;
  errorDetails?: string;
  ipAddress?: string;
}

/**
 * Write one log entry (fire-and-forget — never throws).
 */
export const logUpload = async (
  fileId: number | null,
  event: string,
  level: LogLevel,
  message: string,
  metadata?: Record<string, any>,
  extra?: LogExtra
): Promise<void> => {
  try {
    await executeQuery(
      `INSERT INTO upload_logs (file_id, event, level, message, metadata,
        stage_name, duration_ms, user_id, file_size_bytes,
        fragment_index, total_fragments, error_details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        fileId ?? null,
        event,
        level,
        message,
        metadata ? JSON.stringify(metadata) : null,
        extra?.stageName ?? null,
        extra?.durationMs ?? null,
        extra?.userId ?? null,
        extra?.fileSizeBytes ?? null,
        extra?.fragmentIndex ?? null,
        extra?.totalFragments ?? null,
        extra?.errorDetails ?? null,
        extra?.ipAddress ?? null,
      ]
    );
  } catch (err) {
    // Never let logging break the pipeline
    console.error('[UploadLog] ⚠️ Failed to write log entry:', (err as Error).message);
  }
};

/**
 * Get all logs for a specific file, ordered chronologically.
 */
export const getLogsForFile = async (fileId: number): Promise<UploadLogEntry[]> => {
  return await getMany(
    `SELECT log_id, file_id, event, level, message, metadata,
            stage_name, duration_ms, user_id, file_size_bytes,
            fragment_index, total_fragments, error_details, ip_address, created_at
     FROM upload_logs
     WHERE file_id = $1
     ORDER BY created_at ASC, log_id ASC`,
    [fileId]
  );
};

/**
 * Get the latest N log entries across all files (for a dashboard view).
 */
export const getRecentLogs = async (limit = 100): Promise<UploadLogEntry[]> => {
  return await getMany(
    `SELECT ul.log_id, ul.file_id, ul.event, ul.level, ul.message,
            ul.metadata, ul.stage_name, ul.duration_ms, ul.user_id,
            ul.file_size_bytes, ul.fragment_index, ul.total_fragments,
            ul.error_details, ul.ip_address, ul.created_at,
            sf.filename
     FROM upload_logs ul
     LEFT JOIN sound_files sf ON sf.file_id = ul.file_id
     ORDER BY ul.created_at DESC, ul.log_id DESC
     LIMIT $1`,
    [limit]
  );
};

/**
 * Get a summary per file: total events, last event, last status.
 */
export const getUploadSummary = async (): Promise<any[]> => {
  return await getMany(
    `SELECT
       ul.file_id,
       sf.filename,
       sf.class_id,
       COUNT(*)::int                                          AS total_events,
       MAX(ul.created_at)                                    AS last_event_at,
       (SELECT event   FROM upload_logs WHERE file_id = ul.file_id ORDER BY created_at DESC, log_id DESC LIMIT 1) AS last_event,
       (SELECT level   FROM upload_logs WHERE file_id = ul.file_id ORDER BY created_at DESC, log_id DESC LIMIT 1) AS last_level,
       (SELECT message FROM upload_logs WHERE file_id = ul.file_id ORDER BY created_at DESC, log_id DESC LIMIT 1) AS last_message,
       COUNT(*) FILTER (WHERE ul.level = 'error')::int       AS error_count,
       COUNT(*) FILTER (WHERE ul.level = 'warning')::int     AS warning_count
     FROM upload_logs ul
     LEFT JOIN sound_files sf ON sf.file_id = ul.file_id
     GROUP BY ul.file_id, sf.filename, sf.class_id
     ORDER BY last_event_at DESC`,
    []
  );
};

/**
 * Delete all logs for a specific file.
 */
export const clearLogsForFile = async (fileId: number): Promise<number> => {
  const result = await executeQuery(
    'DELETE FROM upload_logs WHERE file_id = $1',
    [fileId]
  );
  return (result as any).rowCount ?? 0;
};
