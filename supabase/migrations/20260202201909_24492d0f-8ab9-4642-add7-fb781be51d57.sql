-- Add supervisor fields to PhD LMD certificates
ALTER TABLE public.phd_lmd_certificates
ADD COLUMN IF NOT EXISTS supervisor_ar character varying NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS supervisor_fr character varying;

-- Add supervisor fields to PhD Science certificates
ALTER TABLE public.phd_science_certificates
ADD COLUMN IF NOT EXISTS supervisor_ar character varying NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS supervisor_fr character varying;

-- Add supervisor fields to Master certificates
ALTER TABLE public.master_certificates
ADD COLUMN IF NOT EXISTS supervisor_ar character varying NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS supervisor_fr character varying;

-- Remove the default after adding (so new inserts require the value)
ALTER TABLE public.phd_lmd_certificates ALTER COLUMN supervisor_ar DROP DEFAULT;
ALTER TABLE public.phd_science_certificates ALTER COLUMN supervisor_ar DROP DEFAULT;
ALTER TABLE public.master_certificates ALTER COLUMN supervisor_ar DROP DEFAULT;