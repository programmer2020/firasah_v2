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
import { insert, getOne, getMany } from '../helpers/database.js';

// Set ffmpeg binary path from ffmpeg-static
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

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
  // Prefer exact date match; fall back to day_of_week
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
  // Fallback: match by day_of_week
  const query = `
    SELECT time_slot_id, class_id, day_of_week, slot_date::text,
           start_time::text, end_time::text
    FROM section_time_slots
    WHERE class_id = $1 AND day_of_week = $2
    ORDER BY start_time ASC
  `;
  return await getMany(query, [classId, dayOfWeek]);
};

/**
 * Convert HH:MM:SS or HH:MM time string to total seconds
 */
const timeToSeconds = (time: string): number => {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 3600 + parts[1] * 60;
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
 * Pipeline:
 *   1. highpass @ 100Hz  — cuts low-frequency rumble (AC, fans, traffic)
 *   2. lowpass  @ 8000Hz — cuts high-frequency hiss (speech is mostly < 8kHz)
 *   3. afftdn nf=-25     — FFT-based adaptive noise reduction
 *   4. anlmdn s=7        — Non-local means denoiser (catches residual noise)
 *   5. loudnorm          — EBU R128 loudness normalization
 */
const denoiseAudio = (inputPath: string): Promise<string> => {
  const ext = path.extname(inputPath);
  const denoisedPath = inputPath.replace(ext, `_denoised${ext}`);

  // Skip if already denoised
  if (inputPath.includes('_denoised')) return Promise.resolve(inputPath);

  console.log(`[FFmpeg] Denoising audio: ${path.basename(inputPath)}`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters([
        'highpass=f=100',
        'lowpass=f=8000',
        'afftdn=nf=-25:tn=1',
        'anlmdn=s=7:p=0.002',
        'loudnorm=I=-16:TP=-1.5:LRA=11',
      ])
      .audioCodec('libmp3lame')
      .audioBitrate(64)
      .audioChannels(1)
      .output(denoisedPath)
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
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSec)
      .setDuration(durationSec)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
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
export const transcribeAudio = async (filePath: string) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  // Compress if file exceeds Whisper limit
  const audioPath = await compressAudioIfNeeded(absolutePath);
  const needsCleanup = audioPath !== absolutePath;

  const models = ['gpt-4o-transcribe', 'whisper-1'];
  const MAX_RETRIES = 2;

  try {
    for (const model of models) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[Speech] Transcribing with ${model} (attempt ${attempt}/${MAX_RETRIES})...`);
          const file = fs.createReadStream(audioPath);

          const isGpt4o = model === 'gpt-4o-transcribe';
          const transcription = await openai.audio.transcriptions.create({
            file,
            model,
            language: 'ar',
            response_format: isGpt4o ? 'json' : 'verbose_json',
          });

          console.log(`[Speech] Transcription succeeded with ${model}`);
          return {
            text: transcription.text,
            language: (transcription as any).language || 'ar',
            duration: (transcription as any).duration || null,
          };
        } catch (err: any) {
          console.error(`[Speech] ${model} attempt ${attempt} failed: ${err.status || err.message}`);
          if (attempt < MAX_RETRIES) {
            const delay = attempt * 5000;
            console.log(`[Speech] Retrying in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
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
  return await insert('speech', {
    file_id: fileId,
    transcript,
    language,
    duration,
    time_slot_id: timeSlotId,
    slot_order: slotOrder,
    created_at: new Date(),
    updated_at: new Date(),
  });
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
 * @returns Array of created speech records
 */
export const transcribeAndSave = async (
  fileId: number,
  filePath: string,
  classId?: number,
  dayOfWeek?: string,
  slotDate?: string
) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  // Step 1: Denoise the audio for better transcription accuracy
  console.log(`[Speech] Denoising audio before transcription (file_id=${fileId})...`);
  const denoisedPath = await denoiseAudio(absolutePath);
  const denoisedCleanup = denoisedPath !== absolutePath;

  try {
  // If no class/day provided, transcribe the whole file (legacy behavior)
  if (!classId || !dayOfWeek) {
    console.log(`[Speech] No class/day provided — transcribing full file (file_id=${fileId})`);
    const result = await transcribeAudio(denoisedPath);
    const speech = await saveSpeech(fileId, result.text, result.language, result.duration);
    return [speech];
  }

  // Get time slots for this class + day/date
  const slots = await getTimeSlots(classId, dayOfWeek, slotDate);
  if (slots.length === 0) {
    console.log(`[Speech] No time slots found for class=${classId}, day=${dayOfWeek}, date=${slotDate} — transcribing full file`);
    const result = await transcribeAudio(denoisedPath);
    const speech = await saveSpeech(fileId, result.text, result.language, result.duration);
    return [speech];
  }

  console.log(`[Speech] Found ${slots.length} time slots for class=${classId}, day=${dayOfWeek}`);

  // Get total audio duration
  const totalDuration = await getAudioDuration(denoisedPath);
  console.log(`[Speech] Total audio duration: ${totalDuration}s`);

  // Calculate segment durations from time slots
  const firstSlotStart = timeToSeconds(slots[0].start_time);
  const segments = slots.map((slot, index) => {
    const slotStartSec = timeToSeconds(slot.start_time) - firstSlotStart;
    const slotDurationSec = timeToSeconds(slot.end_time) - timeToSeconds(slot.start_time);
    return {
      timeSlotId: slot.time_slot_id,
      startSec: slotStartSec,
      durationSec: slotDurationSec,
      slotOrder: index + 1,
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
    // Skip if segment starts beyond audio duration
    if (seg.startSec >= totalDuration) {
      console.log(`[Speech] Slot ${seg.slotOrder} starts at ${seg.startSec}s which is beyond audio duration ${totalDuration}s — skipping`);
      continue;
    }

    // Clamp duration to not exceed audio end
    const effectiveDuration = Math.min(seg.durationSec, totalDuration - seg.startSec);

    const segmentFile = path.join(tempDir, `segment_${seg.slotOrder}${ext}`);
    console.log(`[Speech] Splitting slot ${seg.slotOrder}: start=${seg.startSec}s, duration=${effectiveDuration}s`);

    try {
      // Split audio segment
      await splitAudioSegment(denoisedPath, segmentFile, seg.startSec, effectiveDuration);

      // Transcribe segment
      console.log(`[Speech] Transcribing slot ${seg.slotOrder}...`);
      const result = await transcribeAudio(segmentFile);

      // Save to DB
      const speech = await saveSpeech(
        fileId,
        result.text,
        result.language,
        effectiveDuration,
        seg.timeSlotId,
        seg.slotOrder
      );

      console.log(`[Speech] Slot ${seg.slotOrder} saved: speech.id=${speech.id}`);
      results.push(speech);
    } catch (err) {
      console.error(`[Speech] Error processing slot ${seg.slotOrder}:`, err);
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
  return results;
  } finally {
    // Clean up denoised file
    if (denoisedCleanup && fs.existsSync(denoisedPath)) {
      fs.unlinkSync(denoisedPath);
      console.log(`[FFmpeg] Cleaned up denoised file`);
    }
  }
};
