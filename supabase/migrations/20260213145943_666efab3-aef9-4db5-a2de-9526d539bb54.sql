
-- Add scientific council approval date to all certificate tables
ALTER TABLE public.phd_lmd_certificates ADD COLUMN IF NOT EXISTS scientific_council_date date;
ALTER TABLE public.phd_science_certificates ADD COLUMN IF NOT EXISTS scientific_council_date date;
ALTER TABLE public.master_certificates ADD COLUMN IF NOT EXISTS scientific_council_date date;
