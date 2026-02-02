-- Drop the supervisor_fr column from all certificate tables (keeping only supervisor_ar as the single field)
ALTER TABLE public.phd_lmd_certificates DROP COLUMN IF EXISTS supervisor_fr;
ALTER TABLE public.phd_science_certificates DROP COLUMN IF EXISTS supervisor_fr;
ALTER TABLE public.master_certificates DROP COLUMN IF EXISTS supervisor_fr;