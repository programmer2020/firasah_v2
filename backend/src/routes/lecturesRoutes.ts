/**
 * Lectures Routes
 * API endpoints for lecture management and statistics
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest, getTenantFilter } from '../middleware/auth.js';
import { getMany } from '../helpers/database.js';

const router = Router();

/**
 * GET /api/lectures
 * Get lectures for a date range (optional query parameters)
 * @swagger
 * /lectures:
 *   get:
 *     summary: Get lectures for a date range
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Lectures retrieved successfully
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate query parameters are required',
      });
    }

    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T00:00:00Z)',
      });
    }

    const { userId } = getTenantFilter(req);

    const lectures = await getMany(
      `SELECT l.lecture_id, l.file_id, l.created_at
       FROM lecture l
       ${userId ? 'INNER JOIN sound_files sf ON l.file_id = sf.file_id' : ''}
       WHERE l.created_at >= $1 AND l.created_at < $2
       ${userId ? 'AND sf.user_id = $3' : ''}
       ORDER BY l.created_at DESC`,
      userId ? [start.toISOString(), end.toISOString(), userId] : [start.toISOString(), end.toISOString()]
    );

    res.status(200).json({
      success: true,
      message: 'Lectures retrieved successfully',
      count: lectures.length,
      data: lectures,
    });
  } catch (error) {
    console.error('[Lectures] Error retrieving lectures:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve lectures',
    });
  }
});

export default router;
