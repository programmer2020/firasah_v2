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
import { insert, getOne, getMany } from '../helpers/database.js';
import { updateProgress } from './progressService.js';
import { evaluateSpeechAgainstKPIs } from './evaluationsService.js';

// Set ffmpeg and ffprobe binary paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
ffmpeg.setFfprobePath(ffprobeStatic.path);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TimeSlot {
  time_slot_id: number;
  class_id: number;
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
      SELECT time_slot_id, class_id, day_of_week, slot_date::text,
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
    SELECT time_slot_id, class_id, day_of_week, slot_date::text,
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
    SELECT DISTINCT ON (start_time) time_slot_id, class_id, day_of_week, slot_date::text,
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
            message: `جاري تنقية الصوت... ${Math.round(progress.percent)}%`,
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
  const MAX_RETRIES = 1;
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
              message: `جاري تحويل ${slotLabel} إلى نص... (محاولة ${attemptNum}/${totalAttempts})`,
            });
          }

          const file = fs.createReadStream(audioPath);

          const isGpt4o = model === 'gpt-4o-transcribe';
          const transcription = await openai.audio.transcriptions.create({
            file,
            model,
            language: 'ar',
            response_format: isGpt4o ? 'json' : 'verbose_json',
          });

          const duration = Date.now() - startTime;
          console.log(`[Speech] ✅ Transcription succeeded with ${model} (${duration}ms)`);
          console.log(`[Speech] Transcript length: ${transcription.text.length} chars`);
          return {
            text: transcription.text,
            language: (transcription as any).language || 'ar',
            duration: (transcription as any).duration || null,
          };
        } catch (err: any) {
          console.error(`[Speech] ❌ ${model} attempt ${attempt} failed:`);
          console.error(`[Speech] Error status: ${err.status}`);
          console.error(`[Speech] Error message: ${err.message}`);
          console.error(`[Speech] Error code: ${err.code}`);
          
          if (attempt < MAX_RETRIES) {
            // Quick retry: 1 second, with progress updates every 250ms
            const delay = 1000;
            const updateInterval = 250;
            const steps = Math.ceil(delay / updateInterval);
            
            if (fileId) {
              updateProgress(fileId, {
                message: `فشلت المحاولة ${attemptNum}. إعادة المحاولة...`,
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
 * Save transcription to speech table
 */
export const saveSpeech = async (
  fileId: number,
  transcript: string,
  language: string,
  duration: number | null,
  timeSlotId: number | null = null,
  slotOrder: number = 0
) => {
  try {
    console.log(`[Speech] Saving speech record: file_id=${fileId}, time_slot_id=${timeSlotId}, slot_order=${slotOrder}, transcript_len=${transcript.length}`);
    
    const result = await insert('speech', {
      file_id: fileId,
      transcript,
      language,
      duration,
      time_slot_id: timeSlotId,
      slot_order: slotOrder,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    console.log(`[Speech] ✅ Speech saved successfully: id=${result.id}, file_id=${result.file_id}`);
    
    // Automatically evaluate speech against KPIs asynchronously
    // Do not await - let it process in background without delaying the response
    if (transcript && transcript.trim() && transcript !== '[transcription_pending]') {
      setImmediate(async () => {
        try {
          console.log(`[Evaluation] 🔄 Starting automatic KPI evaluation for file_id=${fileId}...`);
          const evaluations = await evaluateSpeechAgainstKPIs(
            transcript,
            fileId,
            undefined,
            undefined
          );
          console.log(`[Evaluation] ✅ Completed: Evaluated against all KPIs, found ${evaluations.length} evidence records`);
        } catch (evalErr) {
          console.error(`[Evaluation] ⚠️ Non-blocking evaluation error for file_id=${fileId}:`, evalErr);
          // Don't re-throw - this is background processing
        }
      });
    }
    
    return result;
  } catch (err) {
    console.error(`[Speech] ❌ Failed to save speech:`, err);
    throw err;
  }
};

/**
 * Get speech records by file_id
 */
export const getSpeechByFileId = async (fileId: number) => {
  const query = `
    SELECT s.*, ts.start_time, ts.end_time, ts.day_of_week
    FROM speech s
    LEFT JOIN section_time_slots ts ON s.time_slot_id = ts.time_slot_id
    WHERE s.file_id = $1
    ORDER BY s.slot_order ASC
  `;
  return await getMany(query, [fileId]);
};

/**
 * Get all speech records
 */
export const getAllSpeech = async () => {
  const query = `
    SELECT s.*, sf.filename, ts.start_time, ts.end_time, ts.day_of_week
    FROM speech s
    JOIN sound_files sf ON s.file_id = sf.file_id
    LEFT JOIN section_time_slots ts ON s.time_slot_id = ts.time_slot_id
    ORDER BY s.file_id DESC, s.slot_order ASC
  `;
  return await getMany(query);
};

/**
 * Split audio by class schedule time slots, transcribe each segment, and save to DB.
 *
 * @param fileId     Sound file ID in sound_files table
 * @param filePath   Path to the uploaded audio file
 * @param classId    Class ID to look up time slots
 * @param dayOfWeek  Day of week (e.g. 'Sunday', 'Monday')
 * @param slotDate   Specific date (e.g. '2026-03-08')
 * @param shouldDenoise Whether to apply audio denoising (default: true)
 * @returns Array of created speech records
 */
export const transcribeAndSave = async (
  fileId: number,
  filePath: string,
  classId?: number,
  dayOfWeek?: string,
  slotDate?: string,
  shouldDenoise: boolean = true
) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  // Step 1: Denoise the audio (if user chose to)
  let denoisedPath = absolutePath;
  let denoisedCleanup = false;
  
  if (shouldDenoise) {
    console.log(`[Speech] Denoising audio before transcription (file_id=${fileId})...`);
    updateProgress(fileId, { status: 'denoising', message: 'جاري تنقية الصوت من الضوضاء...', percent: 10 });
    denoisedPath = await denoiseAudio(absolutePath, fileId);
    denoisedCleanup = denoisedPath !== absolutePath;
  } else {
    console.log(`[Speech] Skipping denoise - user chose to process as-is (file_id=${fileId})...`);
    updateProgress(fileId, { status: 'analyzing', message: 'جاري تحليل الملف...', percent: 15 });
  }

  try {
  // If no class/day provided, transcribe the whole file (legacy behavior)
  if (!classId || !dayOfWeek) {
    console.log(`[Speech] No class/day provided — transcribing full file (file_id=${fileId})`);
    updateProgress(fileId, { status: 'transcribing', message: 'جاري تحويل الصوت إلى نص...', percent: 30 });
    const result = await transcribeAudio(denoisedPath, fileId);
    updateProgress(fileId, { status: 'saving', message: 'جاري حفظ النص...', percent: 90 });
    const speech = await saveSpeech(fileId, result.text, result.language, result.duration);
    updateProgress(fileId, { status: 'completed', message: 'تم الانتهاء بنجاح!', percent: 100 });
    return [speech];
  }

  // Get time slots for this class + day/date
  const slots = await getTimeSlots(classId, dayOfWeek, slotDate);
  if (slots.length === 0) {
    console.log(`[Speech] No time slots found for class=${classId}, day=${dayOfWeek}, date=${slotDate} — transcribing full file`);
    updateProgress(fileId, { status: 'transcribing', message: 'جاري تحويل الصوت إلى نص...', percent: 30 });
    const result = await transcribeAudio(denoisedPath, fileId);
    updateProgress(fileId, { status: 'saving', message: 'جاري حفظ النص...', percent: 90 });
    const speech = await saveSpeech(fileId, result.text, result.language, result.duration);
    updateProgress(fileId, { status: 'completed', message: 'تم الانتهاء بنجاح!', percent: 100 });
    return [speech];
  }

  console.log(`[Speech] Found ${slots.length} time slots for class=${classId}, day=${dayOfWeek}`);
  updateProgress(fileId, { status: 'analyzing', message: `تم العثور على ${slots.length} حصص. جاري تحليل الملف...`, percent: 20, totalSlots: slots.length });

  // Get total audio duration
  const totalDuration = await getAudioDuration(denoisedPath);
  console.log(`[Speech] Total audio duration: ${totalDuration}s`);

  // Calculate segment timings from time slots.
  // If slot times are malformed/duplicated, fallback to sequential slicing by duration.
  const parsedSlots = slots.map((slot, index) => {
    const startAbs = timeToSeconds(slot.start_time);
    const endAbs = timeToSeconds(slot.end_time);
    const durationRaw = endAbs - startAbs;

    console.log(
      `[Speech] Slot ${index + 1} raw: start_time=${slot.start_time}, end_time=${slot.end_time}, startAbs=${startAbs}, endAbs=${endAbs}, durationRaw=${durationRaw}`
    );

    return {
      timeSlotId: slot.time_slot_id,
      slotOrder: index + 1,
      startAbs,
      durationRaw,
    };
  });

  const hasInvalidTimes = parsedSlots.some((s) => !Number.isFinite(s.startAbs) || !Number.isFinite(s.durationRaw) || s.durationRaw <= 0);
  const firstSlotStart = parsedSlots[0]?.startAbs ?? NaN;
  const relativeStarts = parsedSlots.map((s) => s.startAbs - firstSlotStart);
  const nonIncreasingRelativeStarts = relativeStarts.some((start, idx) => idx > 0 && start <= relativeStarts[idx - 1]);
  const allRelativeStartsZero = relativeStarts.length > 1 && relativeStarts.every((start) => Math.abs(start) < 1e-6);

  const useProportionalFallback = hasInvalidTimes || !Number.isFinite(firstSlotStart) || nonIncreasingRelativeStarts || allRelativeStartsZero;

  if (useProportionalFallback) {
    console.warn('[Speech] Slot times are invalid or not increasing. Using proportional segmentation fallback.');
    console.warn(`[Speech] hasInvalidTimes=${hasInvalidTimes}, nonIncreasingRelativeStarts=${nonIncreasingRelativeStarts}, allRelativeStartsZero=${allRelativeStartsZero}`);
  }

  const slotDurations = parsedSlots.map((slot) =>
    Number.isFinite(slot.durationRaw) && slot.durationRaw > 0 ? slot.durationRaw : 900
  );

  const totalSlotDuration = slotDurations.reduce((sum, dur) => sum + dur, 0);

  let consumedDuration = 0;
  const segments = parsedSlots.map((slot, index) => {
    const safeDuration = slotDurations[index];

    let startSec: number;
    let durationSec: number;

    if (useProportionalFallback) {
      // Map slot durations onto the actual audio timeline so each slot gets a unique segment.
      const ratioStart = consumedDuration / totalSlotDuration;
      const ratioEnd = (consumedDuration + safeDuration) / totalSlotDuration;
      startSec = totalDuration * ratioStart;
      const endSec = totalDuration * ratioEnd;
      durationSec = Math.max(0.001, endSec - startSec);
      consumedDuration += safeDuration;
    } else {
      startSec = slot.startAbs - firstSlotStart;
      durationSec = safeDuration;
    }

    return {
      timeSlotId: slot.timeSlotId,
      startSec,
      durationSec,
      slotOrder: slot.slotOrder,
    };
  });

  // Create temp directory for segments
  const tempDir = path.join(path.dirname(denoisedPath), 'temp_segments');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const results: any[] = [];
  const ext = path.extname(absolutePath);

  for (const seg of segments) {
    if (!Number.isFinite(seg.startSec) || !Number.isFinite(seg.durationSec) || seg.durationSec <= 0) {
      console.warn(`[Speech] Skipping slot ${seg.slotOrder} due to invalid segment timing: start=${seg.startSec}, duration=${seg.durationSec}`);
      continue;
    }

    // Skip if segment starts beyond audio duration
    if (seg.startSec >= totalDuration) {
      console.log(`[Speech] Slot ${seg.slotOrder} starts at ${seg.startSec}s which is beyond audio duration ${totalDuration}s — skipping`);
      continue;
    }

    // Clamp duration to not exceed audio end
    const effectiveDuration = Math.min(seg.durationSec, totalDuration - seg.startSec);
    if (!Number.isFinite(effectiveDuration) || effectiveDuration <= 0) {
      console.log(`[Speech] Slot ${seg.slotOrder} computed non-positive effective duration (${effectiveDuration}) — skipping`);
      continue;
    }

    const segmentFile = path.join(tempDir, `segment_${seg.slotOrder}${ext}`);
    console.log(`[Speech] 📌 Processing slot ${seg.slotOrder}/${segments.length}: start=${seg.startSec}s, duration=${effectiveDuration}s, time_slot_id=${seg.timeSlotId}`);

    // Calculate progress: slots spread across 25%-95%
    const slotProgressBase = 25;
    const slotProgressRange = 70; // 25% to 95%
    const perSlotRange = slotProgressRange / segments.length;
    const slotStart = slotProgressBase + (seg.slotOrder - 1) * perSlotRange;

    try {
      // Split audio segment
      updateProgress(fileId, {
        status: 'splitting',
        message: `جاري تقسيم الحصة ${seg.slotOrder} من ${segments.length}...`,
        percent: Math.round(slotStart),
        currentSlot: seg.slotOrder,
        totalSlots: segments.length,
      });
      console.log(`[Speech] 🔀 Splitting segment ${seg.slotOrder}...`);
      console.log(`[Speech] Source file: ${denoisedPath} (exists: ${fs.existsSync(denoisedPath)})`);
      console.log(`[Speech] Target segment: ${segmentFile}`);
      console.log(`[Speech] Split params: start=${seg.startSec}s, duration=${effectiveDuration}s`);
      
      console.log(`[Speech] About to call splitAudioSegment...`);
      await splitAudioSegment(denoisedPath, segmentFile, seg.startSec, effectiveDuration);
      
      console.log(`[Speech] ✂️ splitAudioSegment completed`);
      const segmentExists = fs.existsSync(segmentFile);
      console.log(`[Speech] Segment file exists check: ${segmentExists}`);
      
      if (!segmentExists) {
        console.error(`[Speech] ❌ CRITICAL: Segment file was NOT created!`);
        console.error(`[Speech] Expected path: ${segmentFile}`);
        console.error(`[Speech] Files in temp_dir:`);
        try {
          const tempFiles = fs.readdirSync(tempDir);
          console.error(`[Speech] Temp dir contents: ${JSON.stringify(tempFiles)}`);
        } catch (e) {
          console.error(`[Speech] Could not read temp dir: ${(e as any).message}`);
        }
        throw new Error(`Segment file not created: ${segmentFile}`);
      }
      
      const segmentSize = (fs.statSync(segmentFile).size / 1024).toFixed(1);
      console.log(`[Speech] ✂️ Segment split: ${path.basename(segmentFile)} (size: ${segmentSize}KB)`);

      // Transcribe segment
      console.log(`[Speech] 🗣️ Transcribing segment ${seg.slotOrder}...`);
      console.log(`[Speech] Segment file to transcribe: ${segmentFile} (exists: ${fs.existsSync(segmentFile)})`);
      updateProgress(fileId, {
        status: 'transcribing',
        message: `جاري تحويل الحصة ${seg.slotOrder} من ${segments.length} إلى نص...`,
        percent: Math.round(slotStart + perSlotRange * 0.3),
        currentSlot: seg.slotOrder,
        totalSlots: segments.length,
      });
      
      
      let result;
      try {
        console.log(`[Speech] Calling transcribeAudio...`);
        result = await transcribeAudio(segmentFile, fileId, { current: seg.slotOrder, total: segments.length });
        console.log(`[Speech] ✅ Transcription result received`);
        console.log(`[Speech] Segment ${seg.slotOrder} text length: ${result.text.length} chars`);
        console.log(`[Speech] First 200 chars: "${result.text.substring(0, 200)}"`);
        console.log(`[Speech] Last 200 chars: "${result.text.substring(Math.max(0, result.text.length - 200))}"`);
      } catch (transcribeErr) {
        console.error(`[Speech] ❌ transcribeAudio threw error:`, transcribeErr);
        throw transcribeErr;
      }

      // Save to DB
      updateProgress(fileId, {
        status: 'saving',
        message: `جاري حفظ الحصة ${seg.slotOrder} من ${segments.length}...`,
        percent: Math.round(slotStart + perSlotRange * 0.8),
        currentSlot: seg.slotOrder,
        totalSlots: segments.length,
      });
      console.log(`[Speech] 💾 Saving paragraph ${seg.slotOrder}...`);
      const speech = await saveSpeech(
        fileId,
        result.text,
        result.language,
        effectiveDuration,
        seg.timeSlotId,
        seg.slotOrder
      );

      console.log(`[Speech] ✅ Slot ${seg.slotOrder} saved: speech.id=${speech.id}`);
      results.push(speech);
    } catch (err) {
      console.error(`[Speech] ❌ Error processing slot ${seg.slotOrder}:`, err);
      console.error(`[Speech] Error type: ${err instanceof Error ? err.name : typeof err}`);
      console.error(`[Speech] Error message: ${(err as any).message}`);
      console.error(`[Speech] Error status: ${(err as any).status}`);
      console.error(`[Speech] Error code: ${(err as any).code}`);
      console.error(`[Speech] Full error:`, JSON.stringify(err, null, 2));
      // Save a placeholder record so the time_slot link is preserved
      try {
        const speech = await saveSpeech(
          fileId,
          '[transcription_pending]',
          'ar',
          effectiveDuration,
          seg.timeSlotId,
          seg.slotOrder
        );
        console.log(`[Speech] ⚠️ Slot ${seg.slotOrder} saved as pending: speech.id=${speech.id}`);
        results.push(speech);
      } catch (saveErr) {
        console.error(`[Speech] ❌ Failed to save placeholder for slot ${seg.slotOrder}:`, saveErr);
      }
    } finally {
      // Clean up segment file
      if (fs.existsSync(segmentFile)) {
        fs.unlinkSync(segmentFile);
      }
    }
  }

  // Clean up temp directory
  try {
    fs.rmdirSync(tempDir);
  } catch { /* ignore if not empty */ }

  console.log(`[Speech] Completed: ${results.length}/${segments.length} slots transcribed for file_id=${fileId}`);
  updateProgress(fileId, { status: 'completed', message: `تم الانتهاء! تم معالجة ${results.length} من ${segments.length} حصة.`, percent: 100 });
  return results;
  } finally {
    // Clean up denoised file
    if (denoisedCleanup && fs.existsSync(denoisedPath)) {
      fs.unlinkSync(denoisedPath);
      console.log(`[FFmpeg] Cleaned up denoised file`);
    }
  }
};
