/**
 * Evaluations Service
 * Handles CRUD operations for lecture_kpi records
 * Also includes automatic KPI-based speech evaluation using OpenAI
 */

import OpenAI from 'openai';
import { getOne, getMany, insert, update, deleteRecord } from '../helpers/database.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

function computeScore(
  avgConfidence: number | null | undefined,
  evidenceCount: number | null | undefined
): number {
  const normalizedAverage = Math.min(100, Math.max(0, Number(avgConfidence) || 0));
  const normalizedEvidenceCount = Math.max(0, Number(evidenceCount) || 0);
  return Math.min(Number((normalizedAverage + (normalizedEvidenceCount * 2)).toFixed(2)), 100);
}

/**
 * Get all lecture_kpi records
 */
export const getAllEvaluations = async () => {
  try {
    const query = `
      SELECT
        lk.lecture_id,
        lk.kpi_id,
        lk.evidence_count,
        lk.avg_confidence,
        lk.score,
        lk.mark,
        lk.created_at,
        lk.updated_at,
        k.kpi_name,
        l.file_id,
        s.filename
      FROM lecture_kpi lk
      LEFT JOIN kpis k ON lk.kpi_id = k.kpi_id
      LEFT JOIN lecture l ON lk.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      ORDER BY lk.created_at DESC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching lecture_kpi records:', error);
    throw error;
  }
};

/**
 * Get lecture_kpi by lecture_id and kpi_id
 */
export const getEvaluationByLectureAndKPI = async (lectureId: number, kpiId: number) => {
  try {
    const query = `
      SELECT
        lk.lecture_id,
        lk.kpi_id,
        lk.evidence_count,
        lk.avg_confidence,
        lk.score,
        lk.mark,
        lk.created_at,
        lk.updated_at,
        k.kpi_name,
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
    console.error('Error fetching lecture_kpi record:', error);
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
    const avgConfidence = Math.min(100, Math.max(0, Number(data.avg_confidence) || 0));
    return await insert('lecture_kpi', {
      lecture_id: data.lecture_id,
      kpi_id: data.kpi_id,
      evidence_count: evidenceCount,
      avg_confidence: avgConfidence,
      score: computeScore(avgConfidence, evidenceCount),
      mark: computeMark(evidenceCount),
    });
  } catch (error) {
    console.error('Error creating lecture_kpi record:', error);
    throw error;
  }
};

/**
 * Update a lecture_kpi record
 */
export const updateEvaluation = async (lectureId: number, kpiId: number, data: Partial<LectureKPI>) => {
  try {
    const updateData: Record<string, any> = {};

    if (data.evidence_count !== undefined) {
      updateData.evidence_count = data.evidence_count;
    }
    if (data.avg_confidence !== undefined) {
      updateData.avg_confidence = Math.min(100, Math.max(0, Number(data.avg_confidence) || 0));
    }
    if (updateData.evidence_count !== undefined || updateData.avg_confidence !== undefined) {
      const existing = await getEvaluationByLectureAndKPI(lectureId, kpiId);
      if (!existing) {
        throw new Error('lecture_kpi record not found');
      }

      const nextEvidenceCount = updateData.evidence_count ?? existing.evidence_count ?? 0;
      const nextAvgConfidence = updateData.avg_confidence ?? existing.avg_confidence ?? 0;
      updateData.score = computeScore(nextAvgConfidence, nextEvidenceCount);
      updateData.mark = computeMark(nextEvidenceCount);
    } else if (data.mark !== undefined) {
      updateData.mark = data.mark;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    updateData.updated_at = new Date();
    return await update('lecture_kpi', updateData, 'lecture_id = $1 AND kpi_id = $2', [lectureId, kpiId]);
  } catch (error) {
    console.error('Error updating lecture_kpi record:', error);
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
    console.error('Error deleting lecture_kpi record:', error);
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
        lk.evidence_count,
        lk.avg_confidence,
        lk.score,
        lk.mark,
        lk.created_at,
        lk.updated_at,
        k.kpi_name,
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
    console.error('Error fetching lecture_kpi by KPI:', error);
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
        lk.evidence_count,
        lk.avg_confidence,
        lk.score,
        lk.mark,
        lk.created_at,
        lk.updated_at,
        k.kpi_name,
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
    console.error('Error fetching lecture_kpi by lecture:', error);
    throw error;
  }
};

/**
 * --- AUTOMATIC KPI EVALUATION FUNCTIONS ---
 * Used for real-time speech evaluation against teaching quality standards
 */

/**
 * Status levels for KPI evaluation
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
  facts?: string;
  interpretation?: string;
  limitations?: string;
  evidenceCount?: number;
}

/**
 * Get all KPIs for evaluation
 */
const getAllKPIsForEvaluation = async () => {
  const query = `
    SELECT
      k.kpi_id,
      k.kpi_code,
      k.kpi_name,
      k.kpi_description,
      d.domain_code,
      d.domain_name
    FROM kpis k
    LEFT JOIN domains d ON k.domain_id = d.domain_id
    ORDER BY d.sort_order ASC, k.kpi_code ASC
  `;
  return await getMany(query);
};

/**
 * Main evaluation function - evaluates speech text against all KPIs
 */
export const evaluateSpeechAgainstKPIs = async (
  speechText: string,
  fileId: number,
  startTime?: string,
  endTime?: string
): Promise<EvaluationResult[]> => {
  try {
    console.log(`[Evaluation] Starting evaluation for file_id=${fileId}, text_length=${speechText.length}`);

    // Get timeslot information for this file (time only, no date)
    let slotStartTime: string | null = null;
    let slotEndTime: string | null = null;

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
        slotStartTime = speechRecord.start_time;
        slotEndTime = speechRecord.end_time;
        console.log(`[Evaluation] 📅 Timeslot from schedule: ${slotStartTime} - ${slotEndTime}`);
      }
    } catch (err) {
      console.warn(`[Evaluation] ⚠️ Could not fetch timeslot from lecture table:`, err);
    }

    // Fallback: use file upload time + duration
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
          const startDate = new Date(fileRecord.created_at);
          const durationSecs = Math.round(Number(fileRecord.total_duration) || 0);
          const endDate = new Date(startDate.getTime() + durationSecs * 1000);
          slotStartTime = startDate.toTimeString().split(' ')[0];
          slotEndTime = endDate.toTimeString().split(' ')[0];
          console.log(`[Evaluation] 📅 Timeslot from file upload: ${slotStartTime} - ${slotEndTime} (${durationSecs}s)`);
        }
      } catch (err) {
        console.warn(`[Evaluation] ⚠️ Could not fetch file upload time:`, err);
      }
    }

    // Get all KPIs for reference
    const allKPIs = await getAllKPIsForEvaluation();
    console.log(`[Evaluation] Retrieved ${allKPIs.length} KPIs for evaluation`);

    if (allKPIs.length === 0) {
      console.warn('[Evaluation] No KPIs found in database');
      return [];
    }

    // Get lecture_id for this file
    const lectureRecord = await getOne('SELECT lecture_id FROM lecture WHERE file_id = $1 LIMIT 1', [fileId]);
    const lectureId = lectureRecord?.lecture_id;

    // Build KPI descriptions for the prompt
    const kpiDescriptions = allKPIs
      .map((kpi: any) => `- ${kpi.kpi_code}: ${kpi.kpi_name}${kpi.kpi_description ? ' - ' + kpi.kpi_description : ''}`)
      .join('\n');

    const evaluationPrompt = `You are an expert educational evaluator analyzing Arabic teaching transcripts.

Evaluate the following transcript against these Key Performance Indicators (KPIs):

${kpiDescriptions}

TRANSCRIPT:
"${speechText.substring(0, 8000)}"

For EACH KPI, determine if there is evidence in the transcript. Respond in JSON format:
{
  "evaluations": [
    {
      "kpi_code": "KPI code",
      "evidence_found": true/false,
      "status": "Strong|Emerging|Limited|Insufficient",
      "confidence": 0-100,
      "facts": "Specific evidence found in Arabic",
      "interpretation": "How the evidence relates to the KPI in Arabic",
      "limitations": "Any limitations of the evidence in Arabic (optional)"
    }
  ]
}

Rules:
- "Strong": Multiple clear, direct evidence (confidence >= 70%)
- "Emerging": Some evidence, partially demonstrated (confidence 40-69%)
- "Limited": Minimal or indirect evidence (confidence 20-39%)
- "Insufficient": No meaningful evidence found (confidence < 20%)
- Write facts, interpretation, and limitations in Arabic
- Be thorough but fair in your assessment`;

    console.log(`[Evaluation] Sending to OpenAI...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an educational evaluation expert. Always respond in valid JSON.' },
        { role: 'user', content: evaluationPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log(`[Evaluation] OpenAI response received, parsing...`);
    const parsed = JSON.parse(content);
    const evaluations = parsed.evaluations || [];

    console.log(`[Evaluation] Parsed ${evaluations.length} KPI evaluations`);

    const results: EvaluationResult[] = [];
    const now = new Date();

    for (const evalItem of evaluations) {
      try {
        const kpiCode = evalItem.kpi_code;
        const kpiRecord = allKPIs.find((k: any) => k.kpi_code === kpiCode);

        if (!kpiRecord) {
          console.warn(`[Evaluation] Unknown KPI code: ${kpiCode}`);
          continue;
        }

        const evidenceFound = evalItem.evidence_found === true;
        const confidence = Math.min(100, Math.max(0, Number(evalItem.confidence) || 0));
        const facts = evalItem.facts || '';
        const interpretation = evalItem.interpretation || '';
        const limitations = evalItem.limitations || '';

        // Determine status
        let determinedStatus: EvaluationStatus;
        if (confidence >= 70 && evidenceFound) {
          determinedStatus = 'Strong';
        } else if (confidence >= 40 && evidenceFound) {
          determinedStatus = 'Emerging';
        } else if (confidence >= 20 && evidenceFound) {
          determinedStatus = 'Limited';
        } else {
          determinedStatus = 'Insufficient';
        }

        // Count existing evidence for this KPI
        const evidenceCount = evidenceFound ? 1 : 0;

        results.push({
          kpi_code: kpiCode,
          kpi_id: kpiRecord.kpi_id,
          evidenceFound,
          status: determinedStatus,
          confidence,
          facts,
          interpretation,
          limitations,
          evidenceCount,
        });

        // Store evidence if status is not Insufficient
        if (determinedStatus !== 'Insufficient' && facts) {
          try {
            console.log(`[Evaluation] 💾 Storing evidence for KPI ${kpiCode} (status: ${determinedStatus}, confidence: ${confidence}%, count: ${evidenceCount})`);

            const evidence = await insert('evidences', {
              kpi_id: kpiRecord.kpi_id,
              lecture_id: lectureId || null,
              status: determinedStatus,
              facts: facts,
              interpretation: interpretation || null,
              limitations: limitations || null,
              confidence: confidence,
              start_time: slotStartTime,
              end_time: slotEndTime,
              created_at: now,
              updated_at: now,
            });
            console.log(`[Evaluation] ✅ Evidence stored: evidence_id=${evidence.evidence_id}, status=${determinedStatus}, timeslot=${slotStartTime ?? 'N/A'}-${slotEndTime ?? 'N/A'}`);
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

    console.log(`[Evaluation] Completed: ${results.length} KPIs evaluated`);
    return results;
  } catch (err) {
    console.error(`[Evaluation] Error:`, err);
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
    JOIN kpis k ON e.kpi_id = k.kpi_id
    LEFT JOIN domains d ON k.domain_id = d.domain_id
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

    // Run evaluation
    const results = await evaluateSpeechAgainstKPIs(speechText, tempSoundFile.file_id);

    console.log(`[Test Evaluation] Evaluation results: ${results.length} KPIs`);

    return {
      success: true,
      message: 'تم اختبار التقييم بنجاح',
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
      JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN domains d ON k.domain_id = d.domain_id
      LEFT JOIN lecture l ON e.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
      WHERE 1=1
    `;

    const params: any[] = [];

    // File ID filter (via lecture)
    if (fileId) {
      query += ` AND l.file_id = $${params.length + 1}`;
      params.push(fileId);
    }

    // Lecture ID filter
    if (lectureId) {
      query += ` AND e.lecture_id = $${params.length + 1}`;
      params.push(lectureId);
    }

    // Status filter
    if (status) {
      query += ` AND e.status = $${params.length + 1}`;
      params.push(status);
    }

    // Domain filter
    if (domain) {
      query += ` AND d.domain_code = $${params.length + 1}`;
      params.push(domain);
    }

    // Search filter
    if (search) {
      query += ` AND (e.facts ILIKE $${params.length + 1} OR e.interpretation ILIKE $${params.length + 2} OR k.kpi_name ILIKE $${params.length + 3})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Order by
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
      JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN domains d ON k.domain_id = d.domain_id
      LEFT JOIN lecture l ON e.lecture_id = l.lecture_id
      LEFT JOIN sound_files s ON l.file_id = s.file_id
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
      countQuery += ` AND (e.facts ILIKE $${countParams.length + 1} OR e.interpretation ILIKE $${countParams.length + 2} OR k.kpi_name ILIKE $${countParams.length + 3})`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

    // Calculate statistics
    const strongCount = evaluations.filter((e: any) => e.status === 'Strong').length;
    const emergingCount = evaluations.filter((e: any) => e.status === 'Emerging').length;
    const limitedCount = evaluations.filter((e: any) => e.status === 'Limited').length;
    const insufficientCount = evaluations.filter((e: any) => e.status === 'Insufficient').length;

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
