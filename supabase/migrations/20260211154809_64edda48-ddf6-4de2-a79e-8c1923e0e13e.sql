
-- Add province and signature fields to all certificate tables
ALTER TABLE public.phd_lmd_certificates ADD COLUMN province TEXT DEFAULT 'أم البواقي';
ALTER TABLE public.phd_lmd_certificates ADD COLUMN signature_title TEXT;

ALTER TABLE public.phd_science_certificates ADD COLUMN province TEXT DEFAULT 'أم البواقي';
ALTER TABLE public.phd_science_certificates ADD COLUMN signature_title TEXT;

ALTER TABLE public.master_certificates ADD COLUMN province TEXT DEFAULT 'أم البواقي';
ALTER TABLE public.master_certificates ADD COLUMN signature_title TEXT;
