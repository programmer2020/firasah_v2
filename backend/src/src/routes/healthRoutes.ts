/**
 * Health Check Routes
 * Simple endpoints for API health monitoring
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health Check
 *     description: Basic endpoint to check if the API is running
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 🚀 Firasah AI v2 API is running!
 *                 version:
 *                   type: string
 *                   example: 2.0.0.1
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: '🚀 Firasah AI v2 API is running!',
    version: '2.0.0.1',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Detailed Health Status
 *     description: Get detailed information about API health and system status
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 1234.56
 *                   description: Server uptime in seconds
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
