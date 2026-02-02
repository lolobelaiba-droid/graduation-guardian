-- Add research_lab column to all certificate tables
ALTER TABLE public.phd_lmd_certificates 
ADD COLUMN IF NOT EXISTS research_lab_ar VARCHAR DEFAULT '';

ALTER TABLE public.phd_science_certificates 
ADD COLUMN IF NOT EXISTS research_lab_ar VARCHAR DEFAULT '';

ALTER TABLE public.master_certificates 
ADD COLUMN IF NOT EXISTS research_lab_ar VARCHAR DEFAULT '';