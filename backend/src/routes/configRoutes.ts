/**
 * Configuration Routes
 * Handle database switching and other app configurations
 */

import { Router, Request, Response } from 'express';
import { switchDatabase, getDatabaseStatus } from '../config/database-manager.js';

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

export default router;
