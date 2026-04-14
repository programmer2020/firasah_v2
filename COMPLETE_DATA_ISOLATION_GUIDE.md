# 🔒 دليل شامل: تطبيق Multi-Tenant Data Isolation

## 🚨 التحديث المهم!

المشكلة الأساسية تم اكتشافها: **قاعدة البيانات نفسها لم تكن تحتفظ بـ `created_by` في جميع الجداول**

الحل يتضمن:
1. ✅ إضافة عمود `created_by` إلى جميع الجداول ذات الصلة
2. ✅ إنشاء Triggers للتحديث التلقائي
3. ✅ إعادة إنشاء الـ Views مع دعم `created_by`
4. ✅ تحديث الـ Queries للتصفية حسب `created_by`

---

## 📋 خطوات التطبيق

### الخطوة 1: إعداد اتصال قاعدة البيانات

```bash
# Windows - افتح Terminal و انتقل للمسار:
cd c:\Users\lenovo\Desktop\projects\_firasah_ai_v2.0.0.2\firasah_v2\backend

# تأكد أن PostgreSQL وـ psql مثبتة:
psql --version
```

### الخطوة 2: تشغيل Migration Scripts (اختر واحد)

#### الطريقة 1: استخدام Batch Script (Windows - الأسهل)
```bash
# في Terminal الخاص بك:
cd c:\Users\lenovo\Desktop\projects\_firasah_ai_v2.0.0.2\firasah_v2\backend

# تشغيل الـ migration:
run-data-isolation-migration.bat
```

#### الطريقة 2: تشغيل يدويّ

```bash
# 1️⃣ إضافة الأعمدة:
psql -h localhost -p 5432 -U postgres -d firasah_ai -f db-migrations/add_data_isolation_columns.sql

# 2️⃣ إضافة الـ Triggers:
psql -h localhost -p 5432 -U postgres -d firasah_ai -f db-migrations/add_data_isolation_triggers.sql
```

#### الطريقة 3: من DBeaver أو أي SQL IDE

```sql
-- افتح اتصال DBeaver بقاعدة البيانات
-- انسخ & الصق المحتوى من كل ملف SQL وشغله:

-- أولاً: add_data_isolation_columns.sql
-- ثانياً: add_data_isolation_triggers.sql
```

---

## ✅ التحقق من النجاح

بعد تشغيل الـ migrations، تحقق من:

### 1. التحقق من الأعمدة المضافة
```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'created_by'
ORDER BY table_name;

-- النتيجة المتوقعة:
-- sound_files     | created_by | character varying
-- lecture         | created_by | character varying
-- fragments       | created_by | character varying
-- evidences       | created_by | character varying
```

### 2. التحقق من الـ Triggers
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('sound_files', 'lecture', 'fragments', 'evidences')
ORDER BY event_object_table;

-- يجب أن ترى 4 triggers لكل جدول
```

### 3. التحقق من البيانات
```sql
-- تحقق من أن لديك بيانات
SELECT COUNT(*), created_by FROM sound_files GROUP BY created_by;
SELECT COUNT(*), created_by FROM lecture GROUP BY created_by;
SELECT COUNT(*), created_by FROM fragments GROUP BY created_by;
SELECT COUNT(*), created_by FROM evidences GROUP BY created_by;
```

---

## 🧪 اختبار الفصل

### اختبار 1: تسجيل الدخول والتحقق

```bash
# 1. سجل الدخول كـ user1
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"pass123"}'

# احفظ الـ TOKEN
TOKEN_USER1="<احفظ التوكن هنا>"

# 2. سجل الدخول كـ user2
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@test.com","password":"pass123"}'

TOKEN_USER2="<احفظ التوكن هنا>"

# 3. سجل الدخول كـ super_admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

TOKEN_ADMIN="<احفظ التوكن هنا>"
```

### اختبار 2: Dashboard Data Isolation

```bash
# USER1 - يجب أن يرى فقط بياناته
curl -H "Authorization: Bearer $TOKEN_USER1" \
  http://localhost:3000/api/dashboard/kpi-cards
# النتيجة = بيانات user1 فقط

# USER2 - يجب أن يرى فقط بياناته (مختلف عن user1)
curl -H "Authorization: Bearer $TOKEN_USER2" \
  http://localhost:3000/api/dashboard/kpi-cards
# النتيجة = بيانات user2 فقط (مختلفة تماماً)

# ADMIN - يجب أن يرى كل البيانات
curl -H "Authorization: Bearer $TOKEN_ADMIN" \
  http://localhost:3000/api/dashboard/kpi-cards
# النتيجة = مجموع كل البيانات
```

### اختبار 3: Fragment Access Control

```bash
# افترض أن ملف user1 له ID = 100
# وملف user2 له ID = 200

# USER1 يحاول الوصول لملفه (يجب أن ينجح ✅)
curl -H "Authorization: Bearer $TOKEN_USER1" \
  http://localhost:3000/api/fragments/file/100
# النتيجة: 200 OK + البيانات

# USER1 يحاول الوصول لملف USER2 (يجب أن يفشل ❌)
curl -H "Authorization: Bearer $TOKEN_USER1" \
  http://localhost:3000/api/fragments/file/200
# النتيجة: 403 Forbidden "You do not have access to this file"

# ADMIN يحاول الوصول لملف USER2 (يجب أن ينجح ✅)
curl -H "Authorization: Bearer $TOKEN_ADMIN" \
  http://localhost:3000/api/fragments/file/200
# النتيجة: 200 OK + البيانات
```

---

## 📊 النتائج المتوقعة

### قبل التطبيق ❌
```
User1 Dashboard:
├─ Upload Hours: 100 ساعات (من جميع الملفات)
├─ Lectures: 500 (من حميع المستخدمين)
└─ Users Sessions: 10 (من الجميع)

User2 Dashboard: (نفس البيانات!)
├─ Upload Hours: 100 ساعات
├─ Lectures: 500
└─ Users Sessions: 10
```

### بعد التطبيق ✅
```
User1 Dashboard:
├─ Upload Hours: 20 ساعات (من ملفات user1 فقط)
├─ Lectures: 50 (من ملفات user1 فقط)
└─ Users Sessions: 2 (جلسات user1 فقط)

User2 Dashboard:
├─ Upload Hours: 15 ساعات (من ملفات user2 فقط)
├─ Lectures: 35 (من ملفات user2 فقط)
└─ Users Sessions: 1 (جلسات user2 فقط)

Admin Dashboard:
├─ Upload Hours: 100 ساعات (من الجميع)
├─ Lectures: 500 (من الجميع)
└─ Users Sessions: 10 (من الجميع)
```

---

## 🔍 استكشاف الأخطاء

### خطأ: "created_by column does not exist"
```
السبب: لم تُشغل الـ migration
الحل: 
1. تشغيل add_data_isolation_columns.sql
2. تأكد من رسالة النجاح
```

### خطأ: "relation dashboard_fact_lectures does not exist"
```
السبب: الـ view لم تُعاد إنشاءها
الحل:
1. تشغيل add_data_isolation_columns.sql بالكامل
2. يجب أن تراه في السطر "DROP MATERIALIZED VIEW"
```

### خطأ: "Trigger conflict"
```
السبب: قد يكون هناك trigger قديم
الحل: الـ script يعالج هذا بـ DROP TRIGGER IF EXISTS
```

### البيانات غير مفصولة حتى بعد المعالجة
```
السبب: البيانات القديمة لم تُحدَّث
الحل: تشغيل UPDATE statements يدويّاً:
UPDATE sound_files SET created_by = createdBy WHERE created_by IS NULL;
UPDATE lecture SET created_by = (SELECT createdBy FROM sound_files WHERE sound_files.file_id = lecture.file_id) WHERE created_by IS NULL;
```

---

## 🚀 الخطوات النهائية

### 1. تشغيل Backend
```bash
cd backend
npm run build  # إعادة بناء TypeScript
npm start      # تشغيل السيرفر
```

### 2. التحقق من السيرفر
```bash
# تحقق من أن السيرفر بدأ بدون أخطاء
# يجب أن ترى: "Server running on port 3000"
```

### 3. اختبر جميع الـ Endpoints
- Dashboard endpoints
- Fragment endpoints
- File access endpoints

### 4. مراقبة الـ Logs
```bash
# في Terminal آخر، شاهد الـ logs:
tail -f backend.log
```

---

## 📞 الدعم والحل السريع

### إذا لم تحل المشكلة:

1. **تحقق من أن البيانات موجودة**:
   ```sql
   SELECT COUNT(*) FROM sound_files;
   SELECT COUNT(*) FROM lecture;
   ```

2. **تحقق من أن `createdBy` موجود في `sound_files`**:
   ```sql
   SELECT DISTINCT createdBy FROM sound_files LIMIT 10;
   ```

3. **تحقق من الـ Triggers تعمل**:
   ```sql
   -- أدرج record جديد واختبر أن created_by يُملأ تلقائياً
   INSERT INTO sound_files (filename, filepath, createdBy) 
   VALUES ('test.mp3', '/path/test.mp3', 'test@example.com');
   
   SELECT created_by FROM sound_files WHERE filename = 'test.mp3';
   ```

---

## ✅ Checklist النهائي

- [ ] تشغيل SQL migrations
- [ ] التحقق من الأعمدة المضافة
- [ ] التحقق من الـ Triggers
- [ ] تشغيل Backend من جديد
- [ ] اختبار User1 Dashboard
- [ ] اختبار User2 Dashboard
- [ ] اختبار Admin Dashboard
- [ ] اختبار File Access Control
- [ ] اختبار 403 Forbidden
- [ ] مراقبة الـ Logs للأخطاء
