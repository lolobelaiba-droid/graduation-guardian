
ALTER TABLE public.phd_lmd_certificates ALTER COLUMN mention DROP NOT NULL;
ALTER TABLE public.phd_lmd_certificates ALTER COLUMN mention DROP DEFAULT;
ALTER TABLE public.phd_science_certificates ALTER COLUMN mention DROP NOT NULL;
ALTER TABLE public.phd_science_certificates ALTER COLUMN mention DROP DEFAULT;
ALTER TABLE public.master_certificates ALTER COLUMN mention DROP NOT NULL;
ALTER TABLE public.master_certificates ALTER COLUMN mention DROP DEFAULT;
