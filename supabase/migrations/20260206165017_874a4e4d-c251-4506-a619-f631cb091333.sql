
-- Add missing columns to phd_lmd_students
ALTER TABLE public.phd_lmd_students
ADD COLUMN IF NOT EXISTS co_supervisor_ar character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS supervisor_university character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS co_supervisor_university character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS employment_status character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS registration_type character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS inscription_status character varying DEFAULT NULL;

-- Add missing columns to phd_science_students
ALTER TABLE public.phd_science_students
ADD COLUMN IF NOT EXISTS co_supervisor_ar character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS supervisor_university character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS co_supervisor_university character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS employment_status character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS registration_type character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS inscription_status character varying DEFAULT NULL;
