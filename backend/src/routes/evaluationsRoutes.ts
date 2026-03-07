/**
 * Evaluations Routes
 * API endpoints for evaluation record management
 */

import { Router, Request, Response } from 'express';
import {
  getAllEvaluations,
  getEvaluationById,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  getEvaluationsByKPI,
  getEvaluationsByFile,
} from '../services/evaluationsService.js';

const router = Router();

/**
 * @swagger
 * /api/evaluations:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get all evaluations
 *     description: Retrieve all evaluation records with KPI and file details
 *     responses:
 *       200:
 *         description: List of evaluations retrieved successfully
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
 *                     $ref: '#/components/schemas/Evaluation'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const evaluations = await getAllEvaluations();
    res.status(200).json({
      success: true,
      message: 'Evaluations retrieved successfully',
      data: evaluations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evaluations',
    });
  }
});

/**
 * @swagger
 * /api/evaluations/{id}:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get evaluation by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluation retrieved successfully
 *       404:
 *         description: Evaluation not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const evaluation = await getEvaluationById(parseInt(id));
    
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Evaluation retrieved successfully',
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evaluation',
    });
  }
});

/**
 * @swagger
 * /api/evaluations:
 *   post:
 *     tags:
 *       - Evaluations
 *     summary: Create a new evaluation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - file_id
 *               - kpi_id
 *             properties:
 *               file_id:
 *                 type: integer
 *               kpi_id:
 *                 type: integer
 *               evidence_count:
 *                 type: integer
 *               mark:
 *                 type: number
 *                 format: decimal
 *     responses:
 *       201:
 *         description: Evaluation created successfully
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { file_id, kpi_id, evidence_count, mark } = req.body;

    if (!file_id || !kpi_id) {
      return res.status(400).json({
        success: false,
        message: 'file_id and kpi_id are required',
      });
    }

    const evaluation = await createEvaluation({
      file_id,
      kpi_id,
      evidence_count,
      mark,
    });

    res.status(201).json({
      success: true,
      message: 'Evaluation created successfully',
      data: evaluation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create evaluation',
    });
  }
});

/**
 * @swagger
 * /api/evaluations/{id}:
 *   put:
 *     tags:
 *       - Evaluations
 *     summary: Update an evaluation
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
 *         description: Evaluation updated successfully
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    // Check if evaluation exists
    const existing = await getEvaluationById(parseInt(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found',
      });
    }

    const evaluation = await updateEvaluation(parseInt(id), data);

    res.status(200).json({
      success: true,
      message: 'Evaluation updated successfully',
      data: evaluation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update evaluation',
    });
  }
});

/**
 * @swagger
 * /api/evaluations/{id}:
 *   delete:
 *     tags:
 *       - Evaluations
 *     summary: Delete an evaluation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluation deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if evaluation exists
    const existing = await getEvaluationById(parseInt(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found',
      });
    }

    const evaluation = await deleteEvaluation(parseInt(id));

    res.status(200).json({
      success: true,
      message: 'Evaluation deleted successfully',
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete evaluation',
    });
  }
});

/**
 * @swagger
 * /api/evaluations/kpi/{kpiId}:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get evaluations by KPI
 *     parameters:
 *       - in: path
 *         name: kpiId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluations retrieved successfully
 */
router.get('/kpi/:kpiId', async (req: Request, res: Response) => {
  try {
    const kpiId = req.params.kpiId as string;
    const evaluations = await getEvaluationsByKPI(parseInt(kpiId));

    res.status(200).json({
      success: true,
      message: 'Evaluations retrieved successfully',
      data: evaluations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evaluations',
    });
  }
});

/**
 * @swagger
 * /api/evaluations/file/{fileId}:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get evaluations by file
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluations retrieved successfully
 */
router.get('/file/:fileId', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId as string;
    const evaluations = await getEvaluationsByFile(parseInt(fileId));

    res.status(200).json({
      success: true,
      message: 'Evaluations retrieved successfully',
      data: evaluations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evaluations',
    });
  }
});

export default router;
