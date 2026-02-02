-- إضافة الحقول الجديدة لجدول شهادات دكتوراه ل م د
ALTER TABLE public.phd_lmd_certificates 
ADD COLUMN IF NOT EXISTS first_registration_year TEXT,
ADD COLUMN IF NOT EXISTS professional_email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- إضافة الحقول الجديدة لجدول شهادات دكتوراه علوم
ALTER TABLE public.phd_science_certificates 
ADD COLUMN IF NOT EXISTS first_registration_year TEXT,
ADD COLUMN IF NOT EXISTS professional_email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- إضافة الحقول الجديدة لجدول شهادات الماجستير
ALTER TABLE public.master_certificates 
ADD COLUMN IF NOT EXISTS first_registration_year TEXT,
ADD COLUMN IF NOT EXISTS professional_email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;