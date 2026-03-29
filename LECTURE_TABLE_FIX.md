# إصلاح مشكلة جدول Lecture

## المشكلة
جدول `lecture` لم يكن يحفظ البيانات بسبب:
- العمود `slot_order` مفقود من الجدول
- الكود يحاول إدراج قيم في عمود غير موجود مما يسبب فشل في العملية

## الحل

### 1. **تشغيل المهاجرة**
```bash
cd backend
npm run migrate:slot-order
```

هذا سيضيف عمود `slot_order` إلى جدول `lecture` ويقوم بإنشاء index للأداء الأفضل.

### 2. **إعادة تشغيل الباك**
بعد تشغيل المهاجرة، أعد تشغيل الخادم:
```bash
npm run dev
```

## ما الذي تم إصلاحه

### Changes Made:
1. ✅ أضفت عمود `slot_order INTEGER DEFAULT 0` لجدول `lecture`
2. ✅ أنشأت migration script لإضافة العمود للقواعد الحالية
3. ✅ أضفت index على `slot_order` لتحسين الأداء
4. ✅ أضفت script في package.json لتسهيل تشغيل المهاجرة

## Files Modified:
- `backend/database/create_speech_table.sql` - تحديث schema creation script
- `backend/database/migrate-add-slot-order.sql` - SQL migration script
- `backend/src/migrations/add-slot-order.ts` - TypeScript migration script
- `backend/src/services/speechService.ts` - استعادة slot_order في saveSpeech
- `backend/package.json` - إضافة migrate script

## بعد الإصلاح:
الآن جدول `lecture` يحفظ البيانات بنجاح مع جميع الحقول المطلوبة! ✅
