/**
 * Speech Service
 * Handles speech-to-text transcription using OpenAI Whisper API
 * with audio splitting by class schedule time slots
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
// @ts-ignore
import ffprobeStatic from 'ffprobe-static';
import { insert, getOne, getMany, update, executeQuery } from '../helpers/database.js';
import { updateProgress } from './progressService.js';
import { evaluateSpeechAgainstKPIs } from './evaluationsService.js';
import { logUpload } from './uploadLogService.js';
import { sendUploadCompleteEmail } from './emailService.js';

// Set ffmpeg and ffprobe binary paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
ffmpeg.setFfprobePath(ffprobeStatic.path);

/* Lazy initialization of OpenAI client */
let openai: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

interface TimeSlot {
  time_slot_id: number;
  class_id: number;
  subject_id?: number | null;
  teacher_id?: number | null;
  day_of_week: string;
  slot_date: string | null;
  start_time: string;
  end_time: string;
}

/**
 * Get time slots for a class on a specific date (or day_of_week fallback), ordered by start_time
 */
export const getTimeSlots = async (classId: number, dayOfWeek: string, slotDate?: string): Promise<TimeSlot[]> => {
  // 1. Prefer exact date match
  if (slotDate) {
    const query = `
      SELECT time_slot_id, class_id, subject_id, teacher_id, day_of_week, slot_date::text,
             start_time::text, end_time::text
      FROM section_time_slots
      WHERE class_id = $1 AND slot_date = $2
      ORDER BY start_time ASC
    `;
    const rows = await getMany(query, [classId, slotDate]);
    if (rows.length > 0) return rows;
  }
  // 2. Fallback: match by day_of_week
  const query2 = `
    SELECT time_slot_id, class_id, subject_id, teacher_id, day_of_week, slot_date::text,
           start_time::text, end_time::text
    FROM section_time_slots
    WHERE class_id = $1 AND day_of_week = $2
    ORDER BY start_time ASC
  `;
  const rows2 = await getMany(query2, [classId, dayOfWeek]);
  if (rows2.length > 0) return rows2;

  // 3. Last fallback: any time slots for this class (regardless of day)
  console.log(`[Speech] No slots for day=${dayOfWeek}, trying any day for class=${classId}`);
  const query3 = `
    SELECT DISTINCT ON (start_time) time_slot_id, class_id, subject_id, teacher_id, day_of_week, slot_date::text,
           start_time::text, end_time::text
    FROM section_time_slots
    WHERE class_id = $1
    ORDER BY start_time ASC
  `;
  return await getMany(query3, [classId]);
};

/**
 * Convert HH:MM:SS or HH:MM time string to total seconds
 */
const timeToSeconds = (time: string): number => {
  // Accept values like HH:MM, HH:MM:SS, HH:MM:SS.sss or HH:MM:SS+TZ
  const normalized = String(time).trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?/);
  if (!match) return NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? '0');

  if (![hours, minutes, seconds].every(Number.isFinite)) return NaN;
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Convert a video file to audio (mp3) using ffmpeg
 * @param videoPath Path to the video file
 * @returns Path to the extracted audio file
 */
export const convertVideoToAudio = (videoPath: string): Promise<string> => {
  const ext = path.extname(videoPath);
  const audioPath = videoPath.replace(ext, '.mp3');
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(64)
      .audioChannels(1)
      .output(audioPath)
      .on('end', () => {
        console.log(`[FFmpeg] Video converted to audio: ${audioPath}`);
        resolve(audioPath);
      })
      .on('error', (err) => reject(err))
      .run();
  });
};

/**
 * Get audio file duration in seconds using ffprobe
 */
const getAudioDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
};

/**
 * Denoise and enhance audio using FFmpeg filters for better transcription accuracy.
 * Optimized for speed: very lightweight filter chain for fast processing.
 */
const denoiseAudio = (inputPath: string, fileId?: number): Promise<string> => {
  const ext = path.extname(inputPath);
  const denoisedPath = inputPath.replace(ext, `_denoised${ext}`);

  // Skip if already denoised
  if (inputPath.includes('_denoised')) return Promise.resolve(inputPath);

  console.log(`[FFmpeg] Denoising audio: ${path.basename(inputPath)}`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters([
        'highpass=f=100',  // Remove low rumble
        'lowpass=f=8000',  // Remove high noise
        // Removed: loudnorm (too slow), anlmdn (very slow)
      ])
      .audioCodec('libmp3lame')
      .audioBitrate(32)  // Lower bitrate = faster processing, good for transcription
      .audioChannels(1)
      .output(denoisedPath)
      .on('progress', (progress) => {
        if (fileId && progress.percent != null) {
          // Map denoising progress (0-100%) to overall progress (10-20%)
          const overallPercent = Math.round(10 + (progress.percent / 100) * 10);
          updateProgress(fileId, {
            status: 'denoising',
            message: `Denoising audio... ${Math.round(progress.percent)}%`,
            percent: Math.min(overallPercent, 20),
          });
        }
      })
      .on('end', () => {
        const sizeMB = (fs.statSync(denoisedPath).size / 1024 / 1024).toFixed(1);
        console.log(`[FFmpeg] Denoised: ${path.basename(denoisedPath)} (${sizeMB}MB)`);
        resolve(denoisedPath);
      })
      .on('error', (err) => {
        console.error(`[FFmpeg] Denoise failed, using original:`, err.message);
        // If denoise fails, fall back to original file
        if (fs.existsSync(denoisedPath)) fs.unlinkSync(denoisedPath);
        resolve(inputPath);
      })
      .run();
  });
};

/**
 * Split an audio file into a segment
 * @param inputPath Source audio file
 * @param outputPath Output segment file
 * @param startSec Start time in seconds
 * @param durationSec Duration in seconds
 */
const splitAudioSegment = (
  inputPath: string,
  outputPath: string,
  startSec: number,
  durationSec: number
): Promise<void> => {
  console.log(`[FFmpeg] splitAudioSegment START: input=${path.basename(inputPath)}, output=${path.basename(outputPath)}`);
  console.log(`[FFmpeg] splitAudioSegment PARAMS: start=${startSec}s, duration=${durationSec}s`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSec)
      .setDuration(durationSec)
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`[FFmpeg] FFmpeg command started: ${cmd}`);
      })
      .on('progress', (progress) => {
        console.log(`[FFmpeg] Progress: ${progress.percent}% | Time: ${progress.timemark}`);
      })
      .on('end', () => {
        console.log(`[FFmpeg] splitAudioSegment END: segment file should be at ${outputPath}`);
        if (fs.existsSync(outputPath)) {
          const size = fs.statSync(outputPath).size;
          console.log(`[FFmpeg] ✅ Segment file created: ${(size / 1024).toFixed(1)}KB`);
        } else {
          console.error(`[FFmpeg] ❌ WARNING: Segment file NOT found at ${outputPath}`);
        }
        resolve();
      })
      .on('error', (err) => {
        console.error(`[FFmpeg] ❌ splitAudioSegment ERROR:`, err.message);
        reject(err);
      })
      .run();
  });
};

const WHISPER_MAX_SIZE = 24 * 1024 * 1024; // 24 MB (Whisper limit is 25MB, leave margin)

/**
 * Compress audio file to fit within Whisper's 25MB limit
 */
const compressAudioIfNeeded = (filePath: string): Promise<string> => {
  const fileSize = fs.statSync(filePath).size;
  if (fileSize <= WHISPER_MAX_SIZE) return Promise.resolve(filePath);

  console.log(`[FFmpeg] File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB), compressing for Whisper...`);
  const ext = path.extname(filePath);
  const compressedPath = filePath.replace(ext, `_compressed${ext}`);
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .audioCodec('libmp3lame')
      .audioBitrate(48)
      .audioChannels(1)
      .output(compressedPath)
      .on('end', () => {
        console.log(`[FFmpeg] Compressed: ${(fs.statSync(compressedPath).size / 1024 / 1024).toFixed(1)}MB`);
        resolve(compressedPath);
      })
      .on('error', (err) => reject(err))
      .run();
  });
};

/**
 * Transcribe an audio file using OpenAI API with retry and model fallback
 */
export const transcribeAudio = async (filePath: string, fileId?: number, slotInfo?: { current: number; total: number }) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  console.log(`[Speech] Starting transcription for file: ${absolutePath}`);
  console.log(`[Speech] File exists: ${fs.existsSync(absolutePath)}`);

  // Compress if file exceeds Whisper limit
  const audioPath = await compressAudioIfNeeded(absolutePath);
  const needsCleanup = audioPath !== absolutePath;
  
  console.log(`[Speech] Using audio path: ${audioPath} (cleanup needed: ${needsCleanup})`);

  const models = ['gpt-4o-transcribe', 'whisper-1'];
  const MAX_RETRIES = 2;
  const slotLabel = slotInfo ? `الحصة ${slotInfo.current} من ${slotInfo.total}` : 'الملف';

  try {
    let attemptNum = 0;
    const totalAttempts = models.length * MAX_RETRIES;
    for (const model of models) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        attemptNum++;
        try {
          const startTime = Date.now();
          console.log(`[Speech] Transcribing with ${model} (attempt ${attempt}/${MAX_RETRIES}) - file: ${path.basename(audioPath)}`);

          if (fileId) {
            updateProgress(fileId, {
              message: `Transcribing ${slotLabel}... (attempt ${attemptNum}/${totalAttempts})`,
            });
          }

          const file = fs.createReadStream(audioPath);

          // gpt-4o-transcribe only supports 'json' or 'text'; whisper-1 supports 'verbose_json'
          const isGpt4o = model.startsWith('gpt-4o');
          const transcription = await getOpenAIClient().audio.transcriptions.create({
            file,
            model,
            response_format: isGpt4o ? 'json' : 'verbose_json',
          });

          const duration = Date.now() - startTime;
          console.log(`[Speech] ✅ Transcription succeeded with ${model} (${duration}ms)`);
          console.log(`[Speech] Transcript length: ${transcription.text.length} chars`);
          
          // gpt-4o returns only text in json mode; whisper-1 verbose_json includes language & duration
          const detectedLang = (transcription as any).language || null;
          const segments = (transcription as any).segments || null;
          console.log(`[Speech] Detected language: ${detectedLang}, segments: ${segments ? segments.length : 0}`);
          return {
            text: transcription.text,
            language: detectedLang || 'auto',
            duration: (transcription as any).duration || null,
            segments: segments,
          };
        } catch (err: any) {
          const isTimeout = err.code === 'ETIMEDOUT' || err.message?.includes('timeout') || err.message?.includes('ENOTFOUND');
          const isRateLimit = err.status === 429 || err.code === 'rate_limit_exceeded';
          const isConnectionError = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('Connection error');

          console.error(`[Speech] ❌ ${model} attempt ${attempt} failed:`);
          console.error(`[Speech] Error status: ${err.status}`);
          console.error(`[Speech] Error message: ${err.message}`);
          console.error(`[Speech] Error code: ${err.code}`);
          console.error(`[Speech] Error type: ${isRateLimit ? 'RATE_LIMIT' : isTimeout ? 'TIMEOUT' : isConnectionError ? 'CONNECTION' : 'OTHER'}`);

          if (attempt < MAX_RETRIES) {
            // Exponential backoff: rate limit (30s) > timeout/connection (5s) > other (1s)
            let delay = 1000; // default: 1 second
            if (isRateLimit) {
              delay = 30000; // 30 seconds for rate limits
            } else if (isTimeout || isConnectionError) {
              delay = 5000; // 5 seconds for timeouts/connection errors
            }

            const updateInterval = 250;
            const steps = Math.ceil(delay / updateInterval);

            if (fileId) {
              updateProgress(fileId, {
                message: `فشلت المحاولة ${attemptNum}. إعادة المحاولة خلال ${(delay / 1000).toFixed(1)}s...`,
              });
            }

            // Update progress every interval to show countdown
            for (let i = 0; i < steps; i++) {
              await new Promise(r => setTimeout(r, updateInterval));
              if (fileId) {
                const remaining = Math.max(0, (delay - (i + 1) * updateInterval) / 1000);
                if (remaining > 0) {
                  updateProgress(fileId, {
                    message: `إعادة المحاولة خلال ${remaining.toFixed(1)}s...`,
                  });
                }
              }
            }
          }
        }
      }
      console.log(`[Speech] All attempts with ${model} failed, trying next model...`);
    }
    throw new Error('All transcription models and retries exhausted');
  } finally {
    // Clean up compressed file
    if (needsCleanup && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log(`[Speech] Cleaned up compressed audio file`);
    }
  }
};

/**
 * Save transcription to lecture table
 */
/**
 * Save fragment (audio segment excerpt with transcription)
 */
export const saveFragment = async (
  fileId: number,
  transcript: string,
  language: string,
  duration: number | null,
  startTime: number = 0,
  endTime: number = 0,
  slotOrder: number = 0,
  fragmentPath: string | null = null,
  lectureIdOverride: number | null = null
) => {
  try {
    console.log(`[Fragment] Saving fragment: file_id=${fileId}, start=${startTime}s, end=${endTime}s, order=${slotOrder}, transcript_len=${transcript.length}`);

    const resolvedDuration =
      duration != null && Number.isFinite(Number(duration))
        ? Number(duration)
        : Math.max(0, Number(endTime) - Number(startTime));

    // lecture_order: each 2700s (45 min) = one lecture period, capped at 7
    // [0–2700] → 1, (2700–5400] → 2, (5400–8100] → 3, … up to 7
    const lectureOrder = Math.min(7, Math.max(1, Math.floor((Number(startTime) || 0) / 2700) + 1));

    let lectureId: number | null = lectureIdOverride;
    if (lectureId == null) {
      try {
        const lec = await getOne(
          'SELECT lecture_id FROM lecture WHERE file_id = $1 ORDER BY lecture_id DESC LIMIT 1',
          [fileId]
        );
        if (lec?.lecture_id != null) {
          lectureId = Number(lec.lecture_id);
        }
      } catch {
        /* optional link to lecture row */
      }
    }

    // Explicit INSERT so canonical columns (fragment_order) are always set.
    // Generic insert() + JS object key ordering caused some deployments to leave them NULL.
    const ins = await executeQuery(
      `
      INSERT INTO fragments (
        file_id,
        lecture_id,
        transcript,
        language,
        duration,
        start_time,
        end_time,
        fragment_order,
        lecture_order,
        fragment_path,
        last_transcription_attempt_at,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13
      )
      RETURNING *
      `,
      [
        fileId,
        lectureId,
        transcript,
        language,
        resolvedDuration,
        startTime,
        endTime,
        slotOrder,
        lectureOrder,
        fragmentPath,
        new Date(),
        new Date(),
        new Date(),
      ]
    );

    const result = ins.rows[0];

    // Belt-and-suspenders: ensure fragment_order and lecture_order are always set
    const fid = result.fragment_id ?? result.id;
    if (fid != null) {
      await executeQuery(
        `
        UPDATE fragments SET
          fragment_order = $2,
          lecture_order  = $3,
          updated_at = NOW()
        WHERE fragment_id = $1
        `,
        [fid, slotOrder, lectureOrder]
      );
    }

    console.log(
      `[Fragment] ✅ Fragment saved successfully: fragment_id=${fid}, file_id=${result.file_id}`
    );
    
    // NOTE: Evaluation is intentionally NOT triggered here.
    // It runs once per lecture at the end of the full pipeline (in transcribeAndSave)
    // after all fragments are saved and the lecture transcript is fully assembled.

    return result;
  } catch (err) {
    console.error(`[Fragment] ❌ Failed to save fragment:`, err);
    throw err;
  }
};

export const saveSpeech = async (
  fileId: number,
  transcript: string,
  language: string,
  duration: number | null,
  timeSlotId: number | null = null,
  slotOrder: number = 0
) => {
  try {
    console.log(`[Speech] Saving lecture record: file_id=${fileId}, time_slot_id=${timeSlotId}, transcript_len=${transcript.length}`);

    const result = await insert('lecture', {
      file_id: fileId,
      transcript,
      language,
      duration,
      time_slot_id: timeSlotId,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    console.log(`[Speech] ✅ Lecture saved successfully: id=${result.id}, file_id=${result.file_id}`);
    
    // NOTE: Evaluation is intentionally NOT triggered here.
    // It runs once per lecture at the end of the full pipeline.

    return result;
  } catch (err) {
    console.error(`[Speech] ❌ Failed to save speech:`, err);
    throw err;
  }
};

/**
 * Get lecture records by file_id
 */
export const getSpeechByFileId = async (fileId: number) => {
  const query = `
    SELECT s.*, ts.start_time, ts.end_time, ts.day_of_week
    FROM lecture s
    LEFT JOIN section_time_slots ts ON s.time_slot_id = ts.time_slot_id
    WHERE s.file_id = $1
    ORDER BY s.lecture_id ASC
  `;
  return await getMany(query, [fileId]);
};

/**
 * Get all lecture records
 */
export const getAllSpeech = async () => {
  const query = `
    SELECT s.*, sf.filename, ts.start_time, ts.end_time, ts.day_of_week
    FROM lecture s
    JOIN sound_files sf ON s.file_id = sf.file_id
    LEFT JOIN section_time_slots ts ON s.time_slot_id = ts.time_slot_id
    ORDER BY s.file_id DESC, s.lecture_id ASC
  `;
  return await getMany(query);
};

/**
 * Split audio into fixed 15-minute fragments, transcribe each, and save to DB.
 *
 * @param fileId     Sound file ID in sound_files table
 * @param filePath   Path to the uploaded audio file
 * @param classId    Class ID (unused now, kept for API compat)
 * @param dayOfWeek  Day of week (unused now, kept for API compat)
 * @param shouldDenoise Whether to apply audio denoising (default: true)
 * @returns Array of created fragment records
 */
const FRAGMENT_DURATION_SEC = 15 * 60; // 15 minutes in seconds

export const transcribeAndSave = async (
  fileId: number,
  filePath: string,
  classId?: number,
  dayOfWeek?: string,
  shouldDenoise: boolean = true,
  userEmail?: string
) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  // Step 1: Denoise the audio (if user chose to)
  let denoisedPath = absolutePath;
  let denoisedCleanup = false;

  const pipelineStart = Date.now();

  if (shouldDenoise) {
    console.log(`[Speech] Denoising audio before transcription (file_id=${fileId})...`);
    updateProgress(fileId, { status: 'denoising', message: 'Denoising audio...', percent: 10 });
    const denoiseStart = Date.now();
    await logUpload(fileId, 'denoising_started', 'info', 'Audio denoising started', undefined, { stageName: 'denoising' });
    denoisedPath = await denoiseAudio(absolutePath, fileId);
    denoisedCleanup = denoisedPath !== absolutePath;
    await logUpload(fileId, 'denoising_completed', 'success', 'Audio denoising completed',
      { denoised: denoisedCleanup }, { stageName: 'denoising', durationMs: Date.now() - denoiseStart });
  } else {
    console.log(`[Speech] Skipping denoise - user chose to process as-is (file_id=${fileId})...`);
    updateProgress(fileId, { status: 'analyzing', message: 'Analyzing file...', percent: 15 });
    await logUpload(fileId, 'denoising_skipped', 'info', 'Denoising skipped by user choice', undefined, { stageName: 'denoising' });
  }

  try {
  // Get total audio duration
  const totalDuration = await getAudioDuration(denoisedPath);
  console.log(`[Speech] Total audio duration: ${totalDuration}s`);
  await logUpload(fileId, 'duration_analyzed', 'info',
    `Audio duration: ${totalDuration.toFixed(1)}s`,
    { duration_seconds: totalDuration },
    { stageName: 'duration_analysis' }
  );

  // Create lecture rows upfront — one per 45-min (2700s) period, up to 7
  const totalLectures = Math.min(7, Math.max(1, Math.ceil(totalDuration / 2700)));
  const lectureMap = new Map<number, number>(); // lectureOrder → lecture_id

  // Build a map: slot_order → time_slot_id for this class + day
  const slotMap = new Map<number, number>(); // slot_order → time_slot_id
  let resolvedClassId: number | null = classId ?? null;
  try {
    if (!resolvedClassId) {
      const sfRow = await getOne('SELECT class_id FROM sound_files WHERE file_id = $1', [fileId]);
      resolvedClassId = sfRow?.class_id ? Number(sfRow.class_id) : null;
    }
    if (resolvedClassId && dayOfWeek) {
      const slots = await getMany(
        'SELECT time_slot_id, slot_order FROM section_time_slots WHERE class_id = $1 AND day_of_week = $2 ORDER BY slot_order ASC',
        [resolvedClassId, dayOfWeek]
      );
      for (const s of slots) {
        slotMap.set(Number(s.slot_order), Number(s.time_slot_id));
      }
      console.log(`[Speech] Found ${slotMap.size} time slot(s) for class_id=${resolvedClassId}, day=${dayOfWeek}`);
    }
  } catch { /* non-blocking */ }

  for (let lo = 1; lo <= totalLectures; lo++) {
    try {
      const lectureDuration = lo < totalLectures
        ? 2700
        : Math.max(0, totalDuration - (lo - 1) * 2700);

      // Match lecture_order to slot_order → get the correct time_slot_id
      const timeSlotId = slotMap.get(lo) ?? null;

      const lectureRow = await insert('lecture', {
        file_id: fileId,
        transcript: '',
        language: 'ar',
        duration: lectureDuration,
        time_slot_id: timeSlotId,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const lid = lectureRow.lecture_id ?? lectureRow.id ?? null;
      if (lid != null) {
        lectureMap.set(lo, Number(lid));
      }
      console.log(`[Speech] ✅ Lecture ${lo}/${totalLectures} created: lecture_id=${lid}, time_slot_id=${timeSlotId}`);
    } catch (lecErr) {
      console.warn(`[Speech] ⚠️ Could not create lecture row ${lo}:`, lecErr);
    }
  }

  await logUpload(fileId, 'lectures_created', 'success',
    `Created ${lectureMap.size} lecture record(s) for ${totalLectures} period(s)`,
    { total_lectures: totalLectures, lecture_ids: Array.from(lectureMap.values()), slot_map: Object.fromEntries(slotMap) },
    { stageName: 'lecture_creation' }
  );

  // Calculate 15-minute fragments
  const totalFragments = Math.ceil(totalDuration / FRAGMENT_DURATION_SEC);
  console.log(`[Speech] Splitting into ${totalFragments} fragment(s) of ${FRAGMENT_DURATION_SEC / 60} minutes each`);
  updateProgress(fileId, { status: 'analyzing', message: `Splitting file into ${totalFragments} fragments...`, percent: 20, totalSlots: totalFragments });
  await logUpload(fileId, 'fragment_splitting_started', 'info',
    `Splitting into ${totalFragments} fragment(s) of 15 min each`,
    { total_fragments: totalFragments, duration_seconds: totalDuration },
    { stageName: 'fragment_splitting', totalFragments }
  );

  // If file is shorter than 15 min, transcribe as single fragment
  if (totalDuration <= FRAGMENT_DURATION_SEC) {
    console.log(`[Speech] File is short (${totalDuration}s) — transcribing as single fragment`);
    updateProgress(fileId, { status: 'transcribing', message: 'Transcribing audio...', percent: 30 });
    await logUpload(fileId, 'fragment_transcribing', 'info', 'Transcribing single fragment (file < 15 min)', undefined,
      { stageName: 'transcription', fragmentIndex: 1, totalFragments: 1 });
    const singleTransStart = Date.now();
    const result = await transcribeAudio(denoisedPath, fileId);
    await logUpload(fileId, 'fragment_transcribed', 'success',
      `Fragment transcribed: ${result.text.length} chars, language=${result.language}`,
      { chars: result.text.length, language: result.language, fragment: 1, total: 1 },
      { stageName: 'transcription', durationMs: Date.now() - singleTransStart, fragmentIndex: 1, totalFragments: 1 }
    );
    updateProgress(fileId, { status: 'saving', message: 'Saving transcript...', percent: 90 });
    const singleLectureId = lectureMap.get(1) ?? null;
    const fragment = await saveFragment(fileId, result.text, result.language, totalDuration, 0, totalDuration, 1, denoisedPath, singleLectureId);
    await logUpload(fileId, 'fragment_saved', 'success',
      `Fragment saved to database (fragment_id=${fragment.fragment_id ?? fragment.id})`,
      { fragment_id: fragment.fragment_id ?? fragment.id, order: 1 },
      { stageName: 'fragment_saving', fragmentIndex: 1, totalFragments: 1 }
    );

    // Update lecture with transcript
    if (singleLectureId) {
      await executeQuery('UPDATE lecture SET transcript = $1, language = $2, updated_at = NOW() WHERE lecture_id = $3', [result.text, result.language, singleLectureId]);
      await logUpload(fileId, 'lecture_updated', 'success',
        `Lecture transcript updated (lecture_id=${singleLectureId})`,
        { lecture_id: singleLectureId, transcript_length: result.text.length },
        { stageName: 'lecture_update' }
      );

      // Run KPI evaluation SYNCHRONOUSLY with retry — same Option B pattern as multi-fragment path.
      // The short-file path previously never called evaluation at all, so every file < 15 min
      // landed with zero lecture_kpi / evidence rows. This block guarantees the evaluation
      // finishes (or logs a clear failure) BEFORE pipeline_completed is emitted.
      if (result.text?.trim()) {
        const evalStart = Date.now();
        await logUpload(fileId, 'evaluation_started', 'info',
          `KPI evaluation started for lecture_id=${singleLectureId}`,
          { lecture_id: singleLectureId },
          { stageName: 'evaluation' }
        );
        let evalTotal = 0;
        let evalFragments = 0;
        let evalFailures = 0;
        try {
          evalFragments = 1;
          const MAX_ATTEMPTS = 3;
          let lastErr: any = null;
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
              console.log(`[Evaluation] 🔄 lecture_id=${singleLectureId} single-fragment 0s-${totalDuration}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
              const evals = await evaluateSpeechAgainstKPIs(
                result.text, singleLectureId, undefined, undefined, 0, totalDuration
              );
              evalTotal = evals.length;
              console.log(`[Evaluation] ✅ lecture_id=${singleLectureId} [0s-${totalDuration}s]: ${evals.length} evaluation(s)`);
              lastErr = null;
              break;
            } catch (err: any) {
              lastErr = err;
              const status = err?.status || err?.response?.status;
              const retriable = !status || status === 429 || (status >= 500 && status < 600)
                || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';
              if (attempt < MAX_ATTEMPTS && retriable) {
                const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
                console.warn(`[Evaluation] ⏳ attempt ${attempt} failed (${err?.message || err}); retrying in ${delayMs}ms`);
                await new Promise(r => setTimeout(r, delayMs));
                continue;
              }
              break;
            }
          }
          if (lastErr) {
            evalFailures = 1;
            console.error(`[Evaluation] ❌ lecture_id=${singleLectureId} failed after retries:`, lastErr);
            await logUpload(fileId, 'evaluation_fragment_failed', 'error',
              `Evaluation failed for lecture_id=${singleLectureId}: ${lastErr?.message || lastErr}`,
              { lecture_id: singleLectureId, attempts: MAX_ATTEMPTS },
              { stageName: 'evaluation', errorDetails: String(lastErr?.stack || lastErr?.message || lastErr) }
            );
          }
          const level = evalFailures === 0 ? 'success' : (evalTotal > 0 ? 'warning' : 'error');
          await logUpload(fileId, 'evaluation_completed', level,
            `KPI evaluation for lecture_id=${singleLectureId}: ${evalFragments} fragment(s), ${evalTotal} evaluation(s), ${evalFailures} failure(s)`,
            { lecture_id: singleLectureId, fragments: evalFragments, evaluations: evalTotal, failures: evalFailures },
            { stageName: 'evaluation', durationMs: Date.now() - evalStart }
          );
        } catch (evalErr: any) {
          console.error(`[Evaluation] ⚠️ lecture_id=${singleLectureId} pipeline error:`, evalErr);
          await logUpload(fileId, 'evaluation_failed', 'error',
            `KPI evaluation pipeline failed for lecture_id=${singleLectureId}: ${evalErr?.message || evalErr}`,
            { lecture_id: singleLectureId, fragments: evalFragments, evaluations: evalTotal, failures: evalFailures },
            { stageName: 'evaluation', durationMs: Date.now() - evalStart, errorDetails: String(evalErr?.stack || evalErr?.message || evalErr) }
          );
        }
      } else {
        console.log(`[Evaluation] ⚠️ lecture_id=${singleLectureId} has empty transcript — skipping evaluation`);
        await logUpload(fileId, 'evaluation_skipped', 'warning',
          `Skipped KPI evaluation for lecture_id=${singleLectureId}: empty transcript`,
          { lecture_id: singleLectureId },
          { stageName: 'evaluation' }
        );
      }
    }

    updateProgress(fileId, { status: 'completed', message: 'Completed successfully!', percent: 100 });
    await logUpload(fileId, 'pipeline_completed', 'success',
      `Pipeline completed: 1/1 fragment processed`,
      { fragments_ok: 1, fragments_total: 1 },
      { stageName: 'pipeline', durationMs: Date.now() - pipelineStart, totalFragments: 1 }
    );

    // Send email notification
    if (userEmail) {
      const sf = await getOne('SELECT filename FROM sound_files WHERE file_id = $1', [fileId]);
      sendUploadCompleteEmail(userEmail, sf?.filename || 'ملف صوتي', 1);
    }

    return [fragment];
  }

  // Create temp directory for segments
  const tempDir = path.join(path.dirname(denoisedPath), 'temp_segments');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const results: any[] = [];
  const ext = path.extname(absolutePath);

  for (let i = 0; i < totalFragments; i++) {
    const slotOrder = i + 1;
    const startSec = i * FRAGMENT_DURATION_SEC;
    const remainingDuration = totalDuration - startSec;
    const effectiveDuration = Math.min(FRAGMENT_DURATION_SEC, remainingDuration);
    const endSec = startSec + effectiveDuration;

    if (effectiveDuration <= 0) break;

    const segmentFile = path.join(tempDir, `fragment_${slotOrder}${ext}`);
    console.log(`[Speech] 📌 Processing fragment ${slotOrder}/${totalFragments}: ${startSec}s → ${endSec}s (${effectiveDuration}s)`);

    // Calculate progress: fragments spread across 25%-95%
    const progressBase = 25;
    const progressRange = 70;
    const perFragRange = progressRange / totalFragments;
    const fragStart = progressBase + i * perFragRange;

    try {
      // Split audio segment
      updateProgress(fileId, {
        status: 'splitting',
        message: `Splitting fragment ${slotOrder} of ${totalFragments}...`,
        percent: Math.round(fragStart),
        currentSlot: slotOrder,
        totalSlots: totalFragments,
      });
      console.log(`[Speech] 🔀 Splitting fragment ${slotOrder}...`);

      await splitAudioSegment(denoisedPath, segmentFile, startSec, effectiveDuration);

      if (!fs.existsSync(segmentFile)) {
        throw new Error(`Fragment file not created: ${segmentFile}`);
      }

      const segmentSize = (fs.statSync(segmentFile).size / 1024).toFixed(1);
      console.log(`[Speech] ✂️ Fragment split: ${path.basename(segmentFile)} (size: ${segmentSize}KB)`);
      await logUpload(fileId, 'fragment_split', 'info',
        `Fragment ${slotOrder}/${totalFragments} split (${segmentSize} KB, ${startSec.toFixed(0)}s–${endSec.toFixed(0)}s)`,
        { fragment: slotOrder, total: totalFragments, size_kb: parseFloat(segmentSize), start_sec: startSec, end_sec: endSec },
        { stageName: 'fragment_splitting', fragmentIndex: slotOrder, totalFragments, fileSizeBytes: fs.statSync(segmentFile).size }
      );

      // Transcribe segment
      updateProgress(fileId, {
        status: 'transcribing',
        message: `Transcribing fragment ${slotOrder} of ${totalFragments}...`,
        percent: Math.round(fragStart + perFragRange * 0.3),
        currentSlot: slotOrder,
        totalSlots: totalFragments,
      });

      console.log(`[Speech] 🗣️ Transcribing fragment ${slotOrder}...`);
      const fragTransStart = Date.now();
      const result = await transcribeAudio(segmentFile, fileId, { current: slotOrder, total: totalFragments });
      console.log(`[Speech] ✅ Fragment ${slotOrder} transcribed: ${result.text.length} chars`);
      await logUpload(fileId, 'fragment_transcribed', 'success',
        `Fragment ${slotOrder}/${totalFragments} transcribed: ${result.text.length} chars`,
        { fragment: slotOrder, total: totalFragments, chars: result.text.length, language: result.language },
        { stageName: 'transcription', durationMs: Date.now() - fragTransStart, fragmentIndex: slotOrder, totalFragments }
      );

      // Save to DB
      updateProgress(fileId, {
        status: 'saving',
        message: `Saving fragment ${slotOrder} of ${totalFragments}...`,
        percent: Math.round(fragStart + perFragRange * 0.8),
        currentSlot: slotOrder,
        totalSlots: totalFragments,
      });

      // Determine which lecture this fragment belongs to
      const fragLectureOrder = Math.min(7, Math.max(1, Math.floor(startSec / 2700) + 1));
      const fragLectureId = lectureMap.get(fragLectureOrder) ?? null;

      const fragment = await saveFragment(
        fileId,
        result.text,
        result.language,
        effectiveDuration,
        startSec,
        endSec,
        slotOrder,
        segmentFile,
        fragLectureId
      );

      console.log(`[Speech] ✅ Fragment ${slotOrder} saved: id=${fragment.id}, lecture_order=${fragLectureOrder}, lecture_id=${fragLectureId}`);
      await logUpload(fileId, 'fragment_saved', 'success',
        `Fragment ${slotOrder}/${totalFragments} saved to database (lecture_order=${fragLectureOrder})`,
        { fragment: slotOrder, total: totalFragments, fragment_id: fragment.fragment_id ?? fragment.id, lecture_order: fragLectureOrder, lecture_id: fragLectureId },
        { stageName: 'fragment_saving', fragmentIndex: slotOrder, totalFragments }
      );
      results.push(fragment);
    } catch (err) {
      console.error(`[Speech] ❌ Error processing fragment ${slotOrder}:`, err);
      await logUpload(fileId, 'fragment_failed', 'error',
        `Fragment ${slotOrder}/${totalFragments} failed: ${(err as Error).message}`,
        { fragment: slotOrder, total: totalFragments, error: (err as Error).message },
        { stageName: 'transcription', fragmentIndex: slotOrder, totalFragments, errorDetails: (err as Error).stack || (err as Error).message }
      );
      // Save a placeholder
      try {
        const fragLectureOrder = Math.min(7, Math.max(1, Math.floor(startSec / 2700) + 1));
        const fragLectureId = lectureMap.get(fragLectureOrder) ?? null;
        const fragment = await saveFragment(
          fileId,
          '[transcription_pending]',
          'ar',
          effectiveDuration,
          startSec,
          endSec,
          slotOrder,
          segmentFile,
          fragLectureId
        );
        console.log(`[Speech] ⚠️ Fragment ${slotOrder} saved as pending: id=${fragment.id}`);
        await logUpload(fileId, 'fragment_saved_pending', 'warning',
          `Fragment ${slotOrder}/${totalFragments} saved as [transcription_pending]`,
          { fragment: slotOrder, fragment_id: fragment.fragment_id ?? fragment.id },
          { stageName: 'fragment_saving', fragmentIndex: slotOrder, totalFragments }
        );
        results.push(fragment);
      } catch (saveErr) {
        console.error(`[Speech] ❌ Failed to save placeholder for fragment ${slotOrder}:`, saveErr);
      }
    } finally {
      if (fs.existsSync(segmentFile)) {
        fs.unlinkSync(segmentFile);
      }
    }
  }

  // Clean up temp directory
  try {
    fs.rmdirSync(tempDir);
  } catch { /* ignore if not empty */ }

  // Update each lecture row with combined transcript from its own fragments
  for (const [lo, lid] of lectureMap.entries()) {
    try {
      const lectureFragments = await getMany(
        'SELECT transcript FROM fragments WHERE file_id = $1 AND lecture_order = $2 ORDER BY COALESCE(fragment_order, 0) ASC',
        [fileId, lo]
      );
      const fullTranscript = lectureFragments
        .map((f: any) => f.transcript)
        .filter((t: string) => t && t !== '[transcription_pending]')
        .join(' ');
      await executeQuery(
        'UPDATE lecture SET transcript = $1, updated_at = NOW() WHERE lecture_id = $2',
        [fullTranscript, lid]
      );
      console.log(`[Speech] ✅ Lecture ${lo} transcript updated: lecture_id=${lid}, length=${fullTranscript.length}, fragments=${lectureFragments.length}`);
      await logUpload(fileId, 'lecture_updated', 'success',
        `Lecture ${lo} transcript assembled from ${lectureFragments.length} fragment(s)`,
        { lecture_order: lo, lecture_id: lid, transcript_length: fullTranscript.length, fragments: lectureFragments.length },
        { stageName: 'lecture_update' }
      );

      // Run KPI evaluation per fragment — SYNCHRONOUS with retry so it's guaranteed to finish
      // (or log a clear failure) BEFORE pipeline_completed is emitted. Previously this used
      // setImmediate fire-and-forget, which meant evaluations were lost when the backend
      // restarted, and no row in upload_logs indicated whether evaluation ran at all.
      if (fullTranscript.trim()) {
        const evalStart = Date.now();
        await logUpload(fileId, 'evaluation_started', 'info',
          `KPI evaluation started for lecture_id=${lid}`,
          { lecture_order: lo, lecture_id: lid },
          { stageName: 'evaluation' }
        );
        let evalTotal = 0;
        let evalFragments = 0;
        let evalFailures = 0;
        try {
          const frags = await getMany(
            'SELECT transcript, start_time, end_time FROM fragments WHERE file_id = $1 AND lecture_order = $2 AND transcript != $3 ORDER BY fragment_order',
            [fileId, lo, '[transcription_pending]']
          );
          for (const frag of frags) {
            const fragStart = Number(frag.start_time ?? 0);
            const fragEnd = Number(frag.end_time ?? 0);
            if (!frag.transcript?.trim()) continue;
            evalFragments++;

            // Retry transient errors (OpenAI rate limit / 5xx / network) up to 3 attempts
            const MAX_ATTEMPTS = 3;
            let lastErr: any = null;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
              try {
                console.log(`[Evaluation] 🔄 lecture_id=${lid} frag ${fragStart}s-${fragEnd}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
                const evals = await evaluateSpeechAgainstKPIs(
                  frag.transcript, lid,
                  undefined, undefined,
                  fragStart, fragEnd
                );
                evalTotal += evals.length;
                console.log(`[Evaluation] ✅ lecture_id=${lid} [${fragStart}s-${fragEnd}s]: ${evals.length} evaluation(s)`);
                lastErr = null;
                break;
              } catch (err: any) {
                lastErr = err;
                const status = err?.status || err?.response?.status;
                const retriable = !status || status === 429 || (status >= 500 && status < 600) || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';
                if (attempt < MAX_ATTEMPTS && retriable) {
                  const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
                  console.warn(`[Evaluation] ⏳ attempt ${attempt} failed (${err?.message || err}); retrying in ${delayMs}ms`);
                  await new Promise(r => setTimeout(r, delayMs));
                  continue;
                }
                break; // non-retriable or out of attempts
              }
            }
            if (lastErr) {
              evalFailures++;
              console.error(`[Evaluation] ❌ lecture_id=${lid} frag ${fragStart}s-${fragEnd}s failed after retries:`, lastErr);
              await logUpload(fileId, 'evaluation_fragment_failed', 'error',
                `Evaluation failed for lecture_id=${lid} fragment ${fragStart}s-${fragEnd}s: ${lastErr?.message || lastErr}`,
                { lecture_id: lid, fragment_start: fragStart, fragment_end: fragEnd, attempts: MAX_ATTEMPTS },
                { stageName: 'evaluation', errorDetails: String(lastErr?.stack || lastErr?.message || lastErr) }
              );
            }
          }

          const level = evalFailures === 0 ? 'success' : (evalTotal > 0 ? 'warning' : 'error');
          await logUpload(fileId, 'evaluation_completed', level,
            `KPI evaluation for lecture_id=${lid}: ${evalFragments} fragment(s), ${evalTotal} evaluation(s), ${evalFailures} failure(s)`,
            { lecture_id: lid, fragments: evalFragments, evaluations: evalTotal, failures: evalFailures },
            { stageName: 'evaluation', durationMs: Date.now() - evalStart }
          );
        } catch (evalErr: any) {
          console.error(`[Evaluation] ⚠️ lecture_id=${lid} pipeline error:`, evalErr);
          await logUpload(fileId, 'evaluation_failed', 'error',
            `KPI evaluation pipeline failed for lecture_id=${lid}: ${evalErr?.message || evalErr}`,
            { lecture_id: lid, fragments: evalFragments, evaluations: evalTotal, failures: evalFailures },
            { stageName: 'evaluation', durationMs: Date.now() - evalStart, errorDetails: String(evalErr?.stack || evalErr?.message || evalErr) }
          );
        }
      } else {
        console.log(`[Evaluation] ⚠️ lecture_id=${lid} has empty transcript — skipping evaluation`);
        await logUpload(fileId, 'evaluation_skipped', 'warning',
          `Skipped KPI evaluation for lecture_id=${lid}: empty transcript`,
          { lecture_id: lid },
          { stageName: 'evaluation' }
        );
      }
    } catch (err) {
      console.error(`[Speech] ⚠️ Failed to update lecture ${lo} transcript:`, err);
    }
  }

  const failedCount = totalFragments - results.filter((r: any) => r.transcript !== '[transcription_pending]').length;
  console.log(`[Speech] ✅ Completed: ${results.length}/${totalFragments} fragments transcribed for file_id=${fileId}`);
  updateProgress(fileId, { status: 'completed', message: `Done! Processed ${results.length} of ${totalFragments} fragments.`, percent: 100 });
  await logUpload(fileId, 'pipeline_completed', failedCount > 0 ? 'warning' : 'success',
    `Pipeline completed: ${results.length - failedCount}/${totalFragments} fragments OK, ${failedCount} pending`,
    { fragments_ok: results.length - failedCount, fragments_pending: failedCount, fragments_total: totalFragments },
    { stageName: 'pipeline', durationMs: Date.now() - pipelineStart, totalFragments }
  );

  // Send email notification
  if (userEmail) {
    const sf = await getOne('SELECT filename FROM sound_files WHERE file_id = $1', [fileId]);
    sendUploadCompleteEmail(userEmail, sf?.filename || 'ملف صوتي', results.length);
  }

  return results;
  } finally {
    // Clean up denoised file
    if (denoisedCleanup && fs.existsSync(denoisedPath)) {
      fs.unlinkSync(denoisedPath);
      console.log(`[FFmpeg] Cleaned up denoised file`);
    }
  }
};

const PENDING_TRANSCRIPT = '[transcription_pending]';

/**
 * Re-transcribe fragments that were saved with [transcription_pending] (e.g. after API errors).
 */
export const retranscribePendingFragments = async (
  fileId: number,
  audioPath: string,
  shouldDenoise: boolean = true
): Promise<{ retranscribed: number; failed: number }> => {
  const absolutePath = path.isAbsolute(audioPath)
    ? audioPath
    : path.join(process.cwd(), audioPath);

  let denoisedPath = absolutePath;
  let denoisedCleanup = false;
  if (shouldDenoise) {
    denoisedPath = await denoiseAudio(absolutePath, fileId);
    denoisedCleanup = denoisedPath !== absolutePath;
  }

  let retranscribed = 0;
  let failed = 0;
  const tempDir = path.join(path.dirname(denoisedPath), 'temp_segments_retrans');
  const ext = path.extname(absolutePath) || '.mp3';

  try {
    const pending = await getMany(
      `SELECT * FROM fragments
       WHERE file_id = $1 AND transcript = $2
       ORDER BY COALESCE(fragment_order, 0) ASC`,
      [fileId, PENDING_TRANSCRIPT]
    );

    if (pending.length === 0) {
      return { retranscribed: 0, failed: 0 };
    }

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    for (const row of pending) {
      const pk = row.fragment_id ?? row.id;
      const startSec = Number(row.start_time ?? 0);
      let endSec = Number(row.end_time ?? startSec);
      if (!Number.isFinite(endSec) || endSec <= startSec) {
        const dur = Number(row.duration ?? 0);
        endSec = startSec + (Number.isFinite(dur) && dur > 0 ? dur : 0);
      }
      const effectiveDuration = Math.max(0, endSec - startSec);
      const segmentFile = path.join(tempDir, `retrans_${pk}${ext}`);

      if (effectiveDuration <= 0 || pk == null) {
        failed++;
        continue;
      }

      try {
        await splitAudioSegment(denoisedPath, segmentFile, startSec, effectiveDuration);
        if (!fs.existsSync(segmentFile)) {
          throw new Error(`Segment not created: ${segmentFile}`);
        }
        const result = await transcribeAudio(segmentFile, fileId);
        const whereCol = row.fragment_id != null ? 'fragment_id = $1' : 'id = $1';
        await update(
          'fragments',
          {
            transcript: result.text,
            language: result.language,
            updated_at: new Date(),
            fragment_order: row.fragment_order ?? 0,
          },
          whereCol,
          [pk]
        );
        retranscribed++;
      } catch (err) {
        console.error(`[RetranscribePending] Fragment pk=${pk}:`, err);
        failed++;
      } finally {
        if (fs.existsSync(segmentFile)) {
          fs.unlinkSync(segmentFile);
        }
      }
    }
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    } catch {
      /* ignore */
    }
    if (denoisedCleanup && fs.existsSync(denoisedPath)) {
      fs.unlinkSync(denoisedPath);
    }
  }

  return { retranscribed, failed };
};
