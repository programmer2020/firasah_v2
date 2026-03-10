/**
 * KPIs Routes
 * API endpoints for Key Performance Indicator management
 */

import { Router, Request, Response } from 'express';
import {
  getAllKPIs,
  getKPIById,
  createKPI,
  updateKPI,
  deleteKPI,
  getKPIsByCreator,
  getAllKPIDomains,
  getKPIDomainById,
  getKPIsGroupedByDomain,
  getKPIsByDomain,
} from '../services/kpisService.js';

const router = Router();

/**
 * @swagger
 * /api/kpis/domains/all:
 *   get:
 *     tags:
 *       - KPI Domains
 *     summary: Get all KPI domains
 *     description: Retrieve all teaching evaluation framework domains
 *     responses:
 *       200:
 *         description: List of KPI domains retrieved successfully
 */
router.get('/domains/all', async (req: Request, res: Response) => {
  try {
    const domains = await getAllKPIDomains();
    res.status(200).json({
      success: true,
      message: 'KPI domains retrieved successfully',
      data: domains,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve KPI domains',
    });
  }
});

/**
 * @swagger
 * /api/kpis/domains/{id}:
 *   get:
 *     tags:
 *       - KPI Domains
 *     summary: Get KPI domain by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: KPI domain retrieved successfully
 */
router.get('/domains/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const domain = await getKPIDomainById(parseInt(id));

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'KPI domain not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'KPI domain retrieved successfully',
      data: domain,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve KPI domain',
    });
  }
});

/**
 * @swagger
 * /api/kpis/domains-grouped:
 *   get:
 *     tags:
 *       - KPI Domains
 *     summary: Get KPIs grouped by domain
 *     description: Retrieve all domains with their associated KPIs
 *     responses:
 *       200:
 *         description: KPIs grouped by domain retrieved successfully
 */
router.get('/domains-grouped', async (req: Request, res: Response) => {
  try {
    const data = await getKPIsGroupedByDomain();
    res.status(200).json({
      success: true,
      message: 'KPIs grouped by domain retrieved successfully',
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve KPIs grouped by domain',
    });
  }
});

/**
 * @swagger
 * /api/kpis/by-domain/{domainId}:
 *   get:
 *     tags:
 *       - KPI Domains
 *     summary: Get KPIs by domain ID
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: KPIs for domain retrieved successfully
 */
router.get('/by-domain/:domainId', async (req: Request, res: Response) => {
  try {
    const domainId = req.params.domainId as string;
    const kpis = await getKPIsByDomain(parseInt(domainId));

    res.status(200).json({
      success: true,
      message: 'KPIs retrieved successfully',
      data: kpis,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve KPIs by domain',
    });
  }
});

/**
 * @swagger
 * /api/kpis:
 *   get:
 *     tags:
 *       - KPIs
 *     summary: Get all KPIs
 *     description: Retrieve all Key Performance Indicators
 *     responses:
 *       200:
 *         description: List of KPIs retrieved successfully
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
 *                     $ref: '#/components/schemas/KPI'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const kpis = await getAllKPIs();
    res.status(200).json({
      success: true,
      message: 'KPIs retrieved successfully',
      data: kpis,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve KPIs',
    });
  }
});

/**
 * @swagger
 * /api/kpis/{id}:
 *   get:
 *     tags:
 *       - KPIs
 *     summary: Get KPI by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: KPI retrieved successfully
 *       404:
 *         description: KPI not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const kpi = await getKPIById(parseInt(id));
    
    if (!kpi) {
      return res.status(404).json({
        success: false,
        message: 'KPI not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'KPI retrieved successfully',
      data: kpi,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve KPI',
    });
  }
});

/**
 * @swagger
 * /api/kpis:
 *   post:
 *     tags:
 *       - KPIs
 *     summary: Create a new KPI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kpi_name
 *               - createdBy
 *             properties:
 *               kpi_name:
 *                 type: string
 *               createdBy:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: KPI created successfully
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { kpi_name, createdBy, note } = req.body;

    if (!kpi_name || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'kpi_name and createdBy are required',
      });
    }

    const kpi = await createKPI({
      kpi_name,
      createdBy,
      note,
    });

    res.status(201).json({
      success: true,
      message: 'KPI created successfully',
      data: kpi,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create KPI',
    });
  }
});

/**
 * @swagger
 * /api/kpis/{id}:
 *   put:
 *     tags:
 *       - KPIs
 *     summary: Update a KPI
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
 *         description: KPI updated successfully
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    // Check if KPI exists
    const existing = await getKPIById(parseInt(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'KPI not found',
      });
    }

    const kpi = await updateKPI(parseInt(id), data);

    res.status(200).json({
      success: true,
      message: 'KPI updated successfully',
      data: kpi,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update KPI',
    });
  }
});

/**
 * @swagger
 * /api/kpis/{id}:
 *   delete:
 *     tags:
 *       - KPIs
 *     summary: Delete a KPI
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: KPI deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if KPI exists
    const existing = await getKPIById(parseInt(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'KPI not found',
      });
    }

    const kpi = await deleteKPI(parseInt(id));

    res.status(200).json({
      success: true,
      message: 'KPI deleted successfully',
      data: kpi,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete KPI',
    });
  }
});

/**
 * @swagger
 * /api/kpis/creator/{createdBy}:
 *   get:
 *     tags:
 *       - KPIs
 *     summary: Get KPIs by creator
 *     parameters:
 *       - in: path
 *         name: createdBy
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: KPIs retrieved successfully
 */
router.get('/creator/:createdBy', async (req: Request, res: Response) => {
  try {
    const createdBy = req.params.createdBy as string;
    const kpis = await getKPIsByCreator(createdBy);

    res.status(200).json({
      success: true,
      message: 'KPIs retrieved successfully',
      data: kpis,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve KPIs',
    });
  }
});

export default router;
