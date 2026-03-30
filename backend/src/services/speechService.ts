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
import { insert, getOne, getMany, update } from '../helpers/database.js';
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
              message: `جاري تحويل ${slotLabel} إلى نص... (محاولة ${attemptNum}/${totalAttempts})`,
            });
          }

          const file = fs.createReadStream(audioPath);

          // gpt-4o-transcribe only supports 'json' or 'text'; whisper-1 supports 'verbose_json'
          const isGpt4o = model.startsWith('gpt-4o');
          const transcription = await openai.audio.transcriptions.create({
            file,
            model,
            response_format: isGpt4o ? 'json' : 'verbose_json',
          });

          const duration = Date.now() - startTime;
          console.log(`[Speech] ✅ Transcription succeeded with ${model} (${duration}ms)`);
          console.log(`[Speech] Transcript length: ${transcription.text.length} chars`);
          
          // gpt-4o returns only text in json mode; whisper-1 verbose_json includes language & duration
          const detectedLang = (transcription as any).language || null;
          console.log(`[Speech] Detected language: ${detectedLang}`);
          return {
            text: transcription.text,
            language: detectedLang || 'auto',
            duration: (transcription as any).duration || null,
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
  slotOrder: number = 0
) => {
  try {
    console.log(`[Fragment] Saving fragment: file_id=${fileId}, start=${startTime}s, end=${endTime}s, order=${slotOrder}, transcript_len=${transcript.length}`);
    
    const normalizedDuration = duration ?? Math.max(0, endTime - startTime);

    const result = await insert('fragments', {
      file_id: fileId,
      transcript,
      language: language || 'ar',
      duration: normalizedDuration,
      fragment_order: slotOrder,
      start_seconds: startTime,
      end_seconds: endTime,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    console.log(`[Fragment] ✅ Fragment saved successfully: id=${result.id}, file_id=${result.file_id}`);
    
    // Automatically evaluate fragment against KPIs asynchronously
    if (transcript && transcript.trim() && transcript !== '[transcription_pending]') {
      setImmediate(async () => {
        try {
          console.log(`[Evaluation] 🔄 Starting automatic KPI evaluation for fragment_id=${result.id}...`);
          const evaluations = await evaluateSpeechAgainstKPIs(
            transcript,
            fileId,
            result.id,
            undefined
          );
          console.log(`[Evaluation] ✅ Completed: Evaluated against all KPIs, found ${evaluations.length} evidence records`);
        } catch (evalErr) {
          console.error(`[Evaluation] ⚠️ Non-blocking evaluation error for fragment_id=${result.id}:`, evalErr);
        }
      });
    }
    
    return result;
  } catch (err) {
    console.error(`[Fragment] ❌ Failed to save fragment:`, err);
    throw err;
  }
};


/**
 * Rebuild the full transcript for a file from all successful fragments and save it to sound_files.transcript
 */
export const updateAggregatedTranscriptForFile = async (fileId: number, preferredLanguage: string = 'ar') => {
  try {
    const fragments = await getMany(`
      SELECT transcript, language
      FROM fragments
      WHERE file_id = $1
        AND transcript IS NOT NULL
        AND BTRIM(transcript) <> ''
        AND transcript <> '[transcription_pending]'
      ORDER BY fragment_order ASC
    `, [fileId]);

    const fullTranscript = fragments
      .map((fragment: any) => (fragment.transcript || '').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim();

    const language = fragments.find((fragment: any) => fragment.language)?.language || preferredLanguage || 'ar';

    const updated = await update('sound_files', {
      transcript: fullTranscript || null,
      transcript_language: fullTranscript ? language : null,
      transcript_updated_at: fullTranscript ? new Date() : null,
      updated_at: new Date(),
    }, 'file_id = $1', [fileId]);

    console.log(`[Speech] ✅ Aggregated transcript updated for file_id=${fileId}, chars=${fullTranscript.length}`);
    return updated;
  } catch (err) {
    console.error(`[Speech] ❌ Failed to update aggregated transcript for file_id=${fileId}:`, err);
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
    console.log(`[Speech] Saving lecture record: file_id=${fileId}, time_slot_id=${timeSlotId}, slot_order=${slotOrder}, transcript_len=${transcript.length}`);
    
    const result = await insert('lecture', {
      file_id: fileId,
      transcript,
      language,
      duration,
      time_slot_id: timeSlotId,
      slot_order: slotOrder,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    console.log(`[Speech] ✅ Lecture saved successfully: id=${result.id}, file_id=${result.file_id}`);
    
    // Automatically evaluate lecture against KPIs asynchronously
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
 * Get lecture records by file_id
 */
export const getSpeechByFileId = async (fileId: number) => {
  const query = `
    SELECT s.*, ts.start_time, ts.end_time, ts.day_of_week
    FROM lecture s
    LEFT JOIN section_time_slots ts ON s.time_slot_id = ts.time_slot_id
    WHERE s.file_id = $1
    ORDER BY s.slot_order ASC
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
    ORDER BY s.file_id DESC, s.slot_order ASC
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
 * @param slotDate   Specific date (unused now, kept for API compat)
 * @param shouldDenoise Whether to apply audio denoising (default: true)
 * @returns Array of created fragment records
 */
const FRAGMENT_DURATION_SEC = 15 * 60; // 15 minutes in seconds

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
  // Get total audio duration
  const totalDuration = await getAudioDuration(denoisedPath);
  console.log(`[Speech] Total audio duration: ${totalDuration}s`);

  // Calculate 15-minute fragments
  const totalFragments = Math.ceil(totalDuration / FRAGMENT_DURATION_SEC);
  console.log(`[Speech] Splitting into ${totalFragments} fragment(s) of ${FRAGMENT_DURATION_SEC / 60} minutes each`);
  updateProgress(fileId, { status: 'analyzing', message: `جاري تقسيم الملف إلى ${totalFragments} مقطع...`, percent: 20, totalSlots: totalFragments });

  // If file is shorter than 15 min, transcribe as single fragment
  if (totalDuration <= FRAGMENT_DURATION_SEC) {
    console.log(`[Speech] File is short (${totalDuration}s) — transcribing as single fragment`);
    updateProgress(fileId, { status: 'transcribing', message: 'جاري تحويل الصوت إلى نص...', percent: 30 });
    const result = await transcribeAudio(denoisedPath, fileId);
    updateProgress(fileId, { status: 'saving', message: 'جاري حفظ النص...', percent: 90 });
    const fragment = await saveFragment(fileId, result.text, result.language, totalDuration, 0, totalDuration, 1);
    await updateAggregatedTranscriptForFile(fileId, result.language || 'ar');
    updateProgress(fileId, { status: 'completed', message: 'تم الانتهاء بنجاح!', percent: 100 });
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
        message: `جاري تقسيم المقطع ${slotOrder} من ${totalFragments}...`,
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

      // Transcribe segment
      updateProgress(fileId, {
        status: 'transcribing',
        message: `جاري تحويل المقطع ${slotOrder} من ${totalFragments} إلى نص...`,
        percent: Math.round(fragStart + perFragRange * 0.3),
        currentSlot: slotOrder,
        totalSlots: totalFragments,
      });
      
      console.log(`[Speech] 🗣️ Transcribing fragment ${slotOrder}...`);
      const result = await transcribeAudio(segmentFile, fileId, { current: slotOrder, total: totalFragments });
      console.log(`[Speech] ✅ Fragment ${slotOrder} transcribed: ${result.text.length} chars`);

      // Save to DB
      updateProgress(fileId, {
        status: 'saving',
        message: `جاري حفظ المقطع ${slotOrder} من ${totalFragments}...`,
        percent: Math.round(fragStart + perFragRange * 0.8),
        currentSlot: slotOrder,
        totalSlots: totalFragments,
      });
      
      const fragment = await saveFragment(
        fileId,
        result.text,
        result.language,
        effectiveDuration,
        startSec,
        endSec,
        slotOrder
      );

      console.log(`[Speech] ✅ Fragment ${slotOrder} saved: id=${fragment.id}`);
      results.push(fragment);
    } catch (err) {
      console.error(`[Speech] ❌ Error processing fragment ${slotOrder}:`, err);
      // Save a placeholder
      try {
        const fragment = await saveFragment(
          fileId,
          '[transcription_pending]',
          'ar',
          effectiveDuration,
          startSec,
          endSec,
          slotOrder
        );
        console.log(`[Speech] ⚠️ Fragment ${slotOrder} saved as pending: id=${fragment.id}`);
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

  console.log(`[Speech] ✅ Completed: ${results.length}/${totalFragments} fragments transcribed for file_id=${fileId}`);
  await updateAggregatedTranscriptForFile(fileId);
  updateProgress(fileId, { status: 'completed', message: `تم الانتهاء! تم معالجة ${results.length} من ${totalFragments} مقطع.`, percent: 100 });
  return results;
  } finally {
    // Clean up denoised file
    if (denoisedCleanup && fs.existsSync(denoisedPath)) {
      fs.unlinkSync(denoisedPath);
      console.log(`[FFmpeg] Cleaned up denoised file`);
    }
  }
};
