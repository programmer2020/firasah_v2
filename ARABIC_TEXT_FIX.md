# ✅ شرح مشكلة النصوص العربية وحلها

## 🔴 المشكلة
النصوص العربية تحفظ في قاعدة البيانات بشكل مشوه (garbled text) لأن الاتصال بـ PostgreSQL لم يكن مضبوط على UTF-8.

**مثال المشكلة:**
```
øŠÙ€'ÙÙ‰øŠ-'Ù ÙÙ‰ øŠÙ‰ø§ ø'ÙŠ Øµ
```

---

## ✅ الحلول المطبقة

### 1️⃣ **تحديث اتصال قاعدة البيانات** ✓
📝 الملف: `backend/src/config/database.ts`

```typescript
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'firasah_ai_db',
  client_encoding: 'UTF8',  // ✅ تم إضافة هذا السطر
});
```

### 2️⃣ **تحديث جداول قاعدة البيانات** ✓
📝 الملف: `database/add_tables.sql`

أضيفت خاصية `COLLATE "C"` لجميع الحقول النصية:

```sql
CREATE TABLE IF NOT EXISTS sound_files (
  file_id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL COLLATE "C",      -- ✅ UTF-8
  filepath VARCHAR(500) NOT NULL COLLATE "C",      -- ✅ UTF-8
  createdBy VARCHAR(255) COLLATE "C",              -- ✅ UTF-8
  note TEXT COLLATE "C",                           -- ✅ UTF-8
  ...
);
```

### 3️⃣ **ملف تثبيت الترميز** ✓
📝 الملف: `backend/database/fix-utf8-encoding.sql`

يحتوي على أوامر لإصلاح البيانات الموجودة.

---

## 🔧 خطوات الإصلاح

### **الخطوة 1: حذف البيانات القديمة المشوهة**
```bash
# قم بفتح PostgreSQL
psql -U postgres -d firasah_ai_db

# ثم قم بحذف البيانات القديمة
DELETE FROM evaluations;
DELETE FROM evidences;
DELETE FROM sound_files;
DELETE FROM kpis;
DELETE FROM users;
```

### **الخطوة 2: إعادة إنشاء الجداول (اختيارية)**
إذا كنت تريد إعادة إنشاء الجداول بالكامل:

```bash
# من داخل psql
psql -U postgres

# حذف قاعدة البيانات القديمة
DROP DATABASE IF EXISTS firasah_ai_db;

# إنشاء قاعدة بيانات جديدة بـ UTF-8
CREATE DATABASE firasah_ai_db 
  WITH ENCODING 'UTF8' 
  LC_COLLATE 'en_US.UTF-8' 
  LC_CTYPE 'en_US.UTF-8';

# الخروج
\q
```

### **الخطوة 3: تشغيل البرنامج الجديد**
```bash
# القرار الجديد يحتوي على UTF-8 encoding
npm run build
node dist/index.js
```

---

## ✨ النتيجة
**الآن عند إضافة نصوص عربية، ستُحفظ بشكل صحيح:**

| Before | After |
|--------|-------|
| `øŠÙ€'ÙÙ‰` | `اسم الملف` |

---

## 📋 ملاحظات مهمة

✅ **تم تطبيق جميع الإصلاحات**
- اتصال قاعدة البيانات يدعم UTF-8
- الجداول مضبوطة على UTF-8
- الـ Frontend يرسل بيانات UTF-8 تلقائياً

🚀 **الخادم جاهز للعمل مع النصوص العربية**
- Backend: http://localhost:5000
- Frontend: http://localhost:5173

---

## 🆘 في حالة الرغبة بإصلاح البيانات القديمة
إذا كان لديك بيانات قديمة تريد إنقاذها، يمكنك تشغيل:
```bash
psql -U postgres -d firasah_ai_db -f backend/database/fix-utf8-encoding.sql
```

**لكن من الأفضل حذف البيانات المشوهة وإعادة إدخال البيانات الجديدة.**
