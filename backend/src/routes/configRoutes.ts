/**
 * Configuration Routes
 * Handle database switching and other app configurations
 */

import { Router, Request, Response } from 'express';
import { switchDatabase, getDatabaseStatus } from '../config/database-manager.js';
import { runEvaluationAggregationWorker } from '../services/evaluationAggregationWorker.js';
import {
  disableEvaluationSchedule,
  enableEvaluationSchedule,
  EVALUATION_PG_CRON_DEFAULT_SCHEDULE,
  getEvaluationScheduleStatus,
} from '../services/evaluationPgCronService.js';

const router = Router();

/**
 * POST /api/config/database
 * Switch between Neon and Local database
 */
router.post('/database', async (req: Request, res: Response) => {
  try {
    const { useNeon } = req.body;

    if (typeof useNeon !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: useNeon must be a boolean',
      });
    }

    const success = await switchDatabase(useNeon);

    if (success) {
      const status = getDatabaseStatus();

      // Run one aggregation cycle after switching so the selected DB is prepared immediately.
      void runEvaluationAggregationWorker().catch((err) => {
        console.error('[Evaluation Worker] Post-switch run failed:', err);
      });

      return res.json({
        success: true,
        message: `Successfully switched to ${status.type}`,
        database: status,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to switch database',
      });
    }
  } catch (error) {
    console.error('Error switching database:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/config/database/status
 * Get current database status
 */
router.get('/database/status', (req: Request, res: Response) => {
  try {
    const status = getDatabaseStatus();
    return res.json({
      success: true,
      database: status,
    });
  } catch (error) {
    console.error('Error getting database status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get database status',
    });
  }
});

/**
 * GET /api/config/worker/status
 * Read manual worker and pg_cron job status for current selected database.
 */
router.get('/worker/status', async (req: Request, res: Response) => {
  try {
    const database = getDatabaseStatus();
    const worker = await getEvaluationScheduleStatus();

    return res.json({
      success: true,
      database,
      worker,
      defaults: {
        schedule: EVALUATION_PG_CRON_DEFAULT_SCHEDULE,
      },
    });
  } catch (error) {
    console.error('Error getting worker status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get worker status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/config/worker/run
 * Trigger one aggregation run immediately.
 */
router.post('/worker/run', async (req: Request, res: Response) => {
  try {
    const result = await runEvaluationAggregationWorker();
    return res.json({
      success: true,
      message: 'Worker run completed',
      data: result,
    });
  } catch (error) {
    console.error('Error running worker:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to run worker',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/config/worker/schedule/enable
 * Enable pg_cron schedule (default every 12 hours).
 */
router.post('/worker/schedule/enable', async (req: Request, res: Response) => {
  try {
    const requestedSchedule =
      typeof req.body?.schedule === 'string' ? req.body.schedule.trim() : '';
    const schedule = requestedSchedule || EVALUATION_PG_CRON_DEFAULT_SCHEDULE;

    const worker = await enableEvaluationSchedule(schedule);

    const modeLabel = worker.activeMode === 'pg_cron' ? 'pg_cron' : 'in-app scheduler';
    return res.json({
      success: true,
      message: `Schedule enabled using ${modeLabel}: ${worker.schedule || schedule}`,
      worker,
    });
  } catch (error) {
    console.error('Error enabling pg_cron job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to enable pg_cron job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/config/worker/schedule/disable
 * Disable pg_cron schedule for this worker.
 */
router.post('/worker/schedule/disable', async (req: Request, res: Response) => {
  try {
    const worker = await disableEvaluationSchedule();
    return res.json({
      success: true,
      message: 'All worker schedules disabled',
      worker,
    });
  } catch (error) {
    console.error('Error disabling pg_cron job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to disable pg_cron job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
