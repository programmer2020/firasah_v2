/**
 * Sound Files Routes
 * API endpoints for sound file management
 */

import { Router, Request, Response } from 'express';
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
import { transcribeAndSave, convertVideoToAudio, getSpeechByFileId } from '../services/speechService.js';
import { getProgress, addSSEClient, updateProgress } from '../services/progressService.js';

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
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const userId = (req as any).user?.userId || 'anonymous';
    const classId = (req.body as any).class_id ? Number((req.body as any).class_id) : undefined;
    const dayOfWeek = (req.body as any).day_of_week || undefined;
    const slotDate = (req.body as any).slot_date || undefined;
    const shouldDenoise = (req.body as any).should_denoise === 'true' || (req.body as any).should_denoise === true;

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isText = TEXT_TYPES.includes(req.file.mimetype) || fileExt === '.txt';
    const isVideo = VIDEO_TYPES.includes(req.file.mimetype);
    let audioPath = req.file.path;

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
    });

    if (isText) {
      // For text files, read content directly and save to speech table
      updateProgress(soundFile.file_id, { status: 'saving', message: 'جاري حفظ النص...', percent: 50 });
      const textContent = fs.readFileSync(req.file.path, 'utf-8');
      const { saveSpeech } = await import('../services/speechService.js');
      await saveSpeech(soundFile.file_id, textContent, 'ar', null);
      updateProgress(soundFile.file_id, { status: 'completed', message: 'تم الانتهاء بنجاح!', percent: 100 });
      console.log(`[Upload] Text file saved to speech table for file ${soundFile.file_id}`);

      res.status(201).json({
        success: true,
        message: 'تم تحميل الملف النصي وحفظ المحتوى بنجاح',
        data: soundFile,
      });
    } else {
      // Initialize progress for audio pipeline
      updateProgress(soundFile.file_id, { status: 'uploading', message: 'تم التحميل. جاري بدء المعالجة...', percent: 5 });

      // Transcribe audio in background (split by time slots if class_id & day provided)
      transcribeAndSave(soundFile.file_id, audioPath, classId, dayOfWeek, slotDate, shouldDenoise)
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

/**
 * POST /api/sound-files/:id/retranscribe
 * Re-transcribe a previously uploaded file (e.g., after a failed transcription)
 */
router.post('/:id/retranscribe', async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id as string);
    const soundFile = await getSoundFileById(fileId);
    if (!soundFile) {
      return res.status(404).json({ success: false, message: 'Sound file not found' });
    }

    // Check if speech records already exist
    const existing = await getSpeechByFileId(fileId);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Transcription already exists. Delete existing speech records first.' });
    }

    const classId = req.body.class_id ? Number(req.body.class_id) : undefined;
    const dayOfWeek = req.body.day_of_week || undefined;
    const slotDate = req.body.slot_date || undefined;

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
    transcribeAndSave(fileId, audioPath, classId, dayOfWeek, slotDate)
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

export default router;
