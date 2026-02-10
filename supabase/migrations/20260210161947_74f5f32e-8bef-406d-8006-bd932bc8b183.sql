
-- إضافة حقل الميدان لجدول طلبة دكتوراه علوم
ALTER TABLE public.phd_science_students
ADD COLUMN IF NOT EXISTS field_ar character varying NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS field_fr character varying NULL;

-- إضافة حقل الميدان لجدول شهادات دكتوراه علوم
ALTER TABLE public.phd_science_certificates
ADD COLUMN IF NOT EXISTS field_ar character varying NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS field_fr character varying NULL;
