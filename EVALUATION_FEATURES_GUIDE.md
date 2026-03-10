# 📊 نظام التقييم الآلي FiraS ah v2.0

## ✨ الميزات الجديدة (الـ 4 خيارات)

### 1️⃣ **اختبار التقييم التلقائي** ✅
إمكانية اختبار التقييم على أي نص مباشرة دون الحاجة لرفع ملف صوتي.

**الـ Endpoint:**
```bash
POST /api/sound-files/test/evaluate
Content-Type: application/json

{
  "text": "السلام عليكم ورحمة الله. اليوم سنتعلم عن...",
  "description": "اختبار التقييم"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "message": "تم اختبار التقييم بنجاح",
  "fileId": 45,
  "results": [
    {
      "kpi_code": "1.1",
      "kpi_id": 1,
      "evidenceFound": true,
      "status": "Strong",
      "confidence": 85,
      "evidenceCount": 2,
      "justification": "شاهد 1: ... شاهد 2: ..."
    }
  ]
}
```

---

### 2️⃣ **Dashboard التقييمات** ✅
صفحة بصرية متقدمة لعرض التقييمات مع إحصائيات وفلاتر:

**المسار:**
```
http://localhost:5173/evaluations
```

**المميزات:**
- 📊 **إحصائيات فورية** - عرض عدد التقييمات حسب الحالة (Strong/Emerging/Limited/Insufficient)
- 🔍 **بحث متقدم** - البحث في النصوص والمعايير
- 🎯 **فلاتر ديناميكية** - تصفية حسب الحالة والمجال
- 📄 **عرض التقرير** - تقسيم التقييمات حسب المجالات
- 📱 **تصميم مستجيب** - يعمل على جميع الأجهزة
- ⏭️ **Pagination** - تصفح النتائج بسهولة

---

### 3️⃣ **التصدير والتقارير** ✅

#### أ) تصدير إلى JSON:
```bash
GET /api/sound-files/:id/evaluation/export

# مثال:
GET /api/sound-files/45/evaluation/export
```

**يتم تحميل ملف JSON يحتوي على:**
```json
{
  "metadata": {
    "exportDate": "2026-03-09T20:33:25Z",
    "fileName": "lesson.mp3",
    "fileId": 45
  },
  "evaluations": [...],
  "report": {...},
  "summary": {
    "totalEvidences": 3,
    "strongCount": 2,
    "emergingCount": 1,
    "limitedCount": 0
  }
}
```

#### ب) التقرير الشامل:
```bash
GET /api/sound-files/:id/evaluation/report/comprehensive

# مثال:
GET /api/sound-files/45/evaluation/report/comprehensive
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "fileId": 45,
    "generatedAt": "2026-03-09T20:33:25Z",
    "statistics": {
      "strong": { "count": 2, "percentage": 67 },
      "emerging": { "count": 1, "percentage": 33 },
      "limited": { "count": 0, "percentage": 0 },
      "insufficient": { "count": 0, "percentage": 0 },
      "totals": {
        "evaluatedKPIs": 3,
        "totalKPIs": 3
      }
    },
    "domainReport": {...},
    "detailedEvaluations": [...]
  }
}
```

---

### 4️⃣ **تحسين الـ API** ✅

#### البحث والفلترة مع Pagination:

```bash
GET /api/sound-files/evaluations/search?params
```

**المعاملات:**
```
limit          - عدد النتائج (افتراضي: 20)
offset         - الإزاحة (للـ pagination)
search         - البحث في النصوص والمعايير
status         - تصفية حسب الحالة (Strong/Emerging/Limited/Insufficient)
domain         - تصفية حسب المجال
fileId         - تصفية حسب ملف معين
orderBy        - ترتيب النتائج (date/domain/status)
orderDirection - ترتيب تصاعد/تنازل (ASC/DESC)
```

**أمثلة:**

```bash
# البحث عن "تفاعل" مع Strong status
GET /api/sound-files/evaluations/search?search=تفاعل&status=Strong&limit=10

# جميع التقييمات للملف 45 مع الترتيب حسب المجال
GET /api/sound-files/evaluations/search?fileId=45&orderBy=domain

# البحث مع pagination
GET /api/sound-files/evaluations/search?search=هدف&limit=20&offset=20
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 45,
      "pages": 5
    }
  }
}
```

---

## 🔄 معايير تقييم الحالة

### 🟢 **Strong (قوي)**
- ✅ 2+ أدلة مستقلة
- ✅ ثقة 75-100%
- ✅ نمط متسق وواضح
- **مثال**: معيار 1.1 - المعلم ذكر الهدف بوضوح وكتبه على السبورة وأعاد التذكير به

### 🟡 **Emerging (ناشئ)**
- ⚠️ 1+ أدلة
- ⚠️ ثقة 50-75%
- ⚠️ نمط غير متسق
- **مثال**: معيار 2.2 - استخدم الحوار مع الطلاب مرة واحدة فقط

### 🔴 **Limited (محدود)**
- ❌ دليل ضعيف جداً
- ❌ ثقة 25-50%
- ❌ قد يكون غير واضح أو غموض بسيط
- **مثال**: معيار 3.1 - صوت غير واضح بشأن نقطة معينة

### ⚪ **Insufficient (غير كافي)**
- ⛔ لا توجد أدلة
- ⛔ ثقة 0-25%
- ⛔ لا يمكن التقييم من البيانات
- **مثال**: معيار 5.3 - لا يوجد طالب من ذوي الاحتياجات الخاصة في التسجيل

---

## 📋 بنية الـ Evidence

كل دليل يتم حفظه بالصيغة التالية:

```
[Status] Facts: وصف الواقع | Interpretation: المعنى | Limitations: القيود | Confidence: تجاه%
```

**مثال:**
```
[Strong] Facts: المعلم قال: "الهدف اليوم هو..." وكتبه على السبورة | Interpretation: وضوح الأهداف التعليمية | Limitations: جودة الصوت جيدة | Confidence: 85%
```

---

## 🧪 أمثلة الاستخدام

### اختبار التقييم مباشرة:

```bash
curl -X POST http://localhost:5000/api/sound-files/test/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "السلام عليكم. اليوم سنتعلم عن إدارة الصف الفعّالة. الهدف الأساسي هو بناء بيئة تعليمية إيجابية.",
    "description": "اختبار سريع"
  }'
```

### الحصول على statistics:

```bash
curl http://localhost:5000/api/sound-files/45/evaluation/report/comprehensive
```

### البحث والفلترة:

```bash
# البحث عن معايير Strong معينة
curl "http://localhost:5000/api/sound-files/evaluations/search?status=Strong&limit=5"

# البحث في ملف معين
curl "http://localhost:5000/api/sound-files/evaluations/search?fileId=45&search=هدف"
```

---

## 🎯 حالات الاستخدام

### 1. **للمشرفين التربويين:**
- تقييم الدروس بسهولة
- الحصول على تقارير شاملة
- تصدير النتائج للمراجعة

### 2. **للمعلمين:**
- عرض نتائج التأثير عليهم
- معرفة نقاط القوة والتطوير
- الحصول على تغذية راجعة فورية

### 3. **للإداريين:**
- إداريين المدرسة
- متابعة الأداء
- اتخاذ قرارات تطويرية بناءً على البيانات

---

## 📊 المؤشرات الرئيسية

- **معدل النجاح**: نسبة التقييمات "Strong"
- **درجة التحسن**: الفرق بين Emerging و Limited  
- **معدل الاكتمال**: نسبة الـ KPIs المقيّمة vs غير المقيّمة
- **الاتجاهات**: تحسن أو انخفاض مع مرور الوقت

---

## 🚀 بدء الاستخدام

### 1. **تشغيل الـ Backend:**
```bash
cd backend
npm run build
node dist/index.js
```

### 2. **تشغيل الـ Frontend:**
```bash
cd frontend
npm run dev
```

### 3. **فتح لوحة التحكم:**
```
http://localhost:5173/evaluations
```

### 4. **اختبار:**
- أدخل معرف ملف صوتي
- انقر على "تحميل التقرير"
- استخدم البحث والفلاتر
- صدّر النتائج إذا أردت

---

## 📱 المتطلبات

- Node.js 16+
- PostgreSQL
- OpenAI API Key
- متصفح حديث

---

## 🔐 الملاحظات الأمنية

- جميع الـ endpoints تطبيق معايير الأمان
- البيانات مشفرة في النقل (HTTPS في الإنتاج)
- التحقق من الهوية لجميع العمليات

---

## 📞 الدعم

للمزيد من المعلومات أو الإبلاغ عن مشاكل:
- قم بفتح issue في الـ repository
- اتصل بفريق الدعم

---

**الإصدار:** 2.0.0  
**آخر تحديث:** 9 مارس 2026  
**الحالة:** ✅ منتج متاح
