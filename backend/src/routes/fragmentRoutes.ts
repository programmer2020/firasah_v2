/**
 * Fragment Routes
 * API endpoints for managing audio fragments
 */

import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  getFragmentsByFileId,
  getFragmentsByLectureId,
  getFragmentsByTimeSlot,
  processLectureFragments,
  deleteFileFragments,
  getFragmentStatistics,
  splitAudioIntoFragments,
  createFragmentRecords,
} from '../services/fragmentService.js';
import { getOne, getMany } from '../helpers/database.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/fragments/file/:fileId
 * Get all fragments for a sound file
 */
router.get('/file/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    const fragments = await getFragmentsByFileId(fileId);

    res.json({
      success: true,
      data: fragments,
      count: fragments.length,
    });
  } catch (err) {
    console.error('[FragmentRoutes] Error getting file fragments:', err);
    res.status(500).json({ success: false, message: 'Failed to get fragments', error: (err as any)?.message });
  }
});

/**
 * GET /api/fragments/lecture/:lectureId
 * Get all fragments for a lecture
 */
router.get('/lecture/:lectureId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lectureId = parseInt(req.params.lectureId as string);
    const fragments = await getFragmentsByLectureId(lectureId);

    res.json({
      success: true,
      data: fragments,
      count: fragments.length,
    });
  } catch (err) {
    console.error('[FragmentRoutes] Error getting lecture fragments:', err);
    res.status(500).json({ success: false, message: 'Failed to get fragments', error: (err as any)?.message });
  }
});

/**
 * GET /api/fragments/timeslot/:timeSlotId
 * Get all fragments for a time slot
 */
router.get('/timeslot/:timeSlotId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const timeSlotId = parseInt(req.params.timeSlotId as string);
    const fragments = await getFragmentsByTimeSlot(timeSlotId);

    res.json({
      success: true,
      data: fragments,
      count: fragments.length,
    });
  } catch (err) {
    console.error('[FragmentRoutes] Error getting timeslot fragments:', err);
    res.status(500).json({ success: false, message: 'Failed to get fragments', error: (err as any)?.message });
  }
});

/**
 * GET /api/fragments/stats/:fileId
 * Get fragment statistics for a file
 */
router.get('/stats/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    const stats = await getFragmentStatistics(fileId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('[FragmentRoutes] Error getting fragment stats:', err);
    res.status(500).json({ success: false, message: 'Failed to get statistics', error: (err as any)?.message });
  }
});

/**
 * POST /api/fragments/process/:fileId
 * Process a sound file into fragments
 * Query params: lectureId (optional), timeSlotId (optional)
 */
router.post('/process/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    const { lectureId, timeSlotId } = req.query;

    // Get sound file info
    const soundFile = await getOne('SELECT * FROM sound_files WHERE file_id = $1', [fileId]);
    if (!soundFile) {
      return res.status(404).json({ success: false, message: 'Sound file not found' });
    }

    // Process fragments
    const fragments = await processLectureFragments(
      fileId,
      soundFile.filepath,
      lectureId ? parseInt(lectureId as string) : undefined,
      timeSlotId ? parseInt(timeSlotId as string) : undefined
    );

    res.json({
      success: true,
      message: `✅ Processed ${fragments.length} fragments`,
      data: fragments,
    });
  } catch (err) {
    console.error('[FragmentRoutes] Error processing fragments:', err);
    res.status(500).json({ success: false, message: 'Failed to process fragments', error: (err as any)?.message });
  }
});

/**
 * POST /api/fragments/process-all
 * Process all sound files into fragments
 * This is an admin-only operation
 */
router.post('/process-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[FragmentRoutes] Starting bulk fragment processing...');

    // Get all sound files
    const soundFiles = await getMany('SELECT * FROM sound_files ORDER BY file_id ASC', []);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of soundFiles) {
      try {
        console.log(`[FragmentRoutes] Processing file ${file.file_id}: ${file.filename}`);

        // Check if file exists
        if (!fs.existsSync(file.filepath)) {
          console.warn(`[FragmentRoutes] ⚠️  File not found: ${file.filepath}`);
          errorCount++;
          continue;
        }

        // Get associated lectures for this file
        const lectures = await getMany(
          'SELECT * FROM lecture WHERE file_id = $1 ORDER BY lecture_id ASC',
          [file.file_id]
        );

        if (lectures.length === 0) {
          console.log(`[FragmentRoutes] No lectures found for file ${file.file_id}, creating fragments without lecture link`);
          const fragments = await processLectureFragments(file.file_id, file.filepath);
          results.push({ file_id: file.file_id, status: 'success', fragments_created: fragments.length });
          successCount++;
        } else {
          // Process fragments for each lecture
          for (const lecture of lectures) {
            const fragments = await processLectureFragments(
              file.file_id,
              file.filepath,
              lecture.lecture_id,
              lecture.time_slot_id
            );
            results.push({
              file_id: file.file_id,
              lecture_id: lecture.lecture_id,
              status: 'success',
              fragments_created: fragments.length,
            });
          }
          successCount++;
        }
      } catch (err) {
        console.error(`[FragmentRoutes] Error processing file ${file.file_id}:`, err);
        results.push({
          file_id: file.file_id,
          status: 'error',
          error: (err as any).message,
        });
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `✅ Processed ${successCount} files, ${errorCount} errors`,
      results,
      summary: {
        total_files: soundFiles.length,
        successful: successCount,
        errors: errorCount,
      },
    });
  } catch (err) {
    console.error('[FragmentRoutes] Error in bulk processing:', err);
    res.status(500).json({ success: false, message: 'Failed to process fragments', error: (err as any)?.message });
  }
});

/**
 * DELETE /api/fragments/file/:fileId
 * Delete all fragments for a file
 */
router.delete('/file/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    const deletedCount = await deleteFileFragments(fileId);

    res.json({
      success: true,
      message: `✅ Deleted ${deletedCount} fragments`,
      deleted_count: deletedCount,
    });
  } catch (err) {
    console.error('[FragmentRoutes] Error deleting fragments:', err);
    res.status(500).json({ success: false, message: 'Failed to delete fragments', error: (err as any)?.message });
  }
});

export default router;
