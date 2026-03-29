-- حذف العمود createdat من جدول sound_files إذا كان موجودًا
ALTER TABLE public.sound_files DROP COLUMN IF EXISTS "createdat";