# Firasah AI v2.0.0.1

حل ذكي متقدم مع أحدث تقنيات Node.js وPostgreSQL

## 🚀 المميزات

- ✨ TypeScript للأمان النوعي
- 🔐 نظام مصادقة JWT متقدم
- 📦 Express.js للـ API
- 🗄️ PostgreSQL مع helper functions شامل
- 🛡️ Helmet للأمان
- 🔄 CORS محسّنة
- 🔑 تشفير كلمات المرور بـ bcryptjs
- ⚡ ES Modules

## 📋 المتطلبات

- Node.js 18 أو أعلى ✅ (v20.17.0)
- npm 9 أو أعلى
- PostgreSQL 12 أو أعلى (اختياري - يمكن تثبيته لاحقاً)

## ⚙️ التثبيت والتشغيل

### 1. تثبيت الحزم

```bash
npm install
```

### 2. إعداد المتغيرات البيئية

انسخ `.env` وقم بتخصيصها:

```bash
cp .env.example .env  # أو عدّل الملف .env موجود
```

### 3. بناء المشروع

```bash
npm run build
```

### 4. تشغيل التطبيق

```bash
# الإنتاج
npm start

# التطوير (مع المراقبة التلقائية)
npm run dev
```

سيتم تشغيل الخادم على: `http://localhost:5000`

## 📁 هيكل المشروع

```
src/
├── config/
│   └── database.ts          # اتصال PostgreSQL
├── helpers/
│   └── database.ts          # دوال مساعدة قاعدة البيانات
├── middleware/
│   └── auth.ts              # middleware المصادقة
├── services/
│   └── authService.ts       # منطق المصادقة
├── routes/
│   ├── authRoutes.ts        # مسارات المصادقة
│   └── healthRoutes.ts      # فحوصات الصحة
└── index.ts                 # نقطة الدخول الرئيسية

dist/                  # التجميع (JavaScript)
package.json           # إعدادات المشروع
tsconfig.json          # إعدادات TypeScript
.env                   # متغيرات البيئة
API.rest               # ملف اختبار REST (VSCode)
FULL_DOCUMENTATION.md  # التوثيق الكامل
```

## 🔒 نقاط النهاية API

### صحة الخادم
- `GET /` - فحص الصحة
- `GET /health` - حالة مفصلة

### المصادقة
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/profile` - الحصول على الملف الشخصي (محمي)
- `PUT /api/auth/profile` - تحديث الملف الشخصي (محمي)
- `POST /api/auth/change-password` - تغيير كلمة المرور (محمي)

## 📖 توثيق API بـ Swagger

### واجهة Swagger التفاعلية
```
http://localhost:5000/api-docs
```

جميع نقاط النهاية موثقة بالكامل مع:
- ✅ أمثلة على الطلبات والردود
- ✅ تفاصيل المعاملات وأنواع البيانات
- ✅ اختبار مباشر للـ API من الواجهة
- ✅ دعم المصادقة JWT
- ✅ رموز الأخطاء والتفسيرات

**انظر [SWAGGER_GUIDE.md](SWAGGER_GUIDE.md) للتفاصيل الكاملة**

## 🧪 اختبار API

### استخدام REST Client في VSCode

1. اثبت الإضافة: [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
2. افتح ملف `API.rest`
3. اضغط "Send Request" أعلى كل طلب

### أو استخدام cURL

```bash
# التسجيل
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "name": "Test User"
  }'

# تسجيل الدخول
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'

# الملف الشخصي (استخدم التوكن من تسجيل الدخول)
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🗄️ قاعدة البيانات

### إنشاء جداول PostgreSQL

```sql
-- جدول المستخدمين
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- فهرس للبحث السريع
CREATE INDEX idx_users_email ON users(email);
```

## 📚 دوال مساعدة قاعدة البيانات

```typescript
import { 
  getOne, getMany, insert, update, deleteRecord,
  getCount, paginate, transaction 
} from './helpers/database';

// الحصول على سجل واحد
const user = await getOne('SELECT * FROM users WHERE id = $1', [1]);

// إدراج سجل
const newUser = await insert('users', { 
  email: 'user@example.com',
  password: 'hashed',
  name: 'User' 
});

// تحديث سجل
const updated = await update('users', { name: 'New Name' }, 'id = $1', [1]);

// حذف سجل
await deleteRecord('users', 'id = $1', [1]);

// عد السجلات
const count = await getCount('users');

// مع الترقيم
const result = await paginate('SELECT * FROM users', 1, 10); // صفحة 1، 10 نتائج
```

## 🔐 خدمات المصادقة

```typescript
import {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  changePassword,
  generateToken,
  verifyToken
} from './services/authService';

// تسجيل
const user = await registerUser({ 
  email: 'user@example.com', 
  password: 'pass', 
  name: 'User' 
});

// تسجيل الدخول
const { user, token } = await loginUser('user@example.com', 'pass');

// التحقق من التوكن
const payload = verifyToken(token);
```

## 🛠️ متغيرات البيئة

```env
# الخادم
PORT=5000
NODE_ENV=development

# قاعدة البيانات
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=firasah_ai_db

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🔐 الأمان

- ✅ تشفير كلمات المرور بـ bcryptjs
- ✅ JWT للمصادقة
- ✅ Helmet للرؤوس الآمنة
- ✅ CORS محسّنة
- ✅ التحقق من المدخلات
- ✅ معالجة الأخطاء الآمنة

## 📖 التوثيق الكامل

انظر [FULL_DOCUMENTATION.md](FULL_DOCUMENTATION.md) للحصول على:
- شرح مفصل لجميع الدوال
- أمثلة استخدام شاملة
- قوائم الأخطاء الشائعة والحلول

## 🤝 المساهمة

يرجى فتح issue أو إرسال pull request

## 📄 الترخيص

MIT

---

**الإصدار**: 2.0.0.1  
**آخر تحديث**: 6 مارس 2026  
**الحالة**: ✅ قيد التشغيل
