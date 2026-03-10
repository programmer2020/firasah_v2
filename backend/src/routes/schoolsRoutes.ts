/**
 * Schools Routes
 * Endpoints for managing schools
 */

import { Router, Request, Response } from 'express';
import {
  getAllSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
} from '../services/schoolsService.js';
import { errorHandler } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /schools:
 *   get:
 *     tags:
 *       - Schools
 *     summary: Get all schools
 *     description: Retrieve a list of all schools
 *     responses:
 *       200:
 *         description: List of schools
 */
router.get('/', errorHandler, async (req: Request, res: Response) => {
  try {
    const schools = await getAllSchools();
    res.status(200).json({
      success: true,
      data: schools,
      message: 'Schools retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error fetching schools:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schools',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /schools/{id}:
 *   get:
 *     tags:
 *       - Schools
 *     summary: Get school by ID
 *     description: Retrieve a specific school by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: School found
 *       404:
 *         description: School not found
 */
router.get('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const school = await getSchoolById(Number(id));

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    res.status(200).json({
      success: true,
      data: school,
    });
  } catch (error: any) {
    console.error('Error fetching school:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /schools:
 *   post:
 *     tags:
 *       - Schools
 *     summary: Create a new school
 *     description: Add a new school to the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               school_name:
 *                 type: string
 *               school_code:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       201:
 *         description: School created successfully
 */
router.post('/', errorHandler, async (req: Request, res: Response) => {
  try {
    const { school_name, school_code, city, country } = req.body;

    if (!school_name) {
      return res.status(400).json({
        success: false,
        message: 'School name is required',
      });
    }

    const school = await createSchool({
      school_name,
      school_code,
      city,
      country,
    });

    res.status(201).json({
      success: true,
      data: school,
      message: 'School created successfully',
    });
  } catch (error: any) {
    console.error('Error creating school:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create school',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /schools/{id}:
 *   put:
 *     tags:
 *       - Schools
 *     summary: Update a school
 *     description: Update school information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               school_name:
 *                 type: string
 *               school_code:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: School updated successfully
 */
router.put('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_name, school_code, city, country } = req.body;

    const school = await updateSchool(Number(id), {
      school_name,
      school_code,
      city,
      country,
    });

    res.status(200).json({
      success: true,
      data: school,
      message: 'School updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating school:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update school',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /schools/{id}:
 *   delete:
 *     tags:
 *       - Schools
 *     summary: Delete a school
 *     description: Remove a school from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: School deleted successfully
 */
router.delete('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteSchool(Number(id));

    res.status(200).json({
      success: true,
      message: 'School deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting school:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete school',
      error: error.message,
    });
  }
});

export default router;
