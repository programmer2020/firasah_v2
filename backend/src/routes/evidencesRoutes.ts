/**
 * Evidences Routes
 * API endpoints for evidence record management
 */

import { Router, Request, Response } from 'express';
import {
  getAllEvidences,
  getEvidenceById,
  createEvidence,
  updateEvidence,
  deleteEvidence,
  getEvidencesByKPI,
  getEvidencesByLecture,
} from '../services/evidencesService.js';

const router = Router();

/**
 * @swagger
 * /api/evidences:
 *   get:
 *     tags:
 *       - Evidences
 *     summary: Get all evidences
 *     description: Retrieve all evidence records with KPI and lecture details
 *     responses:
 *       200:
 *         description: List of evidences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Evidence'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const evidences = await getAllEvidences();
    res.status(200).json({
      success: true,
      message: 'Evidences retrieved successfully',
      data: evidences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evidences',
    });
  }
});

/**
 * @swagger
 * /api/evidences/{id}:
 *   get:
 *     tags:
 *       - Evidences
 *     summary: Get evidence by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evidence retrieved successfully
 *       404:
 *         description: Evidence not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const evidence = await getEvidenceById(parseInt(id));
    
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Evidence retrieved successfully',
      data: evidence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evidence',
    });
  }
});

/**
 * @swagger
 * /api/evidences:
 *   post:
 *     tags:
 *       - Evidences
 *     summary: Create a new evidence
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kpi_id
 *               - lecture_id
 *             properties:
 *               kpi_id:
 *                 type: integer
 *               lecture_id:
 *                 type: integer
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *               facts:
 *                 type: string
 *               interpretation:
 *                 type: string
 *               limitations:
 *                 type: string
 *               confidence:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Evidence created successfully
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { kpi_id, lecture_id, start_time, end_time, status, facts, interpretation, limitations, confidence } = req.body;

    if (!kpi_id || !lecture_id) {
      return res.status(400).json({
        success: false,
        message: 'kpi_id and lecture_id are required',
      });
    }

    const evidence = await createEvidence({
      kpi_id,
      lecture_id,
      start_time,
      end_time,
      status,
      facts,
      interpretation,
      limitations,
      confidence,
    });

    res.status(201).json({
      success: true,
      message: 'Evidence created successfully',
      data: evidence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create evidence',
    });
  }
});

/**
 * @swagger
 * /api/evidences/{id}:
 *   put:
 *     tags:
 *       - Evidences
 *     summary: Update an evidence
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Evidence updated successfully
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    // Check if evidence exists
    const existing = await getEvidenceById(parseInt(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found',
      });
    }

    const evidence = await updateEvidence(parseInt(id), data);

    res.status(200).json({
      success: true,
      message: 'Evidence updated successfully',
      data: evidence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update evidence',
    });
  }
});

/**
 * @swagger
 * /api/evidences/{id}:
 *   delete:
 *     tags:
 *       - Evidences
 *     summary: Delete an evidence
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evidence deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if evidence exists
    const existing = await getEvidenceById(parseInt(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found',
      });
    }

    const evidence = await deleteEvidence(parseInt(id));

    res.status(200).json({
      success: true,
      message: 'Evidence deleted successfully',
      data: evidence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete evidence',
    });
  }
});

/**
 * @swagger
 * /api/evidences/kpi/{kpiId}:
 *   get:
 *     tags:
 *       - Evidences
 *     summary: Get evidences by KPI
 *     parameters:
 *       - in: path
 *         name: kpiId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evidences retrieved successfully
 */
router.get('/kpi/:kpiId', async (req: Request, res: Response) => {
  try {
    const kpiId = req.params.kpiId as string;
    const evidences = await getEvidencesByKPI(parseInt(kpiId));

    res.status(200).json({
      success: true,
      message: 'Evidences retrieved successfully',
      data: evidences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evidences',
    });
  }
});

/**
 * @swagger
 * /api/evidences/lecture/{lectureId}:
 *   get:
 *     tags:
 *       - Evidences
 *     summary: Get evidences by lecture
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evidences retrieved successfully
 */
router.get('/lecture/:lectureId', async (req: Request, res: Response) => {
  try {
    const lectureId = req.params.lectureId as string;
    const evidences = await getEvidencesByLecture(parseInt(lectureId));

    res.status(200).json({
      success: true,
      message: 'Evidences retrieved successfully',
      data: evidences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evidences',
    });
  }
});

export default router;
