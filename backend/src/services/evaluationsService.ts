/**
 * Evaluations Service
 * Handles CRUD operations for evaluation records
 * Also includes automatic KPI-based speech evaluation using OpenAI
 */

import OpenAI from 'openai';
import { getOne, getMany, insert, update, deleteRecord } from '../helpers/database.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Evaluation {
  evaluation_id?: number;
  file_id: number;
  kpi_id: number;
  evidence_count?: number;
  avg_confidence?: number;
  kpi_score?: number;
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

function computeKpiScore(
  avgConfidence: number | null | undefined,
  evidenceCount: number | null | undefined
): number {
  const normalizedAverage = Math.min(100, Math.max(0, Number(avgConfidence) || 0));
  const normalizedEvidenceCount = Math.max(0, Number(evidenceCount) || 0);
  return Math.min(Number((normalizedAverage + (normalizedEvidenceCount * 2)).toFixed(2)), 100);
}

/**
 * Get all evaluations
 * @returns Promise with array of evaluations
 */
export const getAllEvaluations = async () => {
  try {
    const query = `
      SELECT 
        e.evaluation_id,
        e.file_id,
        e.kpi_id,
        e.evidence_count,
        e.avg_confidence,
        e.kpi_score,
        e.mark,
        e.created_at,
        e.updated_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      ORDER BY e.created_at DESC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    throw error;
  }
};

/**
 * Get evaluation by ID
 * @param evaluationId Evaluation ID
 * @returns Promise with single evaluation
 */
export const getEvaluationById = async (evaluationId: number) => {
  try {
    const query = `
      SELECT 
        e.evaluation_id,
        e.file_id,
        e.kpi_id,
        e.evidence_count,
        e.avg_confidence,
        e.kpi_score,
        e.mark,
        e.created_at,
        e.updated_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.evaluation_id = $1
    `;
    return await getOne(query, [evaluationId]);
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    throw error;
  }
};

/**
 * Create a new evaluation
 * @param data Evaluation data
 * @returns Promise with created evaluation
 */
export const createEvaluation = async (data: Evaluation) => {
  try {
    if (!data.file_id || !data.kpi_id) {
      throw new Error('file_id and kpi_id are required');
    }

    const evidenceCount = data.evidence_count || 0;
    const avgConfidence = Math.min(100, Math.max(0, Number(data.avg_confidence) || 0));
    return await insert('evaluations', {
      file_id: data.file_id,
      kpi_id: data.kpi_id,
      evidence_count: evidenceCount,
      avg_confidence: avgConfidence,
      kpi_score: computeKpiScore(avgConfidence, evidenceCount),
      mark: computeMark(evidenceCount),
    });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    throw error;
  }
};

/**
 * Update an evaluation
 * @param evaluationId Evaluation ID
 * @param data Data to update
 * @returns Promise with updated evaluation
 */
export const updateEvaluation = async (evaluationId: number, data: Partial<Evaluation>) => {
  try {
    const updateData: Record<string, any> = {};
    
    if (data.file_id) updateData.file_id = data.file_id;
    if (data.kpi_id) updateData.kpi_id = data.kpi_id;
    if (data.evidence_count !== undefined) {
      updateData.evidence_count = data.evidence_count;
    }
    if (data.avg_confidence !== undefined) {
      updateData.avg_confidence = Math.min(100, Math.max(0, Number(data.avg_confidence) || 0));
    }
    if (updateData.evidence_count !== undefined || updateData.avg_confidence !== undefined) {
      const existing = await getEvaluationById(evaluationId);
      if (!existing) {
        throw new Error('Evaluation not found');
      }

      const nextEvidenceCount = updateData.evidence_count ?? existing.evidence_count ?? 0;
      const nextAvgConfidence = updateData.avg_confidence ?? existing.avg_confidence ?? 0;
      updateData.kpi_score = computeKpiScore(nextAvgConfidence, nextEvidenceCount);
      updateData.mark = computeMark(nextEvidenceCount);
    } else if (data.mark !== undefined) {
      updateData.mark = data.mark;
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    return await update('evaluations', updateData, 'evaluation_id = $1', [evaluationId]);
  } catch (error) {
    console.error('Error updating evaluation:', error);
    throw error;
  }
};

/**
 * Delete an evaluation
 * @param evaluationId Evaluation ID
 * @returns Promise with deleted evaluation
 */
export const deleteEvaluation = async (evaluationId: number) => {
  try {
    return await deleteRecord('evaluations', 'evaluation_id = $1', [evaluationId]);
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    throw error;
  }
};

/**
 * Get evaluations by KPI ID
 * @param kpiId KPI ID
 * @returns Promise with array of evaluations
 */
export const getEvaluationsByKPI = async (kpiId: number) => {
  try {
    const query = `
      SELECT 
        e.evaluation_id,
        e.file_id,
        e.kpi_id,
        e.evidence_count,
        e.avg_confidence,
        e.kpi_score,
        e.mark,
        e.created_at,
        e.updated_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.kpi_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [kpiId]);
  } catch (error) {
    console.error('Error fetching evaluations by KPI:', error);
    throw error;
  }
};

/**
 * Get evaluations by file ID
 * @param fileId File ID
 * @returns Promise with array of evaluations
 */
export const getEvaluationsByFile = async (fileId: number) => {
  try {
    const query = `
      SELECT 
        e.evaluation_id,
        e.file_id,
        e.kpi_id,
        e.evidence_count,
        e.avg_confidence,
        e.kpi_score,
        e.mark,
        e.created_at,
        e.updated_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.file_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [fileId]);
  } catch (error) {
    console.error('Error fetching evaluations by file:', error);
    throw error;
  }
};

/**
 * --- AUTOMATIC KPI EVALUATION FUNCTIONS ---
 * Used for real-time speech evaluation against teaching quality standards
 */

/**
 * Status levels for KPI evaluation
 * Defines confidence and evidence thresholds
 */
export type EvaluationStatus = 'Strong' | 'Emerging' | 'Limited' | 'Insufficient';

/**
 * KPI evaluation result interface
 */
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

/**
 * Status level definitions and criteria
 * Used to determine confidence level and evidence thresholds
 */
const STATUS_DEFINITIONS = {
  Strong: {
    description: 'قوي - دليل واضح وقوي مع أدلة متعددة ومستقلة متسقة',
    criteria: {
      minEvidenceCount: 2,
      minConfidence: 75,
      consistency: 'متسق وواضح'
    }
  },
  Emerging: {
    description: 'ناشئ - بعض الأدلة على ممارسة المعيار لكن غير متسقة',
    criteria: {
      minEvidenceCount: 1,
      minConfidence: 50,
      consistency: 'غير متسق أو محدود النطاق'
    }
  },
  Limited: {
    description: 'محدود - دليل ضعيف جداً أو حالات معزولة فقط',
    criteria: {
      minEvidenceCount: 1,
      minConfidence: 25,
      consistency: 'ضعيف أو غير موثوق'
    }
  },
  Insufficient: {
    description: 'غير كافي - لا توجد أدلة موثوقة',
    criteria: {
      minEvidenceCount: 0,
      minConfidence: 0,
      consistency: 'غياب كامل'
    }
  }
};

/**
 * Determine status based on evidence count and confidence
 */
const determineStatus = (evidenceCount: number, confidence: number): EvaluationStatus => {
  if (evidenceCount === 0 || confidence < 10) return 'Insufficient';
  if (confidence >= 75 && evidenceCount >= 2) return 'Strong';
  if (confidence >= 50 && evidenceCount >= 1) return 'Emerging';
  if (confidence >= 25 && evidenceCount >= 1) return 'Limited';
  return 'Insufficient';
};

/**
 * Firasah Supervisor system prompt for classroom evaluation
 * Focus: Evidence-based developmental feedback in Arabic (Saudi)
 */
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
      d.domain_code,
      d.domain_name,
      d.domain_description
    FROM kpis k
    LEFT JOIN kpi_domains d ON k.domain_id = d.domain_id
    ORDER BY d.sort_order ASC, k.kpi_code ASC
  `;
  const rows = await getMany(query);
  return rows;
};

/**
 * Main automatic evaluation function
 * Sends speech to OpenAI for KPI evaluation
 * Stores evidence records for KPIs that are found
 *
 * @param speechText  The transcript text to evaluate
 * @param fileId      Sound file ID (used to look up lecture when lectureId is not provided)
 * @param lectureId   Lecture ID to store evidence against (optional — resolved from fileId if omitted)
 */
export const evaluateSpeechAgainstKPIs = async (
  speechText: string,
  fileId: number,
  lectureId?: number,
  _unused?: any
): Promise<EvaluationResult[]> => {
  try {
    console.log(`[Evaluation] Starting evaluation for file_id=${fileId}, lecture_id=${lectureId ?? 'auto'}, text_length=${speechText.length}`);

    // Resolve lecture_id if not provided
    let resolvedLectureId: number | null = lectureId ?? null;
    if (!resolvedLectureId) {
      try {
        const lectureRow = await getOne(`SELECT lecture_id FROM lecture WHERE file_id = $1 ORDER BY slot_order ASC LIMIT 1`, [fileId]);
        resolvedLectureId = lectureRow?.lecture_id ?? null;
        if (resolvedLectureId) {
          console.log(`[Evaluation] Resolved lecture_id=${resolvedLectureId} from file_id=${fileId}`);
        }
      } catch (err) {
        console.warn(`[Evaluation] ⚠️ Could not resolve lecture_id from file_id=${fileId}:`, err);
      }
    }

    // Get timeslot information for this file
    let slotStartTime: Date | null = null;
    let slotEndTime: Date | null = null;

    try {
      // First try: get scheduled timeslot from lecture → section_time_slots
      const speechQuery = `
        SELECT s.time_slot_id, ts.start_time, ts.end_time
        FROM lecture s
        LEFT JOIN section_time_slots ts ON s.time_slot_id = ts.time_slot_id
        WHERE s.file_id = $1
        LIMIT 1
      `;
      const speechRecord = await getOne(speechQuery, [fileId]);
      if (speechRecord && speechRecord.start_time && speechRecord.end_time) {
        const today = new Date();
        const [startHours, startMins, startSecs] = speechRecord.start_time.split(':').map(Number);
        const [endHours, endMins, endSecs] = speechRecord.end_time.split(':').map(Number);
        slotStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHours, startMins, startSecs);
        slotEndTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHours, endMins, endSecs);
        console.log(`[Evaluation] 📅 Timeslot from schedule: ${slotStartTime.toISOString()} - ${slotEndTime.toISOString()}`);
      }
    } catch (err) {
      console.warn(`[Evaluation] ⚠️ Could not fetch timeslot from lecture table:`, err);
    }

    // Fallback: use file upload time + total fragment duration
    if (!slotStartTime || !slotEndTime) {
      try {
        const fileQuery = `
          SELECT sf.created_at, COALESCE(SUM(f.duration), 0) as total_duration
          FROM sound_files sf
          LEFT JOIN fragments f ON f.file_id = sf.file_id
          WHERE sf.file_id = $1
          GROUP BY sf.created_at
        `;
        const fileRecord = await getOne(fileQuery, [fileId]);
        if (fileRecord && fileRecord.created_at) {
          slotStartTime = new Date(fileRecord.created_at);
          const durationSecs = Math.round(Number(fileRecord.total_duration) || 0);
          slotEndTime = new Date(slotStartTime.getTime() + durationSecs * 1000);
          console.log(`[Evaluation] 📅 Timeslot from file upload: ${slotStartTime.toISOString()} - ${slotEndTime.toISOString()} (${durationSecs}s)`);
        }
      } catch (err) {
        console.warn(`[Evaluation] ⚠️ Could not fetch file upload time:`, err);
      }
    }

    // Get all KPIs for reference
    const allKPIs = await getAllKPIsForEvaluation();
    console.log(`[Evaluation] Retrieved ${allKPIs.length} KPIs for evaluation`);

    if (allKPIs.length === 0) {
      console.warn(`[Evaluation] ⚠️ No KPIs found in database`);
      return [];
    }

    // Build KPI reference text for OpenAI prompt
    const kpiReference = allKPIs.map((kpi: any) => {
      return `${kpi.kpi_code}: ${kpi.kpi_name}\n   التفاصيل: ${kpi.kpi_description}`;
    }).join('\n\n');

    // Build user prompt — speech text FIRST so the model reads it before KPI definitions
    const userPrompt = `**نص الحوار الصفي المراد تقييمه:**
"${speechText}"

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
  "Facts": "وصف موضوعي من النص",
  "Interpretation": "المعنى (إذا Status لم يكن Insufficient)",
  "Limitations": "قيود التقييم (اختياري)",
  "Justification": "الشرح الكامل بالعربية"
}`;


    console.log(`[Evaluation] Sending to OpenAI with model: gpt-4o`);

    // Call OpenAI — response_format: json_object guarantees valid JSON output
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: FIRASAH_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    console.log(`[Evaluation] ✅ OpenAI response received`);

    // Parse response — model returns { "evaluations": [...] }
    const responseText = response.choices[0]?.message?.content?.trim() || '';
    console.log(`[Evaluation] Response length: ${responseText.length} chars`);
    console.log(`[Evaluation] First 300 chars: ${responseText.substring(0, 300)}`);

    // Extract evaluations array from JSON object
    let evaluations: any[] = [];
    try {
      const parsed = JSON.parse(responseText);
      // Accept {"evaluations": [...]} or a bare array
      if (Array.isArray(parsed)) {
        evaluations = parsed;
      } else if (Array.isArray(parsed.evaluations)) {
        evaluations = parsed.evaluations;
      } else {
        // Fallback: look for any array-valued key
        const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        evaluations = arrayKey ? parsed[arrayKey] : [];
      }
    } catch (e) {
      console.error(`[Evaluation] ❌ Failed to parse JSON response:`, (e as any).message);
      console.error(`[Evaluation] Raw response:`, responseText.substring(0, 500));
      return [];
    }

    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      console.error(`[Evaluation] ❌ No evaluations array in response. Keys: ${Object.keys(JSON.parse(responseText) || {}).join(', ')}`);
      return [];
    }

    console.log(`[Evaluation] Parsed ${evaluations.length} evaluation results`);

    // Process evaluations and store evidence
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
          console.warn(`[Evaluation] ⚠️ Skipping evaluation with missing kpi_code`);
          continue;
        }

        // Find KPI in database
        const kpiRecord = allKPIs.find((kpi: any) => kpi.kpi_code.toLowerCase() === kpiCode.toLowerCase());
        if (!kpiRecord) {
          console.warn(`[Evaluation] ⚠️ KPI not found in database: ${kpiCode}`);
          continue;
        }

        // Determine final status based on evidence count and confidence
        const determinedStatus = determineStatus(evidenceCount, confidence);

        // Build result
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
            console.log(`[Evaluation] 💾 Storing evidence for KPI ${kpiCode} (status: ${determinedStatus}, confidence: ${confidence}%, count: ${evidenceCount})`);
            
            // Build detailed evidence text
            let evidence_text = `[${determinedStatus}] Facts: ${facts}`;
            if (interpretation) {
              evidence_text += ` | Interpretation: ${interpretation}`;
            }
            if (limitations) {
              evidence_text += ` | Limitations: ${limitations}`;
            }
            evidence_text += ` | Confidence: ${confidence}%`;
            
            const evidence = await insert('evidences', {
              kpi_id: kpiRecord.kpi_id,
              lecture_id: resolvedLectureId,
              evidence_txt: evidence_text,
              start_time: slotStartTime,
              end_time: slotEndTime,
              created_at: now,
              updated_at: now,
            });
            console.log(`[Evaluation] ✅ Evidence stored: evidence_id=${evidence.evidence_id}, status=${determinedStatus}, timeslot=${slotStartTime?.toLocaleTimeString('ar-SA') ?? 'N/A'}-${slotEndTime?.toLocaleTimeString('ar-SA') ?? 'N/A'}`);
          } catch (err) {
            console.error(`[Evaluation] ⚠️ Failed to store evidence for ${kpiCode}:`, err);
          }
        } else if (determinedStatus === 'Insufficient') {
          console.log(`[Evaluation] ⏭️ Skipping evidence storage for ${kpiCode} (status: Insufficient)`);
        }
      } catch (err) {
        console.error(`[Evaluation] ⚠️ Error processing evaluation:`, err);
        continue;
      }
    }

    console.log(`[Evaluation] ✅ Evaluation complete: ${results.length} KPIs processed, ${results.filter(r => r.status !== 'Insufficient').length} evidence records created`);
    return results;
  } catch (err) {
    console.error(`[Evaluation] ❌ Fatal evaluation error:`, err);
    throw err;
  }
};

/**
 * Get evaluation results for a specific file
 */
export const getEvaluationResults = async (fileId: number) => {
  const query = `
    SELECT
      e.evidence_id as evidence_id,
      e.kpi_id,
      e.lecture_id,
      l.file_id,
      e.evidence_txt,
      TO_CHAR(e.start_time, 'HH24:MI:SS') as start_time,
      TO_CHAR(e.end_time, 'HH24:MI:SS') as end_time,
      e.created_at,
      k.kpi_code,
      k.kpi_name,
      d.domain_code,
      d.domain_name
    FROM evidences e
    JOIN kpis k ON e.kpi_id = k.kpi_id
    LEFT JOIN kpi_domains d ON k.domain_id = d.domain_id
    LEFT JOIN lecture l ON e.lecture_id = l.lecture_id
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

  // Group by domain
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

    // Create a temporary file record for testing
    const tempSoundFile = await insert('sound_files', {
      filename: description || 'test_evaluation.txt',
      filepath: 'test',
      createdBy: 'test',
      note: 'Automatic test evaluation',
    });

    console.log(`[Test Evaluation] Created temp file: ${tempSoundFile.file_id}`);

    // Create a temporary lecture record for testing
    const tempLecture = await insert('lecture', {
      file_id: tempSoundFile.file_id,
      transcript: speechText,
      language: 'ar',
      slot_order: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log(`[Test Evaluation] Created temp lecture: ${tempLecture.lecture_id}`);

    // Run evaluation
    const results = await evaluateSpeechAgainstKPIs(speechText, tempSoundFile.file_id, tempLecture.lecture_id);

    console.log(`[Test Evaluation] Evaluation results: ${results.length} KPIs`);

    return {
      success: true,
      message: 'تم اختبار التقييم بنجاح',
      fileId: tempSoundFile.file_id,
      lectureId: tempLecture.lecture_id,
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
    orderBy = 'date',
    orderDirection = 'DESC',
  } = options;

  try {
    let query = `
      SELECT
        e.evidence_id as evidence_id,
        e.kpi_id,
        e.lecture_id,
        l.file_id,
        e.evidence_txt,
        TO_CHAR(e.start_time, 'HH24:MI:SS') as start_time,
        TO_CHAR(e.end_time, 'HH24:MI:SS') as end_time,
        e.created_at,
        k.kpi_code,
        k.kpi_name,
        d.domain_code,
        d.domain_name,
        s.filename
      FROM evidences e
      JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN kpi_domains d ON k.domain_id = d.domain_id
      LEFT JOIN lecture l ON e.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      WHERE 1=1
    `;

    const params: any[] = [];

    // File ID filter (via lecture join)
    if (fileId) {
      query += ` AND l.file_id = $${params.length + 1}`;
      params.push(fileId);
    }

    // Status filter
    if (status) {
      query += ` AND e.evidence_txt LIKE $${params.length + 1}`;
      params.push(`[${status}]%`);
    }

    // Domain filter
    if (domain) {
      query += ` AND d.domain_code = $${params.length + 1}`;
      params.push(domain);
    }

    // Search filter (in evidence or KPI name)
    if (search) {
      query += ` AND (e.evidence_txt ILIKE $${params.length + 1} OR k.kpi_name ILIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Order by
    const orderByMap: { [key: string]: string } = {
      date: 'e.created_at',
      domain: 'd.domain_code',
      status: 'e.evidence_txt',
    };

    query += ` ORDER BY ${orderByMap[orderBy] || orderByMap.date} ${orderDirection}`;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const results = await getMany(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM evidences e
      JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN kpi_domains d ON k.domain_id = d.domain_id
      LEFT JOIN lecture l ON e.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      WHERE 1=1
    `;

    const countParams: any[] = [];
    if (fileId) {
      countQuery += ` AND l.file_id = $${countParams.length + 1}`;
      countParams.push(fileId);
    }
    if (status) {
      countQuery += ` AND e.evidence_txt LIKE $${countParams.length + 1}`;
      countParams.push(`[${status}]%`);
    }
    if (domain) {
      countQuery += ` AND d.domain_code = $${countParams.length + 1}`;
      countParams.push(domain);
    }
    if (search) {
      countQuery += ` AND (e.evidence_txt ILIKE $${countParams.length + 1} OR k.kpi_name ILIKE $${countParams.length + 2})`;
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

    // Get sound file info
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
          strongCount: evaluation.filter((e: any) => e.evidence_txt?.includes('[Strong]')).length,
          emergingCount: evaluation.filter((e: any) => e.evidence_txt?.includes('[Emerging]')).length,
          limitedCount: evaluation.filter((e: any) => e.evidence_txt?.includes('[Limited]')).length,
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

    // Calculate statistics
    const strongCount = evaluations.filter((e: any) => e.evidence_txt?.includes('[Strong]')).length;
    const emergingCount = evaluations.filter((e: any) => e.evidence_txt?.includes('[Emerging]')).length;
    const limitedCount = evaluations.filter((e: any) => e.evidence_txt?.includes('[Limited]')).length;
    const insufficientCount = evaluations.filter((e: any) => e.evidence_txt?.includes('[Insufficient]')).length;

    // Calculate percentages
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
