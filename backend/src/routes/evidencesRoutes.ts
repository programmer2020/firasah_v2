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
  getEvidencesByFile,
} from '../services/evidencesService.js';

const router = Router();

/**
 * @swagger
 * /api/evidences:
 *   get:
 *     tags:
 *       - Evidences
 *     summary: Get all evidences
 *     description: Retrieve all evidence records with KPI and file details
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
 *               - file_id
 *             properties:
 *               kpi_id:
 *                 type: integer
 *               file_id:
 *                 type: integer
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               evidence_txt:
 *                 type: string
 *     responses:
 *       201:
 *         description: Evidence created successfully
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { kpi_id, lecture_id, start_time, end_time } = req.body;

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
 * /api/evidences/file/{fileId}:
 *   get:
 *     tags:
 *       - Evidences
 *     summary: Get evidences by file
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evidences retrieved successfully
 */
router.get('/file/:fileId', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId as string;
    const evidences = await getEvidencesByFile(parseInt(fileId));

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
 * /api/evidences/extract/{lectureId}:
 *   post:
 *     tags:
 *       - Evidences
 *     summary: Extract evidence from lecture transcript using Detection Signals
 *     description: Analyzes lecture transcript and automatically extracts evidence based on KPI Detection Signals
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evidence extracted and saved successfully
 */
router.post('/extract/:lectureId', async (req: Request, res: Response) => {
  try {
    const lectureId = parseInt(req.params.lectureId);

    if (isNaN(lectureId) || lectureId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lecture ID',
      });
    }

    // Call Python evidence extraction service
    const { spawn } = await import('child_process');
    const python = spawn('python', [
      './evidence_api.py',
      'extract',
      lectureId.toString(),
    ]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    python.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    python.on('close', (code: number) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          res.status(200).json({
            success: true,
            message: 'Evidence extracted successfully',
            data: result,
          });
        } catch (parseError) {
          res.status(200).json({
            success: true,
            message: 'Evidence extraction completed',
            data: {
              lectureId,
              status: 'processing',
            },
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: errorOutput || 'Evidence extraction failed',
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Evidence extraction error',
    });
  }
});

export default router;
