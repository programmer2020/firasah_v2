# Automatic Speech Evaluation Feature - Integration Guide

## Overview

The Firasah AI system now includes **automatic OpenAI-based speech evaluation** that triggers whenever speech text is added to the database. The evaluation system:

- ✅ Processes speech transcriptions against all 16 teaching quality KPIs
- ✅ Uses the "Firasah Supervisor" AI role for consistent evaluation
- ✅ Stores evidence in the database for audit trails
- ✅ Provides API endpoints to retrieve and report evaluation results
- ✅ Works asynchronously in the background without delaying responses

## Architecture

### Data Flow

```
Audio Upload
    ↓
Sound File Created
    ↓
Transcription Processing (OpenAI Whisper)
    ↓
Speech Record Saved
    ↓
[NEW] ASYNC: Automatic KPI Evaluation
    ↓
Evidence Records Created
    ↓
Results Available via API
```

## Key Components

### 1. Evaluation Service (`backend/src/services/evaluationsService.ts`)

**Core Functions:**

```typescript
// Main evaluation function (called automatically on speech save)
export const evaluateSpeechAgainstKPIs = async (
  speechText: string,
  fileId: number,
  startTime?: string,
  endTime?: string
): Promise<EvaluationResult[]>

// Get evaluation results for a file
export const getEvaluationResults = async (fileId: number)

// Generate grouped report by teaching domain
export const generateEvaluationReport = async (fileId: number)
```

**System Prompt:** "Firasah Supervisor" - Specialized in classroom teaching quality evaluation with:
- Evidence-based developmental feedback
- Arabic (Saudi) language output
- Focus on observable classroom interactions only
- Non-judgmental, supportive tone

### 2. Speech Service Integration (`backend/src/services/speechService.ts`)

**Automatic Trigger:**
```typescript
export const saveSpeech = async (
  fileId: number,
  transcript: string,
  language: string,
  duration: number | null,
  timeSlotId: number | null = null,
  slotOrder: number = 0
) => {
  // ... save speech to database ...
  
  // [NEW] Automatically evaluate in background (non-blocking)
  if (transcript && transcript.trim() && transcript !== '[transcription_pending]') {
    setImmediate(async () => {
      try {
        const evaluations = await evaluateSpeechAgainstKPIs(
          transcript,
          fileId,
          undefined,
          undefined
        );
        console.log(`✅ Evaluation complete: ${evaluations.length} evidence records`);
      } catch (evalErr) {
        console.error(`⚠️ Non-blocking evaluation error:`, evalErr);
      }
    });
  }
}
```

### 3. API Routes

#### Get Evaluation Results
```
GET /api/sound-files/:id/evaluation
```

**Response:**
```json
{
  "success": true,
  "message": "Evaluation results retrieved successfully",
  "data": {
    "file_id": 123,
    "filename": "class-recording.mp3",
    "evaluations": [
      {
        "kpi_code": "1.1",
        "kpi_name": "وضوح هدف الدرس",
        "status": "Strong",
        "confidence": 95,
        "evidence_txt": "المعلم بدأ الحصة بتوضيح الهدف..."
      },
      // ... more KPIs ...
    ],
    "summary": {
      "total_kpis_evaluated": 16,
      "evidence_found": 12
    }
  }
}
```

#### Get Evaluation Report by Domain
```
GET /api/sound-files/:id/evaluation/report
```

**Response:**
```json
{
  "success": true,
  "message": "Evaluation report generated successfully",
  "data": {
    "file_id": 123,
    "filename": "class-recording.mp3",
    "domains": {
      "D1": {
        "domain_name": "إعداد وتنفيذ خطة التعلم داخل الحصة",
        "domain_code": "D1",
        "summaryStatus": "Strong",
        "averageConfidence": 92,
        "evaluations": [
          {
            "kpi_code": "1.1",
            "kpi_name": "وضوح هدف الدرس",
            "status": "Strong",
            "confidence": 95
          },
          // ...
        ]
      },
      // ... 7 more domains ...
    }
  }
}
```

## Evaluation Status Levels

The system evaluates each KPI against four status levels:

| Status | Meaning | Evidence | Use Case |
|--------|---------|----------|----------|
| **Strong** | Clear, consistent evidence of this practice | Multiple occurrences or strong indicators | Practice is demonstrated well and regularly |
| **Emerging** | Some evidence but inconsistent or limited | Occasional or partial evidence | Practice is developing but needs consistency |
| **Limited** | Weak evidence or isolated cases only | Very few or questionable indicators | Practice is minimally present |
| **Insufficient** | No evidence in the text | Zero indicators found | Practice not demonstrated in this recording |

## Database Schema

### Evidence Table Extension
```sql
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS confidence INTEGER DEFAULT 0;
```

### What Gets Stored
- `evidence_id`: Unique identifier
- `kpi_id`: Links to the specific KPI (1-16)
- `file_id`: Links to the audio recording
- `evidence_txt`: Arabic justification from OpenAI
- `status`: Strong/Emerging/Limited/Insufficient
- `confidence`: 0-100 confidence score
- `created_at`: When evidence was recorded

## Usage Examples

### Example 1: Upload Audio and Get Evaluation
```bash
# 1. Upload audio
curl -X POST http://localhost:5000/api/sound-files \
  -F "file=@classroom-recording.mp3" \
  -F "created_by=teacher01"

# Response: { "data": { "file_id": 123, ... } }

# 2. Wait for transcription to complete (check progress)

# 3. Get evaluation results
curl http://localhost:5000/api/sound-files/123/evaluation

# 4. Get domain-grouped report
curl http://localhost:5000/api/sound-files/123/evaluation/report
```

### Example 2: Direct Speech Entry
```typescript
// In speech service, when saveSpeech is called:
const speechRecord = await saveSpeech(
  fileId,        // Audio file ID
  transcript,    // Arabic speech text
  'ar',          // Language
  duration,      // Segment duration
  timeSlotId,    // Class schedule slot
  slotOrder      // Segment order
);

// ✅ Automatically:
// 1. Speech is saved to database
// 2. Evaluation starts asynchronously
// 3. OpenAI analyzes against all 16 KPIs
// 4. Evidence records are created
// 5. Response sent immediately (non-blocking)
```

## System Prompt Details

### Firasah Supervisor Principles
```
دورك: تحليل نصوص الحوار الصفي وتقييمها مقابل معايير الأداء التدريسي

مبادئ التقويم:
1. التركيز على الأدلة الصفية فقط - قيّم فقط ما يظهر في النص
2. منهج تنموي - تقديم تغذية راجعة للتطوير، وليس للحكم الختامي
3. الانضباط في الأدلة - كل ملاحظة يجب أن يكون لها دليل واضح
4. العدل والتفسير - اعتبر السياق الكامل
5. الإيجابية - ركز على نقاط القوة والفرص للتحسين
```

## The 16 Teaching Quality KPIs

### Domain 1: Planning & Execution (2 KPIs)
- 1.1: وضوح هدف الدرس ومعيار النجاح
- 1.2: تسلسل الدرس وإيقاعه وإدارة الوقت

### Domain 2: Teaching Strategies (3 KPIs)
- 2.1: تنوع استراتيجيات التدريس (الالتقاء مع أنماط تعلم مختلفة)
- 2.2: دعم المتعلمين ذوي الاحتياجات الخاصة
- 2.3: أنشطة تعاونية وتفاعلية

### Domain 3: Learning Environment (2 KPIs)
- 3.1: بيئة فيزيائية آمنة ومنظمة ومشجعة
- 3.2: مناخ نفسي آمن وداعم للمتعلمين

### Domain 4: Classroom Management (2 KPIs)
- 4.1: وضوح التوقعات والقوانين والروتينات
- 4.2: إدارة سلوك المتعلمين بعدالة واحترام

### Domain 5: Assessment Variety (2 KPIs)
- 5.1: تنوع أساليب التقويم البديل والتقويم المستمر
- 5.2: استخدام نتائج التقويم بشكل فعال

### Domain 6: Analysis & Diagnosis (2 KPIs)
- 6.1: تحليل مشاركات الطلاب وتشخيص مستوياتهم
- 6.2: توفير تغذية راجعة فعالة لتقدم المتعلمين

### Domain 7: Technology Integration (2 KPIs)
- 7.1: توظيف تقنيات ووسائل التعلم المناسبة
- 7.2: استخدام البيانات والرصد الإلكتروني

### Domain 8: Learning Outcomes (2 KPIs)
- 8.1: تحسين نتائج المتعلمين الأكاديمية
- 8.2: تطور المهارات الحياتية والشخصية للمتعلمين

## Logs & Monitoring

### What Gets Logged

```
[Speech] ✅ Speech saved successfully: id=456, file_id=123
[Evaluation] 🔄 Starting automatic KPI evaluation for file_id=123...
[Evaluation] Retrieved 16 KPIs for evaluation
[Evaluation] Sending to OpenAI with model: gpt-4o-mini
[Evaluation] ✅ OpenAI response received
[Evaluation] Parsed 16 evaluation results
[Evaluation] 💾 Storing evidence for KPI 1.1 (status: Strong)
[Evaluation] ✅ Evidence stored: evidence_id=789
[Evaluation] ✅ Completed: Evaluated against all KPIs, found 12 evidence records
```

### Troubleshooting

**Issue:** Evaluation not starting
- Check logs for `[Evaluation]` messages
- Verify OpenAI API key is set: `echo $env:OPENAI_API_KEY`
- Ensure transcript is not empty or placeholder text

**Issue:** Evidence not storing
- Check database connection
- Verify `evidences` table has `status` and `confidence` columns
- Look for error messages in backend logs

**Issue:** Slow evaluation
- OpenAI API calls typically take 5-15 seconds
- Evaluation runs asynchronously, doesn't block responses
- Check OpenAI API status if delays exceed normal range

## Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
# (Uses defaults if not set)
```

### Database Requirements
```sql
-- Make sure evidences table has these columns:
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS confidence INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidences_file_id ON evidences(file_id);
CREATE INDEX IF NOT EXISTS idx_evidences_status ON evidences(status);
```

## Performance Notes

- **Response Time:** API responses are immediate (evaluation runs in background)
- **Evaluation Time:** 5-15 seconds per recording (depends on OpenAI API)
- **Storage:** ~500 bytes per evidence record
- **Concurrency:** Can handle multiple simultaneous uploads
- **Cost:** Uses OpenAI gpt-4o-mini (cost-optimized for bulk evaluation)

## Next Steps

1. **Test with Sample Recording:**
   ```bash
   curl -X POST http://localhost:5000/api/sound-files \
     -F "file=@test-recording.mp3" \
     -F "created_by=test_teacher"
   ```

2. **Monitor Evaluation Progress:**
   - Check backend logs for `[Evaluation]` markers
   - Query `/api/sound-files/{id}/evaluation` after 20-30 seconds

3. **Integrate into Frontend:**
   - Add evaluation panel to recording details
   - Display domain report dashboard
   - Show evidence with timestamps

4. **Add Webhooks (Future):**
   - Notify when evaluation completes
   - Trigger alerts for low-confidence areas
   - Send reports to teachers

## API Contract

All responses follow this structure:
```json
{
  "success": true|false,
  "message": "Descriptive message",
  "data": { /* response data */ },
  "error": { /* error details if success: false */ }
}
```

HTTP Status Codes:
- `200`: Successfully retrieved data
- `400`: Invalid request (bad file ID, etc.)
- `404`: Resource not found
- `500`: Server error

---

**Version:** 2.0.0  
**Last Updated:** 2025-01-09  
**Status:** ✅ Production Ready
