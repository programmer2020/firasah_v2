/**
 * Evaluations Routes
 * API endpoints for lecture_kpi record management
 */

import { Router, Request, Response } from 'express';
import {
  getAllEvaluations,
  getEvaluationByLectureAndKPI,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  getEvaluationsByKPI,
  getEvaluationsByLecture,
} from '../services/evaluationsService.js';

const router = Router();

/**
 * @swagger
 * /api/evaluations:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get all lecture_kpi records
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
 * /api/evaluations/lecture/{lectureId}/kpi/{kpiId}:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get lecture_kpi by lecture and KPI
 */
router.get('/lecture/:lectureId/kpi/:kpiId', async (req: Request, res: Response) => {
  try {
    const { lectureId, kpiId } = req.params;
    const evaluation = await getEvaluationByLectureAndKPI(parseInt(lectureId), parseInt(kpiId));

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
 *     summary: Create a new lecture_kpi record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lecture_id
 *               - kpi_id
 *             properties:
 *               lecture_id:
 *                 type: integer
 *               kpi_id:
 *                 type: integer
 *               evidence_count:
 *                 type: integer
 *               avg_confidence:
 *                 type: number
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { lecture_id, kpi_id, evidence_count, avg_confidence } = req.body;

    if (!lecture_id || !kpi_id) {
      return res.status(400).json({
        success: false,
        message: 'lecture_id and kpi_id are required',
      });
    }

    const evaluation = await createEvaluation({
      lecture_id,
      kpi_id,
      evidence_count,
      avg_confidence,
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
 * /api/evaluations/lecture/{lectureId}/kpi/{kpiId}:
 *   put:
 *     tags:
 *       - Evaluations
 *     summary: Update a lecture_kpi record
 */
router.put('/lecture/:lectureId/kpi/:kpiId', async (req: Request, res: Response) => {
  try {
    const { lectureId, kpiId } = req.params;
    const data = req.body;

    const existing = await getEvaluationByLectureAndKPI(parseInt(lectureId), parseInt(kpiId));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found',
      });
    }

    const evaluation = await updateEvaluation(parseInt(lectureId), parseInt(kpiId), data);

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
 * /api/evaluations/lecture/{lectureId}/kpi/{kpiId}:
 *   delete:
 *     tags:
 *       - Evaluations
 *     summary: Delete a lecture_kpi record
 */
router.delete('/lecture/:lectureId/kpi/:kpiId', async (req: Request, res: Response) => {
  try {
    const { lectureId, kpiId } = req.params;

    const existing = await getEvaluationByLectureAndKPI(parseInt(lectureId), parseInt(kpiId));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found',
      });
    }

    const evaluation = await deleteEvaluation(parseInt(lectureId), parseInt(kpiId));

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
 * /api/evaluations/lecture/{lectureId}:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get evaluations by lecture
 */
router.get('/lecture/:lectureId', async (req: Request, res: Response) => {
  try {
    const lectureId = req.params.lectureId as string;
    const evaluations = await getEvaluationsByLecture(parseInt(lectureId));

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
