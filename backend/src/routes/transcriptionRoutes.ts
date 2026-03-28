/**
 * Transcription Routes
 * API endpoints for managing lecture transcriptions from audio fragments
 */

import express, { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as transcriptionService from '../services/transcriptionService.js';

const router = Router();

/**
 * POST /api/transcriptions/lecture/:lectureId
 * Transcribe all fragments for a lecture and save concatenated text
 */
router.post('/lecture/:lectureId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lectureId = parseInt(req.params.lectureId as string);
    const language = (req.body?.language as string) || 'ar';

    console.log(`[Route] Transcribing lecture ${lectureId}...`);

    const result = await transcriptionService.processLectureTranscription(lectureId, language);

    res.status(200).json({
      success: true,
      message: 'Lecture transcription completed successfully',
      data: {
        lecture_id: result.id,
        file_id: result.file_id,
        transcript_length: result.transcript?.length || 0,
        language: result.language,
        updated_at: result.updated_at,
      },
    });
  } catch (err: any) {
    console.error(`[Route] Error transcribing lecture:`, err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error transcribing lecture',
    });
  }
});

/**
 * POST /api/transcriptions/file/:fileId
 * Transcribe all lectures for a file
 */
router.post('/file/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    const language = (req.body?.language as string) || 'ar';

    console.log(`[Route] Transcribing all lectures for file ${fileId}...`);

    const results = await transcriptionService.processFileTranscriptions(fileId);

    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'error').length;

    res.status(200).json({
      success: true,
      message: 'File transcriptions completed',
      data: {
        file_id: fileId,
        total_lectures: results.length,
        successful,
        failed,
        results,
      },
    });
  } catch (err: any) {
    console.error(`[Route] Error transcribing file:`, err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error transcribing file',
    });
  }
});

/**
 * POST /api/transcriptions/all
 * Transcribe all lectures across all files
 */
router.post('/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[Route] Transcribing all lectures...`);

    const result = await transcriptionService.processAllTranscriptions();

    res.status(200).json({
      success: true,
      message: 'All transcriptions completed',
      data: {
        total_processed: result.total,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
      },
    });
  } catch (err: any) {
    console.error(`[Route] Error transcribing all:`, err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error transcribing all lectures',
    });
  }
});

/**
 * GET /api/transcriptions/lecture/:lectureId
 * Get lecture with complete transcription data
 */
router.get('/lecture/:lectureId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lectureId = parseInt(req.params.lectureId as string);

    const lecture = await transcriptionService.getLectureWithTranscript(lectureId);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        error: 'Lecture not found',
      });
    }

    res.status(200).json({
      success: true,
      data: lecture,
    });
  } catch (err: any) {
    console.error(`[Route] Error getting lecture transcript:`, err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error getting lecture transcript',
    });
  }
});

/**
 * GET /api/transcriptions/file/:fileId
 * Get all lectures with transcriptions for a file
 */
router.get('/file/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);

    const lectures = await transcriptionService.getFileTranscriptions(fileId);

    res.status(200).json({
      success: true,
      data: {
        file_id: fileId,
        count: lectures.length,
        lectures,
      },
    });
  } catch (err: any) {
    console.error(`[Route] Error getting file transcriptions:`, err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error getting file transcriptions',
    });
  }
});

/**
 * GET /api/transcriptions/status/:lectureId
 * Get transcription status for a lecture
 */
router.get('/status/:lectureId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lectureId = parseInt(req.params.lectureId as string);

    const status = await transcriptionService.getTranscriptionStatus(lectureId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Lecture not found',
      });
    }

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (err: any) {
    console.error(`[Route] Error getting transcription status:`, err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error getting transcription status',
    });
  }
});

/**
 * GET /api/transcriptions/statistics
 * Get overall transcription statistics
 */
router.get('/statistics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await transcriptionService.getTranscriptionStatistics();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err: any) {
    console.error(`[Route] Error getting statistics:`, err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error getting statistics',
    });
  }
});

/**
 * DELETE /api/transcriptions/lecture/:lectureId
 * Clear transcript from a lecture (for re-transcription)
 */
router.delete('/lecture/:lectureId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lectureId = parseInt(req.params.lectureId as string);

    console.log(`[Route] Clearing transcript for lecture ${lectureId}...`);

    const result = await transcriptionService.clearLectureTranscript(lectureId);

    res.status(200).json({
      success: true,
      message: 'Lecture transcript cleared',
      data: {
        lecture_id: result.id,
        transcript: null,
      },
    });
  } catch (err: any) {
    console.error(`[Route] Error clearing transcript:`, err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Error clearing transcript',
    });
  }
});

export default router;
