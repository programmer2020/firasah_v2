/**
 * Progress Service
 * In-memory progress tracker for the audio pipeline.
 * Supports SSE (Server-Sent Events) for real-time updates.
 */

import { Response } from 'express';

export interface PipelineProgress {
  fileId: number;
  status: 'uploading' | 'converting' | 'denoising' | 'analyzing' | 'splitting' | 'transcribing' | 'saving' | 'completed' | 'failed';
  /** Label shown to the user */
  message: string;
  /** 0–100 overall progress */
  percent: number;
  /** Current slot being processed (1-based) */
  currentSlot?: number;
  /** Total number of slots */
  totalSlots?: number;
  /** Error message if status === 'failed' */
  error?: string;
}

// In-memory store  fileId -> progress
const progressMap = new Map<number, PipelineProgress>();

// SSE clients  fileId -> Set<Response>
const sseClients = new Map<number, Set<Response>>();

/** Update progress for a file and push to SSE clients */
export const updateProgress = (fileId: number, update: Partial<PipelineProgress>) => {
  const current = progressMap.get(fileId) || {
    fileId,
    status: 'uploading' as const,
    message: 'جاري التحميل...',
    percent: 0,
  };
  const updated: PipelineProgress = { ...current, ...update, fileId };
  progressMap.set(fileId, updated);

  // Push to all SSE clients watching this fileId
  const clients = sseClients.get(fileId);
  if (clients) {
    const data = JSON.stringify(updated);
    for (const res of clients) {
      try {
        res.write(`data: ${data}\n\n`);
        // Force flush buffered data
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      } catch {
        clients.delete(res);
      }
    }
    // If completed or failed, close connections after a short delay
    if (updated.status === 'completed' || updated.status === 'failed') {
      setTimeout(() => {
        for (const res of clients) {
          try { res.end(); } catch { /* ignore */ }
        }
        sseClients.delete(fileId);
        // Keep entry in map for a while so polling still works
        setTimeout(() => progressMap.delete(fileId), 120_000);
      }, 2000);
    }
  }
};

/** Get current progress snapshot */
export const getProgress = (fileId: number): PipelineProgress | undefined => {
  return progressMap.get(fileId);
};

/** Register an SSE client for a file */
export const addSSEClient = (fileId: number, res: Response) => {
  if (!sseClients.has(fileId)) {
    sseClients.set(fileId, new Set());
  }
  sseClients.get(fileId)!.add(res);

  // Send current state immediately
  const current = progressMap.get(fileId);
  if (current) {
    res.write(`data: ${JSON.stringify(current)}\n\n`);
  }

  // Remove on disconnect
  res.on('close', () => {
    sseClients.get(fileId)?.delete(res);
  });
};
