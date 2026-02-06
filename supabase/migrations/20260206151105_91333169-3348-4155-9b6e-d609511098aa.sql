-- Add current_year and registration_count fields to PhD student tables
ALTER TABLE public.phd_lmd_students 
ADD COLUMN IF NOT EXISTS current_year TEXT,
ADD COLUMN IF NOT EXISTS registration_count INTEGER;

ALTER TABLE public.phd_science_students 
ADD COLUMN IF NOT EXISTS current_year TEXT,
ADD COLUMN IF NOT EXISTS registration_count INTEGER;