/**
 * Upload Logs Routes
 * Exposes the upload_logs table via REST endpoints.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getLogsForFile,
  getRecentLogs,
  getUploadSummary,
  clearLogsForFile,
} from '../services/uploadLogService.js';

const router = Router();

/**
 * GET /api/upload-logs
 * Returns the most recent N log entries across all files.
 * Query params: ?limit=100
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await getRecentLogs(limit);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch logs',
    });
  }
});

/**
 * GET /api/upload-logs/summary
 * Returns a per-file summary (last event, error count, etc.)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await getUploadSummary();
    res.json({ success: true, count: summary.length, data: summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch summary',
    });
  }
});

/**
 * GET /api/upload-logs/:fileId
 * Returns all logs for a specific file in chronological order.
 */
router.get('/:fileId', async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    if (isNaN(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }
    const logs = await getLogsForFile(fileId);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch logs',
    });
  }
});

/**
 * DELETE /api/upload-logs/:fileId
 * Clears all logs for a specific file.
 */
router.delete('/:fileId', authenticate, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    if (isNaN(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }
    const deleted = await clearLogsForFile(fileId);
    res.json({ success: true, message: `Deleted ${deleted} log entries`, deleted });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear logs',
    });
  }
});

export default router;
