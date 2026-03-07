# 🗄️ تثبيت وإعداد PostgreSQL

## 🪟 خطوات التثبيت على Windows

### 1. تحميل PostgreSQL

**للإصدار الأحدث (14+):**
- اذهب إلى: https://www.postgresql.org/download/windows/
- اختر "Interactive installer by EDB"
- حمّل أحدث إصدار (مثل PostgreSQL 15 أو 16)

### 2. تشغيل المثبّت

1. افتح ملف `postgresql-16.x-windows-x64.exe` (أو الإصدار الأحدث)
2. اتبع المرحلة الأولى (Next)
3. اختر مسار التثبيت (الافتراضي جيد)
4. اختر المكونات:
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (اختياري - لإدارة قاعدة البيانات من واجهة رسومية)
   - ✅ Command Line Tools

### 3. إعدادات قاعدة البيانات

**كلمة المرور للمستخدم `postgres`:**
```
postgres
```

**منفذ PostgreSQL:**
```
5432
```

**Locale:**
```
C (English - United States)
```

### 4. إكمال التثبيت

- اضغط Install
- انتظر حتى ينتهي التثبيت
- قد يطلب إعادة تشغيل - افعل ذلك إن لزم الأمر

---

## ✅ التحقق من التثبيت

### في PowerShell، شغّل:

```bash
psql --version
```

يجب أن ترى شيء مثل:
```
psql (PostgreSQL) 16.0
```

---

## 📊 إنشاء قاعدة البيانات والجداول

### 1. افتح PowerShell كمسؤول

```bash
cd D:\Projects\_Firasah-Ai-V2.0.0.1
```

### 2. اتصل بـ PostgreSQL

```bash
psql -U postgres
```

عند الطلب، أدخل كلمة المرور:
```
postgres
```

### 3. أنشئ قاعدة البيانات

```sql
CREATE DATABASE firasah_ai_db;
```

### 4. اخرج من psql

```sql
\q
```

### 5. شغّل ملف SQL

```bash
psql -U postgres -d firasah_ai_db -f database/schema.sql
```

---

## 🎯 البديل: استخدام pgAdmin

### الطريقة الرسومية (أسهل)

1. افتح **pgAdmin 4** (تم تثبيته تلقائياً)
2. السيرفر الافتراضي هو `localhost`
3. اسم المستخدم: `postgres`
4. كلمة المرور: `postgres`

**ثم:**

1. انقر زر يمين على **Databases** → **Create** → **Database**
2. اسم القاعدة: `firasah_ai_db`
3. اضغط Save

**لتشغيل SQL:**

1. انقر زر يمين على `firasah_ai_db` → **Query Tool**
2. افتح ملف `database/schema.sql`
3. انسخ وألصق المحتوى
4. اضغط Execute (F5)

---

## 📋 بيانات الاتصال

ملف `.env` متحدث بالفعل:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=firasah_ai_db
```

---

## 🧪 اختبار الاتصال

افتح terminal في المجلد وشغّل:

```bash
npm run build
npm start
```

إذا لم تظهر أخطاء في الاتصال، الإعداد صحيح! ✅

---

## 🛠️ حل المشاكل الشائعة

### مشكلة: `role "postgres" does not exist`

**الحل:** أعد تثبيت PostgreSQL واختر اسم المستخدم `postgres`

### مشكلة: `FATAL: Ident authentication failed`

**الحل:** قد تحتاج لتغيير كلمة مرور postgres:

```bash
psql -U postgres -h localhost

-- في psql:
ALTER USER postgres PASSWORD 'postgres';
```

### مشكلة: منفذ 5432 مشغول

**الحل:** غيّر منفذ PostgreSQL أو أوقف التطبيق الآخر:

```bash
# معرفة العملية التي تستخدم المنفذ
netstat -ano | findstr :5432
```

---

## 📚 أوامر مفيدة

```bash
# اتصل بقاعدة بيانات محددة
psql -U postgres -d firasah_ai_db

# قائمة قواعد البيانات
\l

# قائمة الجداول
\dt

# مساعدة
\h

# خروج
\q
```

---

## ✨ بعد الانتهاء

جرب الـ API:
```
http://localhost:5000/api-docs
```

يجب أن تعمل المصادقة الآن! 🎉
