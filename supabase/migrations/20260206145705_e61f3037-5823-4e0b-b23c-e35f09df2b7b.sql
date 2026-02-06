-- Add thesis_language column to phd_lmd_students
ALTER TABLE public.phd_lmd_students 
ADD COLUMN IF NOT EXISTS thesis_language character varying DEFAULT 'arabic';

-- Add thesis_language column to phd_science_students
ALTER TABLE public.phd_science_students 
ADD COLUMN IF NOT EXISTS thesis_language character varying DEFAULT 'arabic';