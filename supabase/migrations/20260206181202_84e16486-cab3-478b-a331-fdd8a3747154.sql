
-- Add PhD reference fields to phd_lmd_certificates
ALTER TABLE public.phd_lmd_certificates
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS co_supervisor_ar TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_university TEXT,
  ADD COLUMN IF NOT EXISTS co_supervisor_university TEXT,
  ADD COLUMN IF NOT EXISTS employment_status TEXT,
  ADD COLUMN IF NOT EXISTS registration_type TEXT,
  ADD COLUMN IF NOT EXISTS inscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_year TEXT,
  ADD COLUMN IF NOT EXISTS registration_count INTEGER,
  ADD COLUMN IF NOT EXISTS thesis_language TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add PhD reference fields to phd_science_certificates
ALTER TABLE public.phd_science_certificates
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS co_supervisor_ar TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_university TEXT,
  ADD COLUMN IF NOT EXISTS co_supervisor_university TEXT,
  ADD COLUMN IF NOT EXISTS employment_status TEXT,
  ADD COLUMN IF NOT EXISTS registration_type TEXT,
  ADD COLUMN IF NOT EXISTS inscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_year TEXT,
  ADD COLUMN IF NOT EXISTS registration_count INTEGER,
  ADD COLUMN IF NOT EXISTS thesis_language TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
