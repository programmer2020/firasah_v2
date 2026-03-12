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
  id?: number;
  file_id: number;
  kpi_id: number;
  evidence_count?: number;
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
 * Get all evaluations
 * @returns Promise with array of evaluations
 */
export const getAllEvaluations = async () => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.file_id, 
        e.kpi_id, 
        e.evidence_count, 
        e.mark, 
        e.created_at,
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
        e.id, 
        e.file_id, 
        e.kpi_id, 
        e.evidence_count, 
        e.mark, 
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.id = $1
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
    return await insert('evaluations', {
      file_id: data.file_id,
      kpi_id: data.kpi_id,
      evidence_count: evidenceCount,
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
      updateData.mark = computeMark(data.evidence_count);
    } else if (data.mark !== undefined) {
      updateData.mark = data.mark;
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    return await update('evaluations', updateData, 'id = $1', [evaluationId]);
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
    return await deleteRecord('evaluations', 'id = $1', [evaluationId]);
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
        e.id, 
        e.file_id, 
        e.kpi_id, 
        e.evidence_count, 
        e.mark, 
        e.created_at,
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
        e.id, 
        e.file_id, 
        e.kpi_id, 
        e.evidence_count, 
        e.mark, 
        e.created_at,
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
1. **التركيز على الأدلة الصفية فقط**: قيّم فقط ما يظهر في النص المقدم من الحوار الفعلي داخل الحصة.
2. **منهج تنموي**: الهدف تقديم تغذية راجعة لتطوير الأداء، وليس للحكم الختامي.
3. **الانضباط في الأدلة**: يجب أن يكون لكل ملاحظة أدلة واضحة من النص. تجنب الافتراضات أو الاستنتاجات غير المدعومة.
4. **العدل والتفسير**: اعتبر السياق الكامل. اختلاف الأسلوب ليس نقصاً.
5. **الإيجابية**: ركز على نقاط القوة والفرص للتحسين.

**معايير الحالة (Status Levels):**

🟢 **Strong (قوي)**
   - ✅ أدلة متعددة ومستقلة (2-3 على الأقل)
   - ✅ نمط واضح ومتسق متكرر
   - ✅ بيانات موثوقة من النص مباشرة
   - ✅ ثقة عالية جداً (75-100%)

🟡 **Emerging (ناشئ)**
   - ⚠️ بعض الأدلة (دليل واحد أو أكثر لكن ضعيف)
   - ⚠️ نمط غير متسق - يظهر أحياناً لكن ليس دائماً
   - ⚠️ بيانات جزئية أو غير مكتملة
   - ⚠️ ثقة متوسطة (50-75%)

🔴 **Limited (محدود)**
   - ❌ شواهد ضعيفة جداً أو غير مباشرة
   - ❌ دليل واحد فقط وضعيف
   - ❌ قد يكون بسبب جودة النص أو غموضه
   - ❌ ثقة منخفضة (25-50%)

⚪ **Insufficient (غير كافي)**
   - ⛔ لا توجد شواهد موثوقة على الإطلاق
   - ⛔ غياب كامل للدليل في النص
   - ⛔ لا يمكن تقييم هذا المعيار
   - ⛔ ثقة منخفضة جداً (0-25%)

**اللغة والمخرجات:**
- أجب باللغة العربية (السعودية)
- قدم تقييماً واقعياً بدون تضخيم أو تقليل
- كل تقييم يجب أن يحتوي على:
  • kpi_code: كود المعيار
  • Evidence Found: true/false
  • Status: Strong/Emerging/Limited/Insufficient
  • Confidence: 0-100 حسب قوة الأدلة
  • Evidence Count: عدد الأدلة المستقلة من النص
  • Facts: 1-2 جملة توصيفية مباشرة من النص WITHOUT استنتاجات
  • Interpretation: جملة واحدة عن المعنى (فقط إذا Status ≠ Insufficient)
  • Limitations: جملة واحدة عن قيود التقييم إن وجدت
  • Justification: الشرح الكامل بالعربية`;

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
 */
export const evaluateSpeechAgainstKPIs = async (
  speechText: string,
  fileId: number,
  startTime?: string,
  endTime?: string
): Promise<EvaluationResult[]> => {
  try {
    console.log(`[Evaluation] Starting evaluation for file_id=${fileId}, text_length=${speechText.length}`);

    // Get timeslot information for this file
    let slotStartTime: Date | null = null;
    let slotEndTime: Date | null = null;
    
    try {
      const speechQuery = `
        SELECT s.time_slot_id, ts.start_time, ts.end_time
        FROM speech s
        LEFT JOIN section_time_slots ts ON s.time_slot_id = ts.time_slot_id
        WHERE s.file_id = $1
        LIMIT 1
      `;
      const speechRecord = await getOne(speechQuery, [fileId]);
      if (speechRecord && speechRecord.start_time && speechRecord.end_time) {
        // Convert TIME values to TIMESTAMP format (today's date + time)
        const today = new Date();
        const timeStart = speechRecord.start_time; // Format: "HH:MM:SS"
        const timeEnd = speechRecord.end_time;     // Format: "HH:MM:SS"
        
        // Parse time strings and create timestamps
        const [startHours, startMins, startSecs] = timeStart.split(':').map(Number);
        const [endHours, endMins, endSecs] = timeEnd.split(':').map(Number);
        
        slotStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHours, startMins, startSecs);
        slotEndTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHours, endMins, endSecs);
        
        console.log(`[Evaluation] 📅 Found timeslot for file_id=${fileId}: ${slotStartTime.toISOString()} - ${slotEndTime.toISOString()}`);
      }
    } catch (err) {
      console.warn(`[Evaluation] ⚠️ Could not fetch timeslot info for file_id=${fileId}:`, err);
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

    // Build user prompt
    const userPrompt = `قيّم نص الحوار الصفي التالي مقابل معايير الأداء التدريسي:

**معايير التقويم:**
${kpiReference}

**نص الحوار الصفي:**
"${speechText}"

**المطلوب:**
قيّم كل معيار بناءً على ما يظهر في النص فقط. أرسل الإجابة فقط بصيغة JSON (مصفوفة من الكائنات)، بدون أي نص إضافي.

كل كائن JSON يجب أن يحتوي على:
{
  "kpi_code": "رمز المعيار (مثل 1.1)",
  "Evidence Found": true أو false,
  "Status": "Strong" أو "Emerging" أو "Limited" أو "Insufficient",
  "Confidence": عدد من 0-100 يعكس قوة الأدلة,
  "Evidence Count": عدد الأدلة المستقلة التي عثرت عليها (0-3),
  "Facts": "وصف موضوعي مباشر من النص 1-2 جملة فقط، بدون استنتاج",
  "Interpretation": "معنى هذه الحقائق في جملة واحدة (فقط إذا كان Status ≠ Insufficient)",
  "Limitations": "أي قيود على هذا التقييم (اختياري)",
  "Justification": "الشرح الكامل بالعربية مع أمثلة من النص"
}

**مثال:**
{
  "kpi_code": "1.1",
  "Evidence Found": true,
  "Status": "Strong",
  "Confidence": 85,
  "Evidence Count": 2,
  "Facts": "المعلم قال في البداية: 'اليوم سنتعلم...' وكتب الهدف على السبورة",
  "Interpretation": "هذا يشير إلى وضوح الأهداف التعليمية وتواصلها للطلاب",
  "Limitations": "التسجيل لا يشمل حوار الطلاب",
  "Justification": "شاهد 1: في الدقيقة 2:00 نص المعلم: 'الهدف...' - شاهد 2: الهدف المكتوب على السبورة"
}`;


    console.log(`[Evaluation] Sending to OpenAI with model: gpt-4o-mini`);

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      temperature: 0.7,
      max_tokens: 3000,
    });

    console.log(`[Evaluation] ✅ OpenAI response received`);

    // Parse response
    const responseText = response.choices[0]?.message?.content?.trim() || '';
    console.log(`[Evaluation] Response length: ${responseText.length} chars`);
    console.log(`[Evaluation] First 300 chars: ${responseText.substring(0, 300)}`);

    // Try to extract JSON from response
    let evaluations: any[] = [];
    try {
      evaluations = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          evaluations = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error(`[Evaluation] ❌ Failed to parse extracted JSON:`, (e2 as any).message);
          return [];
        }
      } else {
        console.error(`[Evaluation] ❌ Could not find JSON in response:`, responseText.substring(0, 500));
        return [];
      }
    }

    if (!Array.isArray(evaluations)) {
      console.error(`[Evaluation] ❌ Response is not an array:`, typeof evaluations);
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
              file_id: fileId,
              evidence_txt: evidence_text,
              start_time: slotStartTime,
              end_time: slotEndTime,
              created_at: now,
              updated_at: now,
            });
            console.log(`[Evaluation] ✅ Evidence stored: evidence_id=${evidence.id}, status=${determinedStatus}, timeslot=${slotStartTime?.toLocaleTimeString('ar-SA') ?? 'N/A'}-${slotEndTime?.toLocaleTimeString('ar-SA') ?? 'N/A'}`);
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
      e.id as evidence_id,
      e.kpi_id,
      e.file_id,
      e.evidence_txt,
      e.start_time,
      e.end_time,
      e.created_at,
      k.kpi_code,
      k.kpi_name,
      d.domain_code,
      d.domain_name
    FROM evidences e
    JOIN kpis k ON e.kpi_id = k.kpi_id
    LEFT JOIN kpi_domains d ON k.domain_id = d.domain_id
    WHERE e.file_id = $1
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
        e.id as evidence_id,
        e.kpi_id,
        e.file_id,
        e.evidence_txt,
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
      LEFT JOIN kpi_domains d ON k.domain_id = d.domain_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE 1=1
    `;

    const params: any[] = [];

    // File ID filter
    if (fileId) {
      query += ` AND e.file_id = $${params.length + 1}`;
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
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE 1=1
    `;

    const countParams: any[] = [];
    if (fileId) {
      countQuery += ` AND e.file_id = $${countParams.length + 1}`;
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
