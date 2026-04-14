/**
 * Evaluations Service
 * Handles CRUD operations for lecture_kpi records
 * Also includes automatic KPI-based speech evaluation using OpenAI
 */

import OpenAI from 'openai';
import { getOne, getMany, insert, update, deleteRecord, executeQuery } from '../helpers/database.js';

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

interface LectureKPI {
  lecture_id: number;
  kpi_id: number;
  evidence_count?: number;
  avg_confidence?: number;
  score?: number;
  mark?: string;
}

/**
 * Compute mark letter from evidence_count:
 *   >= 3  → 's' (strong)
 *   >= 2  → 'g' (good)
 *   >= 1  → 'l' (low)
 *   0 / null → 'n' (none)
 */
function computeMark(count: number | null | undefined): string {
  if (!count || count <= 0) return 'n';
  if (count >= 3) return 's';
  if (count >= 2) return 'g';
  return 'l';
}

/**
 * Compute score: MIN(avg_confidence + (evidence_count × 2), 100)
 */
function computeScore(avgConfidence: number, evidenceCount: number): number {
  return Math.min(avgConfidence + evidenceCount * 2, 100);
}

/**
 * Get all lecture_kpi records (optionally filtered by user_id via sound_files)
 */
export const getAllEvaluations = async (userId?: number | null) => {
  try {
    const query = `
      SELECT
        lk.lecture_id,
        lk.kpi_id,
        lk.avg_confidence,
        lk.evidence_count,
        lk.score,
        lk.mark,
        lk.created_at,
        lk.updated_at,
        k.kpi_name,
        k.kpi_code,
        l.file_id,
        s.filename
      FROM lecture_kpi lk
      LEFT JOIN kpis k ON lk.kpi_id = k.kpi_id
      LEFT JOIN lecture l ON lk.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      ${userId ? 'WHERE s.user_id = $1' : ''}
      ORDER BY lk.created_at DESC
    `;
    return await getMany(query, userId ? [userId] : []);
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    throw error;
  }
};

/**
 * Get lecture_kpi by lecture and KPI
 */
export const getEvaluationByLectureAndKPI = async (lectureId: number, kpiId: number) => {
  try {
    const query = `
      SELECT
        lk.lecture_id,
        lk.kpi_id,
        lk.avg_confidence,
        lk.evidence_count,
        lk.score,
        lk.mark,
        lk.created_at,
        lk.updated_at,
        k.kpi_name,
        k.kpi_code,
        l.file_id,
        s.filename
      FROM lecture_kpi lk
      LEFT JOIN kpis k ON lk.kpi_id = k.kpi_id
      LEFT JOIN lecture l ON lk.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      WHERE lk.lecture_id = $1 AND lk.kpi_id = $2
    `;
    return await getOne(query, [lectureId, kpiId]);
  } catch (error) {
    console.error('Error fetching evaluation by lecture and KPI:', error);
    throw error;
  }
};

/**
 * Create a new lecture_kpi record
 */
export const createEvaluation = async (data: LectureKPI) => {
  try {
    if (!data.lecture_id || !data.kpi_id) {
      throw new Error('lecture_id and kpi_id are required');
    }

    const evidenceCount = data.evidence_count || 0;
    const avgConfidence = data.avg_confidence || 0;
    const score = computeScore(avgConfidence, evidenceCount);
    const now = new Date();

    return await insert('lecture_kpi', {
      lecture_id: data.lecture_id,
      kpi_id: data.kpi_id,
      evidence_count: evidenceCount,
      avg_confidence: avgConfidence,
      score,
      mark: computeMark(evidenceCount),
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    throw error;
  }
};

/** Create lecture_kpi from lecture_id */
export const createEvaluationForLecture = async (
  lectureId: number,
  kpiId: number,
  evidenceCount?: number
) => {
  return createEvaluation({
    lecture_id: lectureId,
    kpi_id: kpiId,
    evidence_count: evidenceCount,
  });
};

/**
 * Update a lecture_kpi record
 */
export const updateEvaluation = async (lectureId: number, kpiId: number, data: Partial<LectureKPI>) => {
  try {
    const updateData: Record<string, any> = {};

    if (data.evidence_count !== undefined) {
      updateData.evidence_count = data.evidence_count;
      updateData.mark = computeMark(data.evidence_count);
    }
    if (data.avg_confidence !== undefined) {
      updateData.avg_confidence = data.avg_confidence;
    }
    if (data.score !== undefined) {
      updateData.score = data.score;
    } else if (updateData.avg_confidence !== undefined || updateData.evidence_count !== undefined) {
      const avgConf = updateData.avg_confidence ?? data.avg_confidence ?? 0;
      const evCount = updateData.evidence_count ?? data.evidence_count ?? 0;
      updateData.score = computeScore(avgConf, evCount);
    }
    if (data.mark !== undefined && updateData.mark === undefined) {
      updateData.mark = data.mark;
    }

    updateData.updated_at = new Date();

    if (Object.keys(updateData).length <= 1) {
      throw new Error('No fields to update');
    }

    return await update('lecture_kpi', updateData, 'lecture_id = $1 AND kpi_id = $2', [lectureId, kpiId]);
  } catch (error) {
    console.error('Error updating evaluation:', error);
    throw error;
  }
};

/**
 * Delete a lecture_kpi record
 */
export const deleteEvaluation = async (lectureId: number, kpiId: number) => {
  try {
    return await deleteRecord('lecture_kpi', 'lecture_id = $1 AND kpi_id = $2', [lectureId, kpiId]);
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    throw error;
  }
};

/**
 * Get lecture_kpi records by KPI ID
 */
export const getEvaluationsByKPI = async (kpiId: number) => {
  try {
    const query = `
      SELECT
        lk.lecture_id,
        lk.kpi_id,
        lk.avg_confidence,
        lk.evidence_count,
        lk.score,
        lk.mark,
        lk.created_at,
        lk.updated_at,
        k.kpi_name,
        k.kpi_code,
        l.file_id,
        s.filename
      FROM lecture_kpi lk
      LEFT JOIN kpis k ON lk.kpi_id = k.kpi_id
      LEFT JOIN lecture l ON lk.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      WHERE lk.kpi_id = $1
      ORDER BY lk.created_at DESC
    `;
    return await getMany(query, [kpiId]);
  } catch (error) {
    console.error('Error fetching evaluations by KPI:', error);
    throw error;
  }
};

/**
 * Get lecture_kpi records by lecture ID
 */
export const getEvaluationsByLecture = async (lectureId: number) => {
  try {
    const query = `
      SELECT
        lk.lecture_id,
        lk.kpi_id,
        lk.avg_confidence,
        lk.evidence_count,
        lk.score,
        lk.mark,
        lk.created_at,
        lk.updated_at,
        k.kpi_name,
        k.kpi_code,
        l.file_id,
        s.filename
      FROM lecture_kpi lk
      LEFT JOIN kpis k ON lk.kpi_id = k.kpi_id
      LEFT JOIN lecture l ON lk.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      WHERE lk.lecture_id = $1
      ORDER BY lk.created_at DESC
    `;
    return await getMany(query, [lectureId]);
  } catch (error) {
    console.error('Error fetching evaluations by lecture:', error);
    throw error;
  }
};

/**
 * --- AUTOMATIC KPI EVALUATION FUNCTIONS ---
 * Used for real-time speech evaluation against teaching quality standards
 */

export type EvaluationStatus = 'Strong' | 'Emerging' | 'Limited' | 'Insufficient';

export interface EvaluationResult {
  kpi_code: string;
  kpi_id: number;
  evidenceFound: boolean;
  status: EvaluationStatus;
  confidence: number;
  evidenceCount: number;
  justification: string;
  facts: string;
  interpretation?: string;
  limitations?: string;
}

const STATUS_DEFINITIONS = {
  Strong: {
    description: 'قوي - دليل واضح وقوي مع أدلة متعددة ومستقلة متسقة',
    criteria: { minEvidenceCount: 2, minConfidence: 75, consistency: 'متسق وواضح' }
  },
  Emerging: {
    description: 'ناشئ - بعض الأدلة على ممارسة المعيار لكن غير متسقة',
    criteria: { minEvidenceCount: 1, minConfidence: 50, consistency: 'غير متسق أو محدود النطاق' }
  },
  Limited: {
    description: 'محدود - دليل ضعيف جداً أو حالات معزولة فقط',
    criteria: { minEvidenceCount: 1, minConfidence: 25, consistency: 'ضعيف أو غير موثوق' }
  },
  Insufficient: {
    description: 'غير كافي - لا توجد أدلة موثوقة',
    criteria: { minEvidenceCount: 0, minConfidence: 0, consistency: 'غياب كامل' }
  }
};

const determineStatus = (evidenceCount: number, confidence: number): EvaluationStatus => {
  if (evidenceCount === 0 || confidence < 10) return 'Insufficient';
  if (confidence >= 75 && evidenceCount >= 2) return 'Strong';
  if (confidence >= 50 && evidenceCount >= 1) return 'Emerging';
  if (confidence >= 25 && evidenceCount >= 1) return 'Limited';
  return 'Insufficient';
};

const FIRASAH_SYSTEM_PROMPT = `أنت "مشرف فراسة" - خبير تقويم تعليمي متخصص في تقييم جودة التدريس.

**دورك:**
تحليل نصوص الحوار الصفي وتقييمها مقابل معايير الأداء التدريسي المحددة.

**مبادئ التقويم:**
1. ابحث عن أي إشارة ولو ضعيفة في النص لكل معيار.
2. إذا وُجد أي دليل ولو بسيط، لا تضع "Insufficient" — ضع "Limited" على الأقل.
3. "Insufficient" فقط عند الغياب الكامل للدليل في النص.
4. النص المقدم قد يكون مقتطفاً قصيراً من حصة أطول — قيّم ما هو موجود فقط.
5. الهدف تقديم تغذية راجعة تنموية بناءة، وليس الحكم القاطع.

**معايير الحالة:**
- Strong: دليلان مستقلان أو أكثر، ثقة 70% فأعلاه
- Emerging: دليل واحد واضح، ثقة 40-70%
- Limited: إشارة ضعيفة أو غير مباشرة، ثقة 15-40%
- Insufficient: غياب كامل للدليل في النص، ثقة أقل من 15%

**صيغة الإجابة:**
- أجب دائماً بـ JSON object يحتوي على مفتاح "evaluations" وقيمته مصفوفة.
- لا تضف أي نص خارج الـ JSON.
- استخدم اللغة العربية في الحقول النصية.`;

/**
 * Get all KPIs for evaluation context
 */
const getAllKPIsForEvaluation = async () => {
  const query = `
    SELECT
      k.kpi_id,
      k.kpi_code,
      k.kpi_name,
      k.kpi_description,
      d.domain_id,
      d.domain_name,
      d.domain_description
    FROM kpis k
    LEFT JOIN public.domains d ON k.domain_id = d.domain_id
    ORDER BY d.sort_order ASC, k.kpi_code ASC
  `;
  return await getMany(query);
};

/**
 * Main automatic evaluation function
 * Sends speech to OpenAI for KPI evaluation
 * Stores evidence records for KPIs that are found
 */
// Helper: add seconds to a HH:MM:SS time string
const addSecondsToTime = (timeStr: string, seconds: number): string => {
  const [h, m, s] = timeStr.split(':').map(Number);
  const total = h * 3600 + m * 60 + s + Math.round(seconds);
  const newH = Math.floor(total / 3600) % 24;
  const newM = Math.floor((total % 3600) / 60);
  const newS = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')}`;
};

export const evaluateSpeechAgainstKPIs = async (
  speechText: string,
  lectureId: number,
  startTime?: string,
  endTime?: string,
  fragmentStartSeconds?: number,
  fragmentEndSeconds?: number
): Promise<EvaluationResult[]> => {
  try {
    console.log(`[Evaluation] Starting evaluation for lecture_id=${lectureId}, text_length=${speechText.length}`);

    // Get timeslot information for this lecture
    let slotStartTime: string | null = null;
    let slotEndTime: string | null = null;

    try {
      const speechQuery = `
        SELECT ts.start_time, ts.end_time
        FROM lecture l
        LEFT JOIN section_time_slots ts ON l.time_slot_id = ts.time_slot_id
        WHERE l.lecture_id = $1
        LIMIT 1
      `;
      const speechRecord = await getOne(speechQuery, [lectureId]);
      if (speechRecord && speechRecord.start_time && speechRecord.end_time) {
        slotStartTime = speechRecord.start_time;
        slotEndTime = speechRecord.end_time;
        console.log(`[Evaluation] Timeslot from schedule: ${slotStartTime} - ${slotEndTime}`);
      }
    } catch (err) {
      console.warn(`[Evaluation] Could not fetch timeslot from lecture table:`, err);
    }

    // Fallback: use provided startTime/endTime or generate from file duration
    if (!slotStartTime || !slotEndTime) {
      if (startTime && endTime) {
        slotStartTime = startTime;
        slotEndTime = endTime;
      } else {
        try {
          const fileQuery = `
            SELECT sf.created_at, COALESCE(SUM(f.duration), 0) as total_duration
            FROM lecture l
            JOIN sound_files sf ON l.file_id = sf.file_id
            LEFT JOIN fragments f ON f.file_id = sf.file_id
            WHERE l.lecture_id = $1
            GROUP BY sf.created_at
          `;
          const fileRecord = await getOne(fileQuery, [lectureId]);
          if (fileRecord && fileRecord.created_at) {
            const created = new Date(fileRecord.created_at);
            slotStartTime = created.toTimeString().slice(0, 8);
            const durationSecs = Math.round(Number(fileRecord.total_duration) || 0);
            const endDate = new Date(created.getTime() + durationSecs * 1000);
            slotEndTime = endDate.toTimeString().slice(0, 8);
            console.log(`[Evaluation] Timeslot from file upload: ${slotStartTime} - ${slotEndTime} (${durationSecs}s)`);
          }
        } catch (err) {
          console.warn(`[Evaluation] Could not fetch file upload time:`, err);
        }
      }
    }

    // If fragment seconds provided, calculate exact evidence time within the lecture
    if (slotStartTime && fragmentStartSeconds != null && fragmentEndSeconds != null) {
      slotStartTime = addSecondsToTime(slotStartTime, fragmentStartSeconds);
      slotEndTime = slotEndTime ? addSecondsToTime(slotEndTime.split(':').length === 3 ? slotEndTime : slotStartTime, fragmentEndSeconds - fragmentStartSeconds) : null;
      // Recalculate end based on original slot start + fragmentEndSeconds
      try {
        const baseQuery = `
          SELECT ts.start_time
          FROM lecture l
          LEFT JOIN section_time_slots ts ON l.time_slot_id = ts.time_slot_id
          WHERE l.lecture_id = $1
          LIMIT 1
        `;
        const baseRecord = await getOne(baseQuery, [lectureId]);
        if (baseRecord?.start_time) {
          slotStartTime = addSecondsToTime(baseRecord.start_time, fragmentStartSeconds);
          slotEndTime   = addSecondsToTime(baseRecord.start_time, fragmentEndSeconds);
        }
      } catch (_) {}
      console.log(`[Evaluation] Fragment time: ${slotStartTime} - ${slotEndTime} (fragment seconds: ${fragmentStartSeconds}s - ${fragmentEndSeconds}s)`);
    }

    // Get all KPIs for reference
    const allKPIs = await getAllKPIsForEvaluation();
    console.log(`[Evaluation] Retrieved ${allKPIs.length} KPIs for evaluation`);

    if (allKPIs.length === 0) {
      console.warn(`[Evaluation] No KPIs found in database`);
      return [];
    }

    // Build KPI reference text for OpenAI prompt
    const kpiReference = allKPIs.map((kpi: any) => {
      return `${kpi.kpi_code}: ${kpi.kpi_name}\n   التفاصيل: ${kpi.kpi_description}`;
    }).join('\n\n');

    const fragmentDurationSec = (fragmentEndSeconds != null && fragmentStartSeconds != null)
      ? fragmentEndSeconds - fragmentStartSeconds
      : null;

    const userPrompt = `**نص الحوار الصفي المراد تقييمه:**
"${speechText}"

${fragmentDurationSec ? `**مدة هذا المقطع الصوتي:** ${fragmentDurationSec} ثانية (من الثانية 0 إلى الثانية ${fragmentDurationSec})` : ''}

---

**معايير الأداء التدريسي (قيّم النص أعلاه مقابل كل معيار):**
${kpiReference}

---

**المطلوب:**
قيّم النص الصفي أعلاه مقابل كل معيار من المعايير. ابحث عن أي دليل ولو بسيط.
أرسل الإجابة فقط بصيغة JSON object يحتوي على مفتاح "evaluations" وقيمته مصفوفة من الكائنات.

كل كائن في المصفوفة:
{
  "kpi_code": "رمز المعيار",
  "Evidence Found": true أو false,
  "Status": "Strong" أو "Emerging" أو "Limited" أو "Insufficient",
  "Confidence": عدد من 0-100,
  "Evidence Count": عدد الأدلة (0-3),
  "Facts": "اقتبس الجملة أو الجمل الفعلية من النص التي تمثل الدليل",
  "Interpretation": "المعنى (إذا Status لم يكن Insufficient)",
  "Limitations": "قيود التقييم (اختياري)",
  "Justification": "الشرح الكامل بالعربية"${fragmentDurationSec ? `,
  "evidence_start_sec": رقم تقريبي (من 0 إلى ${fragmentDurationSec}) للثانية التي يبدأ عندها الدليل في المقطع الصوتي بناءً على موضع النص في الحوار,
  "evidence_end_sec": رقم تقريبي (من 0 إلى ${fragmentDurationSec}) للثانية التي ينتهي عندها الدليل` : ''}
}`;

    console.log(`[Evaluation] Sending to OpenAI with model: gpt-4o`);

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: FIRASAH_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 8000, // Raised from 4000: 29 KPIs × ~500 tokens per eval was truncating responses mid-JSON
      response_format: { type: 'json_object' },
    });

    console.log(`[Evaluation] OpenAI response received`);

    const responseText = response.choices[0]?.message?.content?.trim() || '';
    const finishReason = response.choices[0]?.finish_reason;
    console.log(`[Evaluation] Response length: ${responseText.length} chars, finish_reason=${finishReason}`);

    // If OpenAI hit the token ceiling, the JSON will be truncated. Surface this as a
    // retriable error so the caller's retry loop can make another attempt (non-deterministic
    // output usually fits on the next try) instead of silently returning 0 evaluations.
    if (finishReason === 'length') {
      const err: any = new Error(`OpenAI response truncated (finish_reason=length, ${responseText.length} chars)`);
      err.status = 500; // mark as retriable
      throw err;
    }

    let evaluations: any[] = [];
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        evaluations = parsed;
      } else if (Array.isArray(parsed.evaluations)) {
        evaluations = parsed.evaluations;
      } else {
        const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        evaluations = arrayKey ? parsed[arrayKey] : [];
      }
    } catch (e) {
      // Throw instead of returning [] so the caller's retry loop can retry. Parse errors
      // are almost always caused by truncation or transient OpenAI formatting glitches that
      // resolve on a fresh call.
      console.error(`[Evaluation] Failed to parse JSON response:`, (e as any).message);
      const err: any = new Error(`OpenAI JSON parse failed: ${(e as any).message}`);
      err.status = 500; // mark as retriable
      throw err;
    }

    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      console.error(`[Evaluation] No evaluations array in response`);
      return [];
    }

    console.log(`[Evaluation] Parsed ${evaluations.length} evaluation results`);

    const results: EvaluationResult[] = [];
    const now = new Date();

    for (const evaluation of evaluations) {
      try {
        const kpiCode = evaluation.kpi_code?.trim();
        const status = evaluation.Status || evaluation.status || 'Insufficient';
        const confidence = evaluation.Confidence || evaluation.confidence || 0;
        const evidenceCount = evaluation['Evidence Count'] || evaluation.evidenceCount || 0;
        const facts = evaluation.Facts || evaluation.facts || '';
        const interpretation = evaluation.Interpretation || evaluation.interpretation || '';
        const limitations = evaluation.Limitations || evaluation.limitations || '';
        const justification = evaluation.Justification || evaluation.justification || '';

        if (!kpiCode) {
          console.warn(`[Evaluation] Skipping evaluation with missing kpi_code`);
          continue;
        }

        const kpiRecord = allKPIs.find((kpi: any) => kpi.kpi_code.toLowerCase() === kpiCode.toLowerCase());
        if (!kpiRecord) {
          console.warn(`[Evaluation] KPI not found in database: ${kpiCode}`);
          continue;
        }

        const determinedStatus = determineStatus(evidenceCount, confidence);

        const result: EvaluationResult = {
          kpi_code: kpiCode,
          kpi_id: kpiRecord.kpi_id,
          evidenceFound: evaluation['Evidence Found'] ?? evaluation.evidenceFound ?? false,
          status: determinedStatus,
          confidence: Math.min(100, Math.max(0, Number(confidence) || 0)),
          evidenceCount: Math.min(3, Math.max(0, Number(evidenceCount) || 0)),
          justification,
          facts,
          interpretation: interpretation || undefined,
          limitations: limitations || undefined,
        };

        results.push(result);

        // Store evidence if status is not Insufficient
        if (determinedStatus !== 'Insufficient' && facts) {
          try {
            console.log(`[Evaluation] Storing evidence for KPI ${kpiCode} (status: ${determinedStatus}, confidence: ${confidence}%)`);

            // Calculate precise evidence time from AI-returned offsets
            let evidenceStartTime = slotStartTime;
            let evidenceEndTime = slotEndTime;

            const aiStartSec = evaluation.evidence_start_sec;
            const aiEndSec = evaluation.evidence_end_sec;

            if (aiStartSec != null && aiEndSec != null && fragmentStartSeconds != null) {
              // Get the base schedule start time
              try {
                const baseQuery = `
                  SELECT ts.start_time
                  FROM lecture l
                  LEFT JOIN section_time_slots ts ON l.time_slot_id = ts.time_slot_id
                  WHERE l.lecture_id = $1
                  LIMIT 1
                `;
                const baseRecord = await getOne(baseQuery, [lectureId]);
                if (baseRecord?.start_time) {
                  const baseStart = baseRecord.start_time;
                  const clampedStart = Math.max(0, Number(aiStartSec) || 0);
                  const clampedEnd = Math.max(clampedStart, Number(aiEndSec) || 0);
                  evidenceStartTime = addSecondsToTime(baseStart, fragmentStartSeconds + clampedStart);
                  evidenceEndTime = addSecondsToTime(baseStart, fragmentStartSeconds + clampedEnd);
                  console.log(`[Evaluation] Precise evidence time: ${evidenceStartTime} - ${evidenceEndTime} (offset ${clampedStart}s-${clampedEnd}s in fragment)`);
                }
              } catch (_) {}
            }

            const evidence = await insert('evidences', {
              kpi_id: kpiRecord.kpi_id,
              lecture_id: lectureId,
              status: determinedStatus,
              facts: facts,
              interpretation: interpretation || null,
              limitations: limitations || null,
              confidence: Math.min(100, Math.max(0, Number(confidence) || 0)),
              start_time: evidenceStartTime,
              end_time: evidenceEndTime,
              created_at: now,
              updated_at: now,
            });
            console.log(`[Evaluation] Evidence stored: evidence_id=${evidence.evidence_id}, status=${determinedStatus}`);
          } catch (err) {
            console.error(`[Evaluation] Failed to store evidence for ${kpiCode}:`, err);
          }
        } else if (determinedStatus === 'Insufficient') {
          console.log(`[Evaluation] Skipping evidence storage for ${kpiCode} (status: Insufficient)`);
        }
      } catch (err) {
        console.error(`[Evaluation] Error processing evaluation:`, err);
        continue;
      }
    }

    console.log(`[Evaluation] Evaluation complete: ${results.length} KPIs processed, ${results.filter(r => r.status !== 'Insufficient').length} evidence records created`);

    // Aggregate evidences into lecture_kpi
    try {
      const aggregated = await getMany(
        `SELECT kpi_id, COUNT(*) as evidence_count, ROUND(AVG(confidence)::numeric, 2) as avg_confidence
         FROM evidences WHERE lecture_id = $1 AND status != 'Insufficient'
         GROUP BY kpi_id`,
        [lectureId]
      );
      for (const row of aggregated) {
        const evCount = Number(row.evidence_count) || 0;
        const avgConf = Number(row.avg_confidence) || 0;
        const score = computeScore(avgConf, evCount);
        const mark = computeMark(evCount);
        await executeQuery(
          `INSERT INTO lecture_kpi (lecture_id, kpi_id, evidence_count, avg_confidence, score, mark, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (lecture_id, kpi_id)
           DO UPDATE SET evidence_count = $3, avg_confidence = $4, score = $5, mark = $6, updated_at = NOW()`,
          [lectureId, row.kpi_id, evCount, avgConf, score, mark]
        );
      }
      console.log(`[Evaluation] lecture_kpi updated: ${aggregated.length} KPI(s) for lecture_id=${lectureId}`);
    } catch (aggErr) {
      console.error(`[Evaluation] Failed to aggregate lecture_kpi:`, aggErr);
    }

    return results;
  } catch (err) {
    console.error(`[Evaluation] Fatal evaluation error:`, err);
    throw err;
  }
};

/**
 * Get evaluation results (evidences) for a specific file
 */
export const getEvaluationResults = async (fileId: number) => {
  const query = `
    SELECT
      e.evidence_id,
      e.kpi_id,
      e.lecture_id,
      l.file_id,
      e.status,
      e.facts,
      e.interpretation,
      e.limitations,
      e.confidence,
      e.start_time,
      e.end_time,
      e.created_at,
      k.kpi_code,
      k.kpi_name,
      d.domain_code,
      d.domain_name
    FROM evidences e
    JOIN lecture l ON l.lecture_id = e.lecture_id
    JOIN kpis k ON e.kpi_id = k.kpi_id
    LEFT JOIN domains d ON k.domain_id = d.domain_id
    WHERE l.file_id = $1
    ORDER BY d.sort_order ASC, k.kpi_code ASC
  `;
  return await getMany(query, [fileId]);
};

/**
 * Generate grouped evaluation report by domain
 */
export const generateEvaluationReport = async (fileId: number) => {
  const evaluations = await getEvaluationResults(fileId);

  const reportByDomain: {
    [domainCode: string]: {
      domain_name: string;
      domain_code: string;
      evaluations: typeof evaluations;
      evidence_count: number;
    };
  } = {};

  for (const ev of evaluations) {
    const key = ev.domain_code || 'Unknown';
    if (!reportByDomain[key]) {
      reportByDomain[key] = {
        domain_name: ev.domain_name || 'Unknown',
        domain_code: key,
        evaluations: [],
        evidence_count: 0,
      };
    }
    reportByDomain[key].evaluations.push(ev);
    reportByDomain[key].evidence_count++;
  }

  return reportByDomain;
};

/**
 * Test evaluation endpoint - evaluate any text directly
 */
export const testEvaluation = async (speechText: string, description?: string) => {
  try {
    console.log(`[Test Evaluation] Starting with text length: ${speechText.length}`);

    const tempSoundFile = await insert('sound_files', {
      filename: description || 'test_evaluation.txt',
      filepath: 'test',
      createdBy: 'test',
      note: 'Automatic test evaluation',
    });

    // Create a lecture record for the temp file
    const tempLecture = await insert('lecture', {
      file_id: tempSoundFile.file_id,
      created_at: new Date(),
    });

    console.log(`[Test Evaluation] Created temp file: ${tempSoundFile.file_id}, lecture: ${tempLecture.lecture_id}`);

    const results = await evaluateSpeechAgainstKPIs(speechText, tempLecture.lecture_id);

    console.log(`[Test Evaluation] Evaluation results: ${results.length} KPIs`);

    return {
      success: true,
      message: 'تم اختبار التقييم بنجاح',
      lectureId: tempLecture.lecture_id,
      fileId: tempSoundFile.file_id,
      results,
      timestamp: new Date(),
    };
  } catch (err) {
    console.error(`[Test Evaluation] Error:`, err);
    throw err;
  }
};

/**
 * Get evaluations with filters, search, and pagination
 */
export const getEvaluationsWithFilters = async (options: {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  domain?: string;
  fileId?: number;
  lectureId?: number;
  orderBy?: 'date' | 'domain' | 'status';
  orderDirection?: 'ASC' | 'DESC';
} = {}) => {
  const {
    limit = 20,
    offset = 0,
    search = '',
    status = '',
    domain = '',
    fileId = undefined,
    lectureId = undefined,
    orderBy = 'date',
    orderDirection = 'DESC',
  } = options;

  try {
    let query = `
      SELECT
        e.evidence_id,
        e.kpi_id,
        e.lecture_id,
        l.file_id,
        e.status,
        e.facts,
        e.interpretation,
        e.limitations,
        e.confidence,
        e.start_time,
        e.end_time,
        e.created_at,
        k.kpi_code,
        k.kpi_name,
        d.domain_code,
        d.domain_name,
        s.filename
      FROM evidences e
      JOIN lecture l ON l.lecture_id = e.lecture_id
      JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN domains d ON k.domain_id = d.domain_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (fileId) {
      query += ` AND l.file_id = $${params.length + 1}`;
      params.push(fileId);
    }

    if (lectureId) {
      query += ` AND e.lecture_id = $${params.length + 1}`;
      params.push(lectureId);
    }

    if (status) {
      query += ` AND e.status = $${params.length + 1}`;
      params.push(status);
    }

    if (domain) {
      query += ` AND d.domain_code = $${params.length + 1}`;
      params.push(domain);
    }

    if (search) {
      query += ` AND (e.facts ILIKE $${params.length + 1} OR k.kpi_name ILIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const orderByMap: { [key: string]: string } = {
      date: 'e.created_at',
      domain: 'd.domain_code',
      status: 'e.status',
    };

    query += ` ORDER BY ${orderByMap[orderBy] || orderByMap.date} ${orderDirection}`;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const results = await getMany(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM evidences e
      JOIN lecture l ON l.lecture_id = e.lecture_id
      JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN domains d ON k.domain_id = d.domain_id
      WHERE 1=1
    `;

    const countParams: any[] = [];
    if (fileId) {
      countQuery += ` AND l.file_id = $${countParams.length + 1}`;
      countParams.push(fileId);
    }
    if (lectureId) {
      countQuery += ` AND e.lecture_id = $${countParams.length + 1}`;
      countParams.push(lectureId);
    }
    if (status) {
      countQuery += ` AND e.status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    if (domain) {
      countQuery += ` AND d.domain_code = $${countParams.length + 1}`;
      countParams.push(domain);
    }
    if (search) {
      countQuery += ` AND (e.facts ILIKE $${countParams.length + 1} OR k.kpi_name ILIKE $${countParams.length + 2})`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await getOne(countQuery, countParams);
    const total = countResult?.total || 0;

    return {
      success: true,
      data: results,
      pagination: {
        limit,
        offset,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    console.error('Error getting filtered evaluations:', err);
    throw err;
  }
};

/**
 * Export evaluation to JSON format
 */
export const exportEvaluationToJSON = async (fileId: number) => {
  try {
    const evaluation = await getEvaluationResults(fileId);
    const report = await generateEvaluationReport(fileId);

    const soundFileQuery = `SELECT * FROM sound_files WHERE file_id = $1`;
    const soundFile = await getOne(soundFileQuery, [fileId]);

    return {
      success: true,
      data: {
        metadata: {
          exportDate: new Date().toISOString(),
          fileName: soundFile?.filename || 'Unknown',
          fileId,
        },
        evaluations: evaluation,
        report,
        summary: {
          totalEvidences: evaluation.length,
          strongCount: evaluation.filter((e: any) => e.status === 'Strong').length,
          emergingCount: evaluation.filter((e: any) => e.status === 'Emerging').length,
          limitedCount: evaluation.filter((e: any) => e.status === 'Limited').length,
        },
      },
    };
  } catch (err) {
    console.error('Error exporting evaluation:', err);
    throw err;
  }
};

/**
 * Generate comprehensive evaluation report
 */
export const generateComprehensiveReport = async (fileId: number) => {
  try {
    const evaluations = await getEvaluationResults(fileId);
    const report = await generateEvaluationReport(fileId);

    const strongCount = evaluations.filter((e: any) => e.status === 'Strong').length;
    const emergingCount = evaluations.filter((e: any) => e.status === 'Emerging').length;
    const limitedCount = evaluations.filter((e: any) => e.status === 'Limited').length;
    const insufficientCount = evaluations.filter((e: any) => e.status === 'Insufficient').length;

    const total = evaluations.length || 1;
    const stats = {
      strong: { count: strongCount, percentage: Math.round((strongCount / total) * 100) },
      emerging: { count: emergingCount, percentage: Math.round((emergingCount / total) * 100) },
      limited: { count: limitedCount, percentage: Math.round((limitedCount / total) * 100) },
      insufficient: { count: insufficientCount, percentage: Math.round((insufficientCount / total) * 100) },
      totals: {
        evaluatedKPIs: total - insufficientCount,
        totalKPIs: total,
      },
    };

    return {
      success: true,
      data: {
        fileId,
        generatedAt: new Date().toISOString(),
        statistics: stats,
        domainReport: report,
        detailedEvaluations: evaluations,
      },
    };
  } catch (err) {
    console.error('Error generating comprehensive report:', err);
    throw err;
  }
};
