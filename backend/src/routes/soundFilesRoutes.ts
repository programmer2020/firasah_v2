/**
 * Sound Files Routes
 * API endpoints for sound file management
 */

import { Router, Request, Response } from 'express';
import {
  getAllSoundFiles,
  getSoundFileById,
  createSoundFile,
  updateSoundFile,
  deleteSoundFile,
  getSoundFilesByCreator,
} from '../services/soundFilesService.js';

const router = Router();

/**
 * @swagger
 * /api/sound-files:
 *   get:
 *     tags:
 *       - Sound Files
 *     summary: Get all sound files
 *     description: Retrieve all sound files with metadata
 *     responses:
 *       200:
 *         description: List of sound files retrieved successfully
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
 *                     $ref: '#/components/schemas/SoundFile'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const soundFiles = await getAllSoundFiles();
    res.status(200).json({
      success: true,
      message: 'Sound files retrieved successfully',
      data: soundFiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve sound files',
    });
  }
});

/**
 * @swagger
 * /api/sound-files/{id}:
 *   get:
 *     tags:
 *       - Sound Files
 *     summary: Get sound file by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sound file retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SoundFile'
 *       404:
 *         description: Sound file not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const soundFile = await getSoundFileById(parseInt(id));
    
    if (!soundFile) {
      return res.status(404).json({
        success: false,
        message: 'Sound file not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sound file retrieved successfully',
      data: soundFile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve sound file',
    });
  }
});

/**
 * @swagger
 * /api/sound-files:
 *   post:
 *     tags:
 *       - Sound Files
 *     summary: Create a new sound file
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - filepath
 *               - createdBy
 *             properties:
 *               filename:
 *                 type: string
 *               filepath:
 *                 type: string
 *               createdBy:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sound file created successfully
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { filename, filepath, createdBy, note } = req.body;

    if (!filename || !filepath || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'filename, filepath, and createdBy are required',
      });
    }

    const soundFile = await createSoundFile({
      filename,
      filepath,
      createdBy,
      note,
    });

    res.status(201).json({
      success: true,
      message: 'Sound file created successfully',
      data: soundFile,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create sound file',
    });
  }
});

/**
 * @swagger
 * /api/sound-files/{id}:
 *   put:
 *     tags:
 *       - Sound Files
 *     summary: Update a sound file
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
 *         description: Sound file updated successfully
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    // Check if sound file exists
    const existing = await getSoundFileById(parseInt(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Sound file not found',
      });
    }

    const soundFile = await updateSoundFile(parseInt(id), data);

    res.status(200).json({
      success: true,
      message: 'Sound file updated successfully',
      data: soundFile,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update sound file',
    });
  }
});

/**
 * @swagger
 * /api/sound-files/{id}:
 *   delete:
 *     tags:
 *       - Sound Files
 *     summary: Delete a sound file
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sound file deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if sound file exists
    const existing = await getSoundFileById(parseInt(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Sound file not found',
      });
    }

    const soundFile = await deleteSoundFile(parseInt(id));

    res.status(200).json({
      success: true,
      message: 'Sound file deleted successfully',
      data: soundFile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete sound file',
    });
  }
});

/**
 * @swagger
 * /api/sound-files/creator/{createdBy}:
 *   get:
 *     tags:
 *       - Sound Files
 *     summary: Get sound files by creator
 *     parameters:
 *       - in: path
 *         name: createdBy
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sound files retrieved successfully
 */
router.get('/creator/:createdBy', async (req: Request, res: Response) => {
  try {
    const createdBy = req.params.createdBy as string;
    const soundFiles = await getSoundFilesByCreator(createdBy);

    res.status(200).json({
      success: true,
      message: 'Sound files retrieved successfully',
      data: soundFiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve sound files',
    });
  }
});

export default router;
