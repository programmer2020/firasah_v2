# 🎯 Swagger API Documentation

## الوصول إلى التوثيق

### Swagger UI (واجهة الويب التفاعلية)
```
http://localhost:5000/api-docs
```

### Swagger JSON (ملف JSON الخام)
```
http://localhost:5000/swagger.json
```

---

## 📖 ميزات التوثيق

### ✅ موثقة بالكامل:
- **جميع النقاط الطرفية** (All endpoints)
- **معاملات الطلب** (Request parameters)
- **نماذج الرد** (Response models)
- **رموز الخطأ** (Error codes)
- **المصادقة** (Authorization)

### 🔐 دعم المصادقة:
- JWT Bearer Token
- اختبار مباشر مع التوكن

---

## 🎭 كيفية استخدام Swagger

### 1. فتح واجهة Swagger

```bash
# بعد تشغيل الخادم
http://localhost:5000/api-docs
```

### 2. تسجيل مستخدم جديد

1. انقر على `POST /api/auth/register`
2. اضغط "Try it out"
3. أدخل البيانات:
   ```json
   {
     "email": "test@example.com",
     "password": "SecurePassword123!",
     "name": "Test User"
   }
   ```
4. اضغط "Execute"

### 3. تسجيل الدخول

1. انقر على `POST /api/auth/login`
2. اضغط "Try it out"
3. أدخل البيانات:
   ```json
   {
     "email": "test@example.com",
     "password": "SecurePassword123!"
   }
   ```
4. اضغط "Execute"
5. **انسخ التوكن** من الرد

### 4. اختبار المسارات المحمية

1. انقر على أيقونة القفل🔓 في الزاوية العلوية اليمنى
2. اختر `bearerAuth`
3. الصق التوكن: `YOUR_TOKEN_HERE`
4. اضغط "Authorize"

الآن يمكنك اختبار المسارات المحمية مثل:
- `GET /api/auth/profile`
- `PUT /api/auth/profile`
- `POST /api/auth/change-password`

---

## 📋 نقاط النهاية (Endpoints)

### الصحة
| Method | Path | الوصف |
|--------|------|-------|
| GET | `/` | فحص الصحة |
| GET | `/health` | الحالة المفصلة |

### المصادقة
| Method | Path | الوصف | محمي |
|--------|------|-------|------|
| POST | `/api/auth/register` | تسجيل | ✗ |
| POST | `/api/auth/login` | تسجيل دخول | ✗ |
| GET | `/api/auth/profile` | الملف الشخصي | ✓ |
| PUT | `/api/auth/profile` | تحديث الملف | ✓ |
| POST | `/api/auth/change-password` | تغيير كلمة المرور | ✓ |

---

## 📦 نماذج البيانات

### User (المستخدم)
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "created_at": "2024-03-06T12:00:00.000Z",
  "updated_at": "2024-03-06T12:00:00.000Z"
}
```

### Login Response (رد تسجيل الدخول)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "created_at": "2024-03-06T12:00:00.000Z",
      "updated_at": "2024-03-06T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Response (رد الخطأ)
```json
{
  "success": false,
  "message": "Error description",
  "error": "Additional details"
}
```

---

## 🔐 المصادقة

### Bearer Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### الحصول على التوكن
1. سجل دخول باستخدام `/api/auth/login`
2. انسخ `token` من الرد
3. استخدمه في رؤوس الطلبات المحمية

---

## 🧪 أمثلة الطلبات

### cURL

#### تسجيل
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

#### تسجيل دخول
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

#### الملف الشخصي (محمي)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 المزيد من المعلومات

- [Swagger/OpenAPI docs](https://swagger.io/specification/)
- [Express.js docs](https://expressjs.com/)
- [JWT.io](https://jwt.io/)

---

**تم التحديث**: 6 مارس 2026  
**الإصدار**: 2.0.0.1
