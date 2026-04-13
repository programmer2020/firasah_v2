/**
 * Sound Files Routes
 * API endpoints for sound file management
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireFileOwnership, AuthRequest } from '../middleware/auth.js';
import { verifyToken } from '../services/authService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllSoundFiles,
  getSoundFileById,
  createSoundFile,
  updateSoundFile,
  deleteSoundFile,
  getSoundFilesByCreator,
} from '../services/soundFilesService.js';
import { transcribeAndSave, convertVideoToAudio, getSpeechByFileId, retranscribePendingFragments, transcribeAudio } from '../services/speechService.js';
import { getProgress, addSSEClient, updateProgress } from '../services/progressService.js';
import { getEvaluationResults, generateEvaluationReport, testEvaluation, getEvaluationsWithFilters, exportEvaluationToJSON, generateComprehensiveReport } from '../services/evaluationsService.js';
import { getOne, getMany, executeQuery, update } from '../helpers/database.js';
import { logUpload, getLogsForFile, getRecentLogs, getUploadSummary, clearLogsForFile } from '../services/uploadLogService.js';

// Configure multer for audio uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Fix multer latin1 filename encoding to UTF-8
const decodeFilename = (filename: string): string => {
  try {
    return Buffer.from(filename, 'latin1').toString('utf8');
  } catch {
    return filename;
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const decodedName = decodeFilename(file.originalname);
    const ext = path.extname(decodedName);
    const name = path.basename(decodedName, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  },
});

const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const TEXT_TYPES = ['text/plain'];

const fileFilter = (req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (AUDIO_TYPES.includes(file.mimetype) || VIDEO_TYPES.includes(file.mimetype) || TEXT_TYPES.includes(file.mimetype) || ext === '.txt') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported: audio (mp3, wav, ogg, m4a, webm), video (mp4, webm, mov, avi, mkv), and text (txt)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
});

const router = Router();

/** Who uploaded the file (email preferred for display; id as string fallback). */
function resolveCreatedBy(req: AuthRequest): string {
  if (req.user?.email) return req.user.email;
  if (req.user?.id != null) return String(req.user.id);
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload?.email) return payload.email;
    if (payload?.user_id != null) return String(payload.user_id);
  }
  return 'anonymous';
}

/**
 * @swagger
 * /api/sound-files/upload:
 *   post:
 *     tags:
 *       - Sound Files
 *     summary: Upload an audio file
 *     description: Upload an audio file and save it to the database
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *             required:
 *               - file
 *     responses:
 *       201:
 *         description: Audio file uploaded successfully
 *       400:
 *         description: Invalid file or missing required fields
 */
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const userId = resolveCreatedBy(req);
    const classId = (req.body as any).class_id ? Number((req.body as any).class_id) : undefined;
    const dayOfWeek = (req.body as any).day_of_week || undefined;
    const shouldDenoise = (req.body as any).should_denoise === 'true' || (req.body as any).should_denoise === true;

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isText = TEXT_TYPES.includes(req.file.mimetype) || fileExt === '.txt';
    const isVideo = VIDEO_TYPES.includes(req.file.mimetype);
    let audioPath = req.file.path;

    const fileSizeKB = Math.round(req.file.size / 1024);
    const fileType = isText ? 'text' : isVideo ? 'video' : 'audio';

    if (!isText && isVideo) {
      console.log(`[Upload] Video detected (${req.file.mimetype}), converting to audio...`);
      audioPath = await convertVideoToAudio(req.file.path);
      console.log(`[Upload] Audio extracted: ${audioPath}`);
    }

    // Create relative path for storage
    const relativePath = path.relative(process.cwd(), req.file.path);

    // Decode filename from latin1 to utf-8 for proper Arabic support
    const decodedFilename = decodeFilename(req.file.originalname);

    const soundFile = await createSoundFile({
      filename: decodedFilename,
      filepath: relativePath,
      createdBy: userId,
      note: (req.body as any).note || null,
      classId,
      dayOfWeek,
      userId: req.user?.id,
    });

    // Log: file received and record created
    await logUpload(soundFile.file_id, 'upload_received', 'info',
      `File received: "${decodedFilename}" (${fileSizeKB} KB, ${fileType})`,
      { filename: decodedFilename, size_kb: fileSizeKB, mimetype: req.file.mimetype, file_type: fileType, class_id: classId ?? null, uploader: userId }
    );

    if (isVideo) {
      await logUpload(soundFile.file_id, 'video_conversion_completed', 'success',
        `Video converted to audio successfully`,
        { original: req.file.originalname, audio_path: path.basename(audioPath) }
      );
    }

    await logUpload(soundFile.file_id, 'sound_file_created', 'success',
      `Sound file record created in database (file_id=${soundFile.file_id})`,
      { file_id: soundFile.file_id, filepath: relativePath }
    );

    if (isText) {
      // For text files, read content directly and save to fragments table
      updateProgress(soundFile.file_id, { status: 'saving', message: 'جاري حفظ النص...', percent: 50 });
      const textContent = fs.readFileSync(req.file.path, 'utf-8');
      const { saveFragment } = await import('../services/speechService.js');
      await saveFragment(soundFile.file_id, textContent, 'ar', null, 0, 0, 1);
      updateProgress(soundFile.file_id, { status: 'completed', message: 'تم الانتهاء بنجاح!', percent: 100 });
      console.log(`[Upload] Text file saved to fragments table for file ${soundFile.file_id}`);

      await logUpload(soundFile.file_id, 'pipeline_completed', 'success',
        `Text file content saved to fragments`,
        { chars: textContent.length }
      );

      res.status(201).json({
        success: true,
        message: 'تم تحميل الملف النصي وحفظ المحتوى بنجاح',
        data: soundFile,
      });
    } else {
      // Initialize progress for audio pipeline
      updateProgress(soundFile.file_id, { status: 'uploading', message: 'تم التحميل. جاري بدء المعالجة...', percent: 5 });

      await logUpload(soundFile.file_id, 'pipeline_started', 'info',
        `Audio transcription pipeline started in background`,
        { should_denoise: shouldDenoise, class_id: classId ?? null, day_of_week: dayOfWeek ?? null }
      );

      // Transcribe audio in background
      transcribeAndSave(soundFile.file_id, audioPath, classId, dayOfWeek, shouldDenoise)
        .then((speeches) => {
          console.log(`[Upload] ✅ Transcription completed for file ${soundFile.file_id}: ${speeches.length} segment(s)`);
        })
        .catch((err) => {
          console.error(`[Upload] ❌ Transcription failed for file ${soundFile.file_id}:`, err);
          console.error(`[Upload] Error stack:`, err.stack);
          updateProgress(soundFile.file_id, {
            status: 'failed',
            message: `❌ فشلت المعالجة: ${err.message}`,
            percent: 0,
            error: err.message
          });
          logUpload(soundFile.file_id, 'pipeline_failed', 'error',
            `Pipeline failed: ${err.message}`,
            { error: err.message }
          );
        });

      res.status(201).json({
        success: true,
        message: classId && dayOfWeek
          ? `Audio uploaded. Splitting into segments by time slots and transcribing in background.`
          : 'Audio file uploaded successfully. Transcription is processing in background.',
        data: soundFile,
      });
    }
  } catch (error) {
    // Delete file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload file',
    });
  }
});

/**
 * GET /api/sound-files/fragments/failed
 * Get all fragments with transcription_status = 'failed' (retry_count >= 3)
 */
router.get('/fragments/failed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await getMany(
      `SELECT f.fragment_id, f.file_id, f.fragment_order,
              f.duration, f.transcription_status, f.retry_count, f.last_error,
              sf.filename
       FROM fragments f
       LEFT JOIN sound_files sf ON sf.file_id = f.file_id
       WHERE f.transcription_status = 'failed'
       ORDER BY f.file_id ASC, f.fragment_order ASC`,
      []
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[SoundFiles] Error fetching failed fragments:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch failed fragments',
    });
  }
});

/**
 * POST /api/sound-files/fragments/:fragmentId/retry-manual
 * Manually retry transcription for a single failed fragment
 */
router.post('/fragments/:fragmentId/retry-manual', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fragmentId = parseInt(req.params.fragmentId as string);
    if (isNaN(fragmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid fragment ID' });
    }

    const fragment = await getOne(
      'SELECT * FROM fragments WHERE fragment_id = $1',
      [fragmentId]
    );
    if (!fragment) {
      return res.status(404).json({ success: false, message: 'Fragment not found' });
    }

    const soundFile = await getOne(
      'SELECT * FROM sound_files WHERE file_id = $1',
      [fragment.file_id]
    );
    if (!soundFile || !fs.existsSync(soundFile.filepath)) {
      return res.status(404).json({ success: false, message: 'Audio file not found on disk' });
    }

    const startSec = Number(fragment.start_time ?? 0);
    let endSec = Number(fragment.end_time ?? startSec);
    if (endSec <= startSec) {
      const dur = Number(fragment.duration ?? 0);
      endSec = startSec + (dur > 0 ? dur : 0);
    }
    const effectiveDuration = Math.max(0, endSec - startSec);

    if (effectiveDuration <= 0) {
      return res.status(400).json({ success: false, message: 'Fragment has zero duration' });
    }

    // Extract the segment using ffmpeg
    const ext = path.extname(soundFile.filepath) || '.mp3';
    const tempDir = path.join(path.dirname(soundFile.filepath), 'temp_retry');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const segmentFile = path.join(tempDir, `retry_${fragmentId}${ext}`);

    // Use ffmpeg to extract segment
    const { execSync } = await import('child_process');
    execSync(
      `ffmpeg -y -ss ${startSec} -t ${effectiveDuration} -i "${soundFile.filepath}" -acodec copy "${segmentFile}"`,
      { stdio: 'pipe' }
    );

    if (!fs.existsSync(segmentFile)) {
      return res.status(500).json({ success: false, message: 'Failed to extract audio segment' });
    }

    try {
      const result = await transcribeAudio(segmentFile, fragment.file_id);

      await update(
        'fragments',
        {
          transcript: result.text,
          language: result.language,
          transcription_status: 'completed',
          last_error: null,
          updated_at: new Date(),
        },
        'fragment_id = $1',
        [fragmentId]
      );

      // Update the lecture transcript in background
      setImmediate(async () => {
        try {
          const lecture = await getOne('SELECT lecture_id FROM lecture WHERE file_id = $1 LIMIT 1', [fragment.file_id]);
          if (lecture?.lecture_id) {
            const allFragments = await getMany(
              `SELECT transcript FROM fragments WHERE file_id = $1 ORDER BY COALESCE(fragment_order, 0) ASC`,
              [fragment.file_id]
            );
            const fullTranscript = allFragments.map((f: any) => f.transcript).filter(Boolean).join(' ');
            await executeQuery(
              'UPDATE lecture SET transcription = $1, updated_at = NOW() WHERE lecture_id = $2',
              [fullTranscript, lecture.lecture_id]
            );
          }
        } catch (err) {
          console.error(`[ManualRetry] Error updating lecture transcript:`, err);
        }
      });

      res.json({ success: true, message: 'Fragment retranscribed successfully', data: result });
    } finally {
      if (fs.existsSync(segmentFile)) fs.unlinkSync(segmentFile);
      try { fs.rmdirSync(tempDir); } catch { /* ignore */ }
    }
  } catch (error) {
    console.error('[SoundFiles] Manual retry error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Manual retry failed',
    });
  }
});

/**
 * SSE endpoint: stream real-time progress updates for a file's pipeline
 */
router.get('/:id/progress/stream', (req: Request, res: Response) => {
  const fileId = parseInt(req.params.id as string);
  if (isNaN(fileId)) {
    return res.status(400).json({ success: false, message: 'Invalid file ID' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  addSSEClient(fileId, res);
});

/**
 * Polling endpoint: get current progress snapshot for a file
 */
router.get('/:id/progress', (req: Request, res: Response) => {
  const fileId = parseInt(req.params.id as string);
  if (isNaN(fileId)) {
    return res.status(400).json({ success: false, message: 'Invalid file ID' });
  }

  const progress = getProgress(fileId);
  if (!progress) {
    return res.json({ success: true, data: null });
  }
  res.json({ success: true, data: progress });
});

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
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // super_admin sees all files, regular users see only their own
    const filter = req.user?.role === 'super_admin' ? undefined : req.user?.email;
    const userId = req.user?.role === 'super_admin' ? undefined : req.user?.id;
    const soundFiles = await getAllSoundFiles(filter, userId);
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
 * GET /api/sound-files/:id/evaluation/report
 * Get grouped evaluation report by domain
 * @swagger
 * /sound-files/{id}/evaluation/report:
 *   get:
 *     summary: Get evaluation report grouped by teaching domain
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluation report retrieved successfully
 */
router.get('/:id/evaluation/report', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
    }

    const soundFile = await getSoundFileById(fileId);
    if (!soundFile) {
      return res.status(404).json({
        success: false,
        message: 'Sound file not found',
      });
    }

    const report = await generateEvaluationReport(fileId);

    res.status(200).json({
      success: true,
      message: 'Evaluation report generated successfully',
      data: {
        file_id: fileId,
        filename: soundFile.filename,
        domains: report,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate evaluation report',
    });
  }
});

/**
 * GET /api/sound-files/:id/evaluation
 * Get evaluation results for a sound file
 * @swagger
 * /sound-files/{id}/evaluation:
 *   get:
 *     summary: Get evaluation results for a sound file
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluation results retrieved successfully
 */
router.get('/:id/evaluation', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
    }

    const soundFile = await getSoundFileById(fileId);
    if (!soundFile) {
      return res.status(404).json({
        success: false,
        message: 'Sound file not found',
      });
    }

    const evaluations = await getEvaluationResults(fileId);

    res.status(200).json({
      success: true,
      message: 'Evaluation results retrieved successfully',
      data: {
        file_id: fileId,
        filename: soundFile.filename,
        evaluations,
        summary: {
          total_kpis_evaluated: evaluations.length,
          evidence_found: evaluations.filter((e: any) => e.status !== 'Insufficient').length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evaluation results',
    });
  }
});

/**
 * GET /api/sound-files/:id/fragments
 * Get all fragments for a sound file
 */
router.get('/:id/fragments', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
    }

    const soundFile = await getSoundFileById(fileId);
    if (!soundFile) {
      return res.status(404).json({
        success: false,
        message: 'Sound file not found',
      });
    }

    const fragments = await getMany(`
      SELECT * FROM fragments
      WHERE file_id = $1
      ORDER BY fragment_order ASC
    `, [fileId]);

    res.status(200).json({
      success: true,
      message: 'Fragments retrieved successfully',
      data: {
        file_id: fileId,
        filename: soundFile.filename,
        total_fragments: fragments.length,
        fragments: fragments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve fragments',
    });
  }
});

/**
 * GET /api/sound-files/:id/lectures
 * Get all lecture/speech records for a sound file
 */
router.get('/:id/lectures', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
    }

    const soundFile = await getSoundFileById(fileId);
    if (!soundFile) {
      return res.status(404).json({
        success: false,
        message: 'Sound file not found',
      });
    }

    const lectures = await getSpeechByFileId(fileId);

    res.status(200).json({
      success: true,
      message: 'Lectures retrieved successfully',
      data: {
        file_id: fileId,
        filename: soundFile.filename,
        total_lectures: lectures.length,
        lectures: lectures,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve lectures',
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
router.get('/:id', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
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
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
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
router.put('/:id', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
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
router.delete('/:id', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
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
router.get('/creator/:createdBy', authenticate, async (req: AuthRequest, res: Response) => {
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

/**
 * POST /api/sound-files/:id/retranscribe
 * Re-transcribe a previously uploaded file (e.g., after a failed transcription)
 */
router.post('/:id/retranscribe', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);
    const soundFile = await getSoundFileById(fileId);
    if (!soundFile) {
      return res.status(404).json({ success: false, message: 'Sound file not found' });
    }

    // Delete any existing fragments and lectures for this file (clean slate)
    await executeQuery('DELETE FROM fragments WHERE file_id = $1', [fileId]);
    await executeQuery('DELETE FROM lecture WHERE file_id = $1', [fileId]);
    console.log(`[Retranscribe] Cleared existing fragments and lectures for file_id=${fileId}`);

    const classId = req.body.class_id ? Number(req.body.class_id) : (soundFile.class_id ? Number(soundFile.class_id) : undefined);
    const dayOfWeek = req.body.day_of_week || soundFile.day_of_week || undefined;

    // Resolve file path
    let audioPath = path.isAbsolute(soundFile.filepath)
      ? soundFile.filepath
      : path.join(process.cwd(), soundFile.filepath);

    // If video, convert to audio
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    if (videoExts.includes(path.extname(audioPath).toLowerCase())) {
      const mp3Path = audioPath.replace(path.extname(audioPath), '.mp3');
      if (fs.existsSync(mp3Path)) {
        audioPath = mp3Path;
      } else {
        audioPath = await convertVideoToAudio(audioPath);
      }
    }

    // Transcribe in background
    transcribeAndSave(fileId, audioPath, classId, dayOfWeek)
      .then((speeches) => console.log(`Re-transcription completed for file ${fileId}: ${speeches.length} segment(s)`))
      .catch((err) => console.error(`Re-transcription failed for file ${fileId}:`, err));

    res.status(200).json({
      success: true,
      message: 'Re-transcription started in background',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start re-transcription',
    });
  }
});

/**
 * POST /api/sound-files/:id/retranscribe-pending
 * Re-transcribe only [transcription_pending] fragments without touching successful ones
 */
router.post('/:id/retranscribe-pending', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);
    const soundFile = await getSoundFileById(fileId);
    if (!soundFile) {
      return res.status(404).json({ success: false, message: 'Sound file not found' });
    }

    let audioPath = path.isAbsolute(soundFile.filepath)
      ? soundFile.filepath
      : path.join(process.cwd(), soundFile.filepath);

    // If video, convert to audio
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    if (videoExts.includes(path.extname(audioPath).toLowerCase())) {
      const mp3Path = audioPath.replace(path.extname(audioPath), '.mp3');
      audioPath = fs.existsSync(mp3Path) ? mp3Path : await convertVideoToAudio(audioPath);
    }

    const shouldDenoise = req.body.denoise === true;

    // Run in background
    retranscribePendingFragments(fileId, audioPath, shouldDenoise)
      .then(({ retranscribed, failed }) =>
        console.log(`[RetranscribePending] Done for file_id=${fileId}: ${retranscribed} ok, ${failed} failed`)
      )
      .catch((err) => console.error(`[RetranscribePending] Error for file_id=${fileId}:`, err));

    res.status(200).json({
      success: true,
      message: 'Retranscription of pending fragments started in background',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start retranscription',
    });
  }
});

/**
 * POST /api/sound-files/test/evaluate
 * Test evaluation endpoint - evaluate any text directly
 */
router.post('/test/evaluate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { text, description } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for evaluation',
      });
    }

    const result = await testEvaluation(text, description);

    res.status(200).json({
      success: true,
      message: 'Test evaluation completed successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to perform test evaluation',
    });
  }
});

/**
 * GET /api/sound-files/evaluations/search
 * Get evaluations with filters and pagination
 */
router.get('/evaluations/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const domain = (req.query.domain as string) || '';
    const fileId = req.query.fileId ? parseInt(req.query.fileId as string) : undefined;
    const orderBy = (req.query.orderBy as 'date' | 'domain' | 'status') || 'date';
    const orderDirection = (req.query.orderDirection as 'ASC' | 'DESC') || 'DESC';

    const result = await getEvaluationsWithFilters({
      limit,
      offset,
      search,
      status,
      domain,
      fileId,
      orderBy,
      orderDirection,
    });

    res.status(200).json({
      success: true,
      message: 'Evaluations retrieved successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve evaluations',
    });
  }
});

/**
 * GET /api/sound-files/:id/evaluation/export
 * Export evaluation to JSON
 */
router.get('/:id/evaluation/export', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
    }

    const result = await exportEvaluationToJSON(fileId);

    // Return as downloadable JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="evaluation_${fileId}_${new Date().toISOString().slice(0, 10)}.json"`);
    res.status(200).send(JSON.stringify(result.data, null, 2));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export evaluation',
    });
  }
});

/**
 * GET /api/sound-files/:id/evaluation/report/comprehensive
 * Generate comprehensive evaluation report
 */
router.get('/:id/evaluation/report/comprehensive', authenticate, requireFileOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
    }

    const result = await generateComprehensiveReport(fileId);

    res.status(200).json({
      success: true,
      message: 'Comprehensive report generated successfully',
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate comprehensive report',
    });
  }
});

/**
 * GET /api/sound-files/upload-hours/stats
 * Get total upload hours (duration of sound files) for a date range
 */
router.get('/upload-hours/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate query parameters are required',
      });
    }

    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T00:00:00Z)',
      });
    }

    const ownerFilter = req.user?.role === 'super_admin' ? null : (req.user?.email || null);

    // Get total duration in seconds from fragments table, then convert to hours
    const result = await getOne(
      `SELECT COALESCE(SUM(CAST(duration AS DECIMAL)), 0) as total_seconds,
              COUNT(DISTINCT f.file_id) as file_count
       FROM fragments f
       INNER JOIN sound_files sf ON f.file_id = sf.file_id
       WHERE sf.created_at >= $1 AND sf.created_at < $2
         AND ($3::text IS NULL OR sf."createdBy" = $3)`,
      [start.toISOString(), end.toISOString(), ownerFilter]
    );

    const totalSeconds = parseFloat(result?.total_seconds || '0');
    const totalHours = totalSeconds / 3600; // Convert seconds to hours
    const fileCount = result?.file_count || 0;

    res.status(200).json({
      success: true,
      count: Math.round(totalHours),
      decimal_hours: parseFloat(totalHours.toFixed(2)),
      total_seconds: totalSeconds,
      file_count: fileCount,
      data: {
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        total_hours: Math.round(totalHours),
        decimal_hours: parseFloat(totalHours.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching upload hours stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upload hours statistics',
      error: error.message,
    });
  }
});

// ─── Upload Logs Endpoints ──────────────────────────────────────────────────

/**
 * GET /api/sound-files/upload-logs
 * Recent upload log entries across all files (default last 200).
 */
router.get('/upload-logs', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
    const logs = await getRecentLogs(limit);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/sound-files/upload-logs/summary
 * Per-file summary: total events, last event, error/warning counts.
 */
router.get('/upload-logs/summary', async (req: Request, res: Response) => {
  try {
    const summary = await getUploadSummary();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/sound-files/:fileId/upload-logs
 * All log entries for a specific file, ordered chronologically.
 */
router.get('/:fileId/upload-logs', async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    if (isNaN(fileId)) return res.status(400).json({ success: false, message: 'Invalid file ID' });
    const logs = await getLogsForFile(fileId);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/sound-files/:fileId/upload-logs
 * Clear all log entries for a specific file.
 */
router.delete('/:fileId/upload-logs', authenticate, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId as string);
    if (isNaN(fileId)) return res.status(400).json({ success: false, message: 'Invalid file ID' });
    const deleted = await clearLogsForFile(fileId);
    res.json({ success: true, message: `Deleted ${deleted} log entries`, deleted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
