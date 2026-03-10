# 🔌 دليل API الشامل - نظام التقييم الآلي

## 📡 الخوادم

```
Backend API:     http://localhost:5000
Frontend:        http://localhost:5173
Dashboard:       http://localhost:5173/evaluations
```

---

## 🧪 Endpoint 1: اختبار التقييم

### معلومات الـ Endpoint
- **الطريقة:** `POST`
- **المسار:** `/api/sound-files/test/evaluate`
- **المصادقة:** اختيارية
- **الحالة:** ✅ تم اختبارها

### Request

```bash
curl -X POST http://localhost:5000/api/sound-files/test/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "السلام عليكم ورحمة الله وبركاته. اليوم سنتعلم موضوع جديد مهم جداً. الهدف من هذا الدرس هو فهم المفاهيم الأساسية.",
    "description": "اختبار التقييم التلقائي"
  }'
```

### Parameters

| المعامل | النوع | مطلوب | الوصف |
|--------|-------|-------|-------|
| `text` | string | ✅ | النص المراد تقييمه (يمكن أن يكون نص مكتوب أو مكتوب من Transcript) |
| `description` | string | ❌ | وصف اختياري للعملية |

### Response (200 OK)

```json
{
  "success": true,
  "message": "تم اختبار التقييم بنجاح",
  "fileId": 45,
  "results": [
    {
      "kpi_id": 1,
      "kpi_code": "1.1",
      "kpi_name": "وضوح الأهداف التعليمية",
      "domain_id": 1,
      "domain_name": "التخطيط والإعداد",
      "evidenceFound": true,
      "status": "Strong",
      "confidence": 85,
      "evidenceCount": 2,
      "justification": "تم تحديد الهدف بوضوح وتم كتابته"
    },
    {
      "kpi_id": 2,
      "kpi_code": "1.2",
      "kpi_name": "المحتوى العلمي الدقيق",
      "domain_id": 1,
      "domain_name": "التخطيط والإعداد",
      "evidenceFound": true,
      "status": "Emerging",
      "confidence": 65,
      "evidenceCount": 1,
      "justification": "تناول الموضوع بشكل عام بدون تفاصيل دقيقة"
    },
    {
      "kpi_id": 3,
      "kpi_code": "2.1",
      "kpi_name": "إدارة الوقت",
      "domain_id": 2,
      "domain_name": "تنفيذ الدرس",
      "evidenceFound": false,
      "status": "Insufficient",
      "confidence": 10,
      "evidenceCount": 0,
      "justification": "لا توجد بيانات كافية عن إدارة الوقت"
    }
  ],
  "timestamp": "2026-03-09T20:33:25Z"
}
```

### الأخطاء المحتملة

**400 Bad Request** - إذا كان النص فارغاً:
```json
{
  "success": false,
  "message": "النص مطلوب"
}
```

---

## 🔍 Endpoint 2: البحث والفلترة

### معلومات الـ Endpoint
- **الطريقة:** `GET`
- **المسار:** `/api/sound-files/evaluations/search`
- **المصادقة:** اختيارية
- **الحالة:** ✅ تم اختبارها

### Request

```bash
# مثال بسيط
curl "http://localhost:5000/api/sound-files/evaluations/search"

# مع معاملات
curl "http://localhost:5000/api/sound-files/evaluations/search?limit=10&offset=0&status=Strong&search=هدف"
```

### Query Parameters

| المعامل | النوع | افتراضي | الوصف |
|--------|-------|---------|-------|
| `limit` | number | 20 | عدد النتائج المطلوبة |
| `offset` | number | 0 | الإزاحة (للـ pagination) |
| `search` | string | - | البحث في النصوص (ILIKE) |
| `status` | string | - | تصفية: Strong, Emerging, Limited, Insufficient |
| `domain` | string | - | تصفية حسب اسم المجال |
| `fileId` | number | - | تصفية حسب معرف الملف |
| `orderBy` | string | date | الترتيب: date, domain, status, confidence |
| `orderDirection` | string | DESC | ترتيب: ASC أو DESC |

### Request Examples

**1. All evaluations with pagination:**
```bash
curl "http://localhost:5000/api/sound-files/evaluations/search?limit=10&offset=0"
```

**2. Search for specific text:**
```bash
curl "http://localhost:5000/api/sound-files/evaluations/search?search=تفاعل&limit=20"
```

**3. Filter by status:**
```bash
curl "http://localhost:5000/api/sound-files/evaluations/search?status=Strong&limit=10"
```

**4. Filter by domain:**
```bash
curl "http://localhost:5000/api/sound-files/evaluations/search?domain=التخطيط&orderBy=confidence&orderDirection=DESC"
```

**5. Filter by file ID:**
```bash
curl "http://localhost:5000/api/sound-files/evaluations/search?fileId=45&limit=20"
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 125,
        "file_id": 45,
        "kpi_id": 1,
        "kpi_code": "1.1",
        "kpi_name": "وضوح الأهداف التعليمية",
        "domain_name": "التخطيط والإعداد",
        "status": "Strong",
        "evidence_text": "[Strong] Facts: تم تحديد الهدف بوضوح | Confidence: 85%",
        "created_at": "2026-03-09T18:45:00Z"
      },
      {
        "id": 126,
        "file_id": 45,
        "kpi_id": 2,
        "kpi_code": "1.2",
        "kpi_name": "المحتوى العلمي الدقيق",
        "domain_name": "التخطيط والإعداد",
        "status": "Emerging",
        "evidence_text": "[Emerging] Facts: تناول الموضوع بشكل عام | Confidence: 65%",
        "created_at": "2026-03-09T18:46:00Z"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 3,
      "pages": 1
    }
  }
}
```

---

## 📥 Endpoint 3: تصدير التقييم

### معلومات الـ Endpoint
- **الطريقة:** `GET`
- **المسار:** `/api/sound-files/:id/evaluation/export`
- **المصادقة:** اختيارية
- **الحالة:** ✅ تم اختبارها
- **النوع:** File Download

### Request

```bash
curl -O "http://localhost:5000/api/sound-files/45/evaluation/export"
# ينزل ملف باسم: evaluation_45_2026-03-09.json
```

### Parameters

| المعامل | النوع | مطلوب | الوصف |
|--------|-------|-------|-------|
| `id` | number | ✅ | معرف الملف الصوتي |

### Response (200 OK)

**Download JSON File with this structure:**
```json
{
  "metadata": {
    "exportDate": "2026-03-09T20:33:25Z",
    "fileName": "lesson.mp3",
    "fileId": 45,
    "fileStatus": "completed"
  },
  "evaluations": [
    {
      "id": 125,
      "kpi_code": "1.1",
      "kpi_name": "وضوح الأهداف التعليمية",
      "domain_name": "التخطيط والإعداد",
      "status": "Strong",
      "evidence": "[Strong] Facts: تم تحديد الهدف | Confidence: 85%",
      "timestamp": "2026-03-09T18:45:00Z"
    }
  ],
  "report": {
    "totalEvaluations": 3,
    "evaluatedKPIs": 3,
    "totalKPIs": 16
  },
  "summary": {
    "strongCount": 2,
    "emergingCount": 1,
    "limitedCount": 0,
    "insufficientCount": 0
  }
}
```

### Headers

```
Content-Type: application/json
Content-Disposition: attachment; filename="evaluation_45_2026-03-09.json"
```

---

## 📊 Endpoint 4: التقرير الشامل

### معلومات الـ Endpoint
- **الطريقة:** `GET`
- **المسار:** `/api/sound-files/:id/evaluation/report/comprehensive`
- **المصادقة:** اختيارية
- **الحالة:** ✅ تم اختبارها

### Request

```bash
curl "http://localhost:5000/api/sound-files/45/evaluation/report/comprehensive"
```

### Parameters

| المعامل | النوع | مطلوب | الوصف |
|--------|-------|-------|-------|
| `id` | number | ✅ | معرف الملف الصوتي |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "fileId": 45,
    "generatedAt": "2026-03-09T20:33:25Z",
    "statistics": {
      "strong": {
        "count": 2,
        "percentage": 67
      },
      "emerging": {
        "count": 1,
        "percentage": 33
      },
      "limited": {
        "count": 0,
        "percentage": 0
      },
      "insufficient": {
        "count": 0,
        "percentage": 0
      },
      "totals": {
        "evaluatedKPIs": 3,
        "totalKPIs": 16,
        "evaluationPercentage": 19
      }
    },
    "domainReport": [
      {
        "domain_id": 1,
        "domain_name": "التخطيط والإعداد",
        "domain_code": "D1",
        "evidenceCount": 2,
        "kpis": [
          {
            "kpi_id": 1,
            "kpi_code": "1.1",
            "kpi_name": "وضوح الأهداف التعليمية",
            "status": "Strong"
          }
        ]
      },
      {
        "domain_id": 2,
        "domain_name": "تنفيذ الدرس",
        "domain_code": "D2",
        "evidenceCount": 1,
        "kpis": [
          {
            "kpi_id": 2,
            "kpi_code": "1.2",
            "kpi_name": "المحتوى العلمي الدقيق",
            "status": "Emerging"
          }
        ]
      }
    ],
    "detailedEvaluations": [
      {
        "rownumber": 1,
        "kpi_code": "1.1",
        "kpi_name": "وضوح الأهداف التعليمية",
        "status": "Strong",
        "evidence_text": "[Strong] Facts: تم تحديد الهدف بوضوح وكتابته على السبورة | Interpretation: وضوح الأهداف التعليمية | Confidence: 85%",
        "domain_name": "التخطيط والإعداد",
        "created_at": "2026-03-09T18:45:00Z"
      }
    ]
  }
}
```

---

## 🧬 بنية Response الكاملة

### Status Codes

```
200 OK              - العملية نجحت
400 Bad Request     - بيانات غير صحيحة
404 Not Found       - الملف غير موجود
500 Server Error    - خطأ في الخادم
```

### الحقول المشتركة

```json
{
  "success": true,      // هل العملية نجحت
  "message": "...",     // رسالة توضيحية
  "data": {...},        // البيانات الرئيسية
  "timestamp": "..."    // وقت العملية
}
```

---

## 🔐 Authentication

**الحالية**: جميع الـ endpoints متاحة بدون مصادقة

**المخطط**: إضافة Bearer Token في المستقبل:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/sound-files/evaluations/search
```

---

## ⚡ Pagination Example

```bash
# الصفحة الأولى
curl "http://localhost:5000/api/sound-files/evaluations/search?limit=10&offset=0"

# الصفحة الثانية
curl "http://localhost:5000/api/sound-files/evaluations/search?limit=10&offset=10"

# الصفحة الثالثة
curl "http://localhost:5000/api/sound-files/evaluations/search?limit=10&offset=20"
```

---

## 🧪 PowerShell Testing

```powershell
# Test Evaluation
$body = @{
    text = "السلام عليكم..."
    description = "اختبار"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/sound-files/test/evaluate" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$response.Content | ConvertFrom-Json | Format-Table


# Search API
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/sound-files/evaluations/search?limit=5" `
    -Method GET

$data = $response.Content | ConvertFrom-Json
$data.data.data | Format-Table


# Comprehensive Report
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/sound-files/45/evaluation/report/comprehensive" `
    -Method GET

$report = $response.Content | ConvertFrom-Json
$report.data.statistics | Format-Table
```

---

## 📋 JavaScript/Fetch Examples

```javascript
// 1. Test Evaluation
async function testEvaluation(text, description) {
  const response = await fetch('http://localhost:5000/api/sound-files/test/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, description })
  });
  const data = await response.json();
  console.log('File ID:', data.fileId);
  console.log('Results:', data.results);
  return data;
}

// 2. Search API
async function searchEvaluations(filters = {}) {
  const params = new URLSearchParams({
    limit: filters.limit || 20,
    offset: filters.offset || 0,
    status: filters.status,
    search: filters.search
  });
  
  const response = await fetch(
    `http://localhost:5000/api/sound-files/evaluations/search?${params}`,
    { method: 'GET' }
  );
  return await response.json();
}

// 3. Get Comprehensive Report
async function getReport(fileId) {
  const response = await fetch(
    `http://localhost:5000/api/sound-files/${fileId}/evaluation/report/comprehensive`,
    { method: 'GET' }
  );
  return await response.json();
}

// 4. Export to JSON
async function exportEvaluation(fileId) {
  const response = await fetch(
    `http://localhost:5000/api/sound-files/${fileId}/evaluation/export`,
    { method: 'GET' }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `evaluation_${fileId}.json`;
  a.click();
}

// Usage
testEvaluation('السلام عليكم ورحمة الله', 'اختبار').then(data => {
  console.log('Test completed:', data.fileId);
});
```

---

## 🎯 حالات الاستخدام الشاملة

### سيناريو 1: تقييم درس جديد
```bash
# 1. أرسل النص
curl -X POST http://localhost:5000/api/sound-files/test/evaluate \
  -H "Content-Type: application/json" \
  -d '{"text": "...", "description": "الدرس 1"}'

# Response: fileId = 46

# 2. احصل على التقرير الشامل
curl http://localhost:5000/api/sound-files/46/evaluation/report/comprehensive

# 3. صدّر النتائج
curl -O http://localhost:5000/api/sound-files/46/evaluation/export
```

### سيناريو 2: البحث عن أفضل الدروس
```bash
curl "http://localhost:5000/api/sound-files/evaluations/search?status=Strong&orderBy=confidence&orderDirection=DESC&limit=10"
```

### سيناريو 3: متابعة معيار معين عبر الوقت
```bash
curl "http://localhost:5000/api/sound-files/evaluations/search?search=1.1&limit=50"
```

---

## ✅ Final Checklist

- ✅ Endpoint 1 (Test Evaluation)
- ✅ Endpoint 2 (Search & Filter)
- ✅ Endpoint 3 (Export JSON)
- ✅ Endpoint 4 (Comprehensive Report)
- ✅ Pagination working
- ✅ Status codes correct
- ✅ Error handling
- ✅ All tested and verified

---

**Version:** 2.0.0  
**Last Updated:** 9 March 2026  
**Status:** ✅ Production Ready
