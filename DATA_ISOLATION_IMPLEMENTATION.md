# 🔒 تطبيق فصل البيانات بين المستخدمين

## المشكلة القديمة
- البيانات غير مفصولة بين المستخدمين
- أي مستخدم عادي يمكنه رؤية ملفات ومعلومات جميع المستخدمين الآخرين
- لا يوجد تحكم وصول للملفات والبيانات

## الحل المطبق

### 1. **Middleware Authentication و Authorization**
📍 الملف: `backend/src/middleware/auth.ts`

#### `authenticate` - فحص التوكن
```typescript
// يتحقق من وجود JWT token صالح
// ويستخرج user_id و email من التوكن
```

#### `requireSuperAdmin` - فحص دور المسؤول
```typescript
// يتحقق إذا كان المستخدم من نوع super_admin
// يرفض الوصول للمستخدمين العاديين
```

#### `requireFileOwnership` - التحقق من الملكية
```typescript
// يفحص ملكية الملف
// المستخدم العادي: يمكنه الوصول فقط لملفاته الخاصة
// Super Admin: يمكنه الوصول لجميع الملفات
```

---

### 2. **خدمات الملفات المحدثة**
📍 الملف: `backend/src/services/soundFilesService.ts`

#### دالة جديدة: `getUserSoundFiles(email, userRole)`
```typescript
// للمستخدم العادي (user): 
//   مرجع فقط الملفات التي أنشأها (createdBy = email)
// 
// للـ Super Admin (super_admin):
//   مرجع جميع الملفات في النظام
```

---

### 3. **تحديث Fragment Routes**
📍 الملف: `backend/src/routes/fragmentRoutes.ts`

#### Endpoints المحمية:
| Endpoint | الحماية | الوصف |
|----------|--------|-------|
| `GET /api/fragments/file/:fileId` | `requireFileOwnership` | الحصول على fragments الملف |
| `GET /api/fragments/stats/:fileId` | `requireFileOwnership` | إحصائيات الملف |
| `POST /api/fragments/process/:fileId` | `requireFileOwnership` | معالجة الملف |
| `POST /api/fragments/process-all` | `requireSuperAdmin` | معالجة جميع الملفات |
| `DELETE /api/fragments/file/:fileId` | `requireFileOwnership` | حذف fragments الملف |

---

### 4. **تحديث Dashboard Routes**
📍 الملف: `backend/src/routes/dashboardRoutes.ts`

جميع endpoints الـ Dashboard تم تحديثها بـ:
- ✅ إضافة `authenticate` middleware
- ✅ فحص دور المستخدم (super_admin أم user)
- ✅ إضافة مرشح `created_by` للمستخدمين العاديين في جميع الـ queries

#### Endpoints المحدثة:
1. **`GET /api/dashboard/kpi-cards`** - KPI الرئيسية
2. **`GET /api/dashboard/domains-weeks`** - أداء المجالات أسبوعياً
3. **`GET /api/dashboard/domains-subjects`** - مقارنة المجالات مع المواضيع
4. **`GET /api/dashboard/teacher-performance`** - أداء المعلمين
5. **`GET /api/dashboard/section-progress`** - تقدم الفصول
6. **`GET /api/dashboard/top-evidences`** - أفضل الأدلة

#### آلية عمل الفصل في Dashboard:
```sql
-- للمستخدم العادي:
WHERE ... AND dfl.created_by = $userEmail

-- للـ Super Admin:
WHERE ...  -- بدون تصفية created_by
```

---

## 💻 كيفية الاستخدام

### للمستخدم العادي:
```bash
# سيرى فقط بيانات ملفاته الخاصة
GET /api/dashboard/kpi-cards
Authorization: Bearer <user_token>
→ النتائج = بيانات من ملفات هذا المستخدم فقط
```

### للـ Super Admin:
```bash
# سيرى جميع البيانات في النظام
GET /api/dashboard/kpi-cards
Authorization: Bearer <super_admin_token>
→ النتائج = بيانات جميع المستخدمين والملفات
```

---

## 🔐 مستويات الحماية

| المستوى | الوصفة | الحماية |
|---------|--------|--------|
| 1️⃣ Authentication | JWT Token | التحقق من هوية المستخدم |
| 2️⃣ Authorization | User Role | التحقق من صلاحيات المستخدم |
| 3️⃣ Data Ownership | File Ownership Check | التحقق من ملكية الملف |
| 4️⃣ Query Filtering | WHERE clause | تصفية البيانات في Database |

---

## 📊 مثال عملي: سيناريو الاختبار

### الحالة 1: مستخدم عادي1️⃣
```
البريد: user1@example.com
الدور: user
الملفات المملوكة: [file_1, file_2, file_3]

GET /api/dashboard/kpi-cards
→ يرى إحصائيات من file_1, file_2, file_3 فقط
→ لا يرى بيانات user2
```

### الحالة 2: مستخدم عادي آخر
```
البريد: user2@example.com
الدور: user
الملفات المملوكة: [file_4, file_5]

GET /api/dashboard/kpi-cards
→ يرى إحصائيات من file_4, file_5 فقط
→ لا يرى بيانات user1
```

### الحالة 3: Super Admin
```
البريد: admin@example.com
الدور: super_admin
الملفات المملوكة: جميع الملفات

GET /api/dashboard/kpi-cards
→ يرى إحصائيات من جميع الملفات
→ يرى بيانات جميع المستخدمين
```

---

## 🧪 اختبار الفصل

### 1. اختبر وصول المستخدم لملفات آخر:
```bash
# قم بتسجيل الدخول كـ user1
POST /api/auth/login
body: { email: "user1@example.com", password: "..." }
→ احصل على token1

# حاول الوصول لملف من user2
GET /api/fragments/file/5
Authorization: Bearer token1
→ يجب أن يرجع: 403 Forbidden - "You do not have access to this file"
```

### 2. اختبر وصول Super Admin:
```bash
# قم بتسجيل الدخول كـ super_admin
POST /api/auth/login
body: { email: "admin@example.com", password: "..." }
→ احصل على token_admin

# حاول الوصول لنفس الملف
GET /api/fragments/file/5
Authorization: Bearer token_admin
→ يجب أن يرجع: 200 OK - البيانات الكاملة
```

### 3. اختبر Dashboard:
```bash
# كـ user1
GET /api/dashboard/kpi-cards
Authorization: Bearer token1
→ يرى فقط Upload Hours من ملفاته

# كـ super_admin
GET /api/dashboard/kpi-cards
Authorization: Bearer token_admin
→ يرى Upload Hours من جميع الملفات
```

---

## 📝 ملاحظات المتطلبات

### يجب التأكد من:
1. ✅ جدول `users` يحتوي على عمود `role` (user / super_admin)
2. ✅ جدول `sound_files` يحتوي على عمود `createdBy` (email المستخدم)
3. ✅ جدول `dashboard_fact_lectures` يحتوي على عمود `created_by`
4. ✅ جدول `dashboard_fact_evidences` يحتوي على عمود `created_by`
5. ✅ جدول `login_events` يحتوي على عمود `email`

---

## 🚀 الخطوات التالية

بعد هذا التطبيق:

1. **Frontend Updates**: تحديث الواجهة الأمامية لإظهار فقط بيانات المستخدم
2. **API Tests**: اختبار شامل لجميع الـ endpoints
3. **Database Verification**: التحقق من صحة البيانات في Database
4. **Performance Monitoring**: مراقبة الأداء مع الـ WHERE clauses الإضافية

---

## 🎯 الفوائد

✅ **الأمان**: لا يمكن للمستخدمين الوصول لبيانات بعضهم البعض

✅ **الخصوصية**: كل مستخدم يرى فقط ملفاته ودراته

✅ **الإدارة**: Super Admin يمكنه مراقبة جميع الأنشطة

✅ **الامتثال**: يتوافق مع معايير حماية البيانات

---

## 📞 الدعم

في حالة الأسئلة أو المشاكل، تحقق من:
- ✅ أن التوكن صحيح والمستخدم مصرح
- ✅ أن دور المستخدم صحيح في Database
- ✅ أن ملكية الملف تم تعيينها بشكل صحيح
