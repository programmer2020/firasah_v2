# Evidence Extraction System Documentation

## نظام استخراج Evidence من الملفات الصوتية

هذا النظام يستخدم **Detection Signals** من KPIs لاستخراج Evidence تلقائياً من النصوص المحولة من الملفات الصوتية (Transcripts).

## المكونات الرئيسية

### 1. **kpi_detection_signals.json**
- يحتوي على جميع Detection Signals لكل KPI
- مثال:
```json
{
  "1.1a": "Teacher explicitly announces objective at lesson start...",
  "1.1b": "Teacher states what success looks like...",
  ...
}
```

### 2. **backend/evidence_api.py**
- يوفر وحدات للاستخراج التلقائي للـ Evidence
- يدعم:
  - **Keyword Matching**: بحث بسيط عن المفاتيح
  - **Pattern Recognition**: البحث عن أنماط محددة

### 3. **API Endpoint**
```
POST /api/evidences/extract/{lectureId}
```

## كيفية الاستخدام

### الخيار 1: من Frontend (عبر API)
```javascript
// استخراج Evidence من محاضرة معينة
const response = await fetch('/api/evidences/extract/123', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(result);
// {
//   success: true,
//   message: "Evidence extracted successfully",
//   data: {
//     lecture_id: 123,
//     evidence_found: 45,
//     saved: 42,
//     failed: 3,
//     status: "completed"
//   }
// }
```

### الخيار 2: من Python (مباشرة)
```python
from backend.evidence_api import process_lecture_transcript

# استخراج Evidence
result = process_lecture_transcript(lecture_id=123)

print(f"Evidence found: {result['evidence_found']}")
print(f"Evidence saved: {result['saved']}")
```

### الخيار 3: من سطر الأوامر
```bash
cd backend
python evidence_api.py extract 123
```

## كيفية عمل النظام

### المرحلة 1: جلب البيانات
- يتم جلب النص المحول (Transcript) من جدول `lecture`
- يتم جلب جميع KPIs من جدول `kpis`

### المرحلة 2: استخراج Evidence
لكل KPI:
1. **البحث عن الكلمات المفتاحية** من Detection Signals في Transcript
2. **استخراج السياق** (النص المحيط بالكلمة المفتاحية)
3. **حساب درجة الثقة** بناءً على مدى تطابق الكلمات

### المرحلة 3: حفظ في قاعدة البيانات
يتم حفظ Evidence مع:
- `lecture_id`: معرف المحاضرة
- `kpi_id`: معرف الـ KPI المتعلق
- `facts`: النص المستخرج
- `interpretation`: التفسير
- `confidence`: درجة الثقة (0-100)
- `status`: "extracted"

## مثال عملي

### Scenario:
محاضرة بـ ID = 5 مع Transcript التالي:
```
"اليوم سنتعلم عن الكسور. هدفنا اليوم هو فهم كيفية جمع الكسور.
سأشرح لكم الطريقة خطوة بخطوة. انظروا كيف أقوم بحل هذا المثال:
1/2 + 1/4 = 2/4 + 1/4 = 3/4
الآن، لنفعل هذا معاً..."
```

### النتيجة:
```
KPI 1.1a - إعلان هدف الدرس للطلاب:
✓ Evidence: "اليوم سنتعلم عن الكسور. هدفنا اليوم هو فهم كيفية جمع الكسور"
  Confidence: 85%

KPI 2.1a - النمذجة (I Do):
✓ Evidence: "سأشرح لكم الطريقة خطوة بخطوة. انظروا كيف أقوم بحل هذا المثال"
  Confidence: 80%

KPI 2.1b - الممارسة الموجهة (We Do):
✓ Evidence: "الآن، لنفعل هذا معاً"
  Confidence: 75%
```

## Column Descriptions

### Evidence Table Columns
| Column | Type | الوصف |
|--------|------|-------|
| `evidence_id` | INTEGER | معرف فريد لـ Evidence |
| `kpi_id` | INTEGER | معرف الـ KPI المتعلق |
| `lecture_id` | INTEGER | معرف المحاضرة |
| `facts` | TEXT | النص/الحقيقة المستخرجة |
| `interpretation` | TEXT | تفسير Evidenceاتحت لماذا تثبت هذا الـ KPI |
| `confidence` | INTEGER | درجة الثقة (0-100) |
| `status` | VARCHAR | الحالة (extracted, verified, etc.) |
| `iscalculated` | BOOLEAN | هل تم حسابها تلقائياً |
| `created_at` | TIMESTAMP | وقت الإنشاء |
| `updated_at` | TIMESTAMP | آخر تحديث |

## Detection Signals الموجودة الآن

يحتوي النظام على Detection Signals لـ 24 KPI:

### Domain 1: إعداد وتنفيذ خطة التعلم (8 KPIs)
- 1.1a, 1.1b, 1.1c
- 1.2a, 1.2b, 1.2c
- و 2 KPIs أخرى

### Domain 2: تنوع استراتيجيات التدريس (5 KPIs)
- 2.1a, 2.1b
- 2.2, 2.3
- و 1 KPI آخر

### والمزيد...

## ملاحظات مهمة

1. **Quality of Transcript**: كلما كان النص أفضل، كانت النتائج أفضل
2. **Language**: يدعم النصوص بالعربية والإنجليزية
3. **Confidence Scores**: احذر من Evidences منخفضة الثقة
4. **Manual Review**: من الأفضل مراجعة Evidences المستخرجة يدوياً قبل استخدامها

## troubleshooting

### لا يتم استخراج Evidence
- تحقق من وجود Transcript في جدول Lecture
- تحقق من أن kpi_detection_signals.json موجود في مجلد backend

### درجات ثقة منخفضة
- قد يكون النص غير واضح
- قد تحتاج Detection Signals إلى تحديث

## الخطوات التالية

يمكن تحسين النظام بـ:
1. استخدام OpenAI GPT-4 للتحليل الذكي (بدل الكلمات المفتاحية فقط)
2. تحسين الـ Confidence Scores بناءً على معايير أكثر تعقيداً
3. دعم استخراج الفترات الزمنية (start_time, end_time) من Transcript
4. بناء نموذج التصنيف (Classification Model) خاص بنا
