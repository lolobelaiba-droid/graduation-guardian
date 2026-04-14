
ALTER TABLE public.phd_lmd_students ADD COLUMN date_of_birth_presumed boolean NOT NULL DEFAULT false;
ALTER TABLE public.phd_science_students ADD COLUMN date_of_birth_presumed boolean NOT NULL DEFAULT false;
ALTER TABLE public.defense_stage_lmd ADD COLUMN date_of_birth_presumed boolean NOT NULL DEFAULT false;
ALTER TABLE public.defense_stage_science ADD COLUMN date_of_birth_presumed boolean NOT NULL DEFAULT false;
ALTER TABLE public.phd_lmd_certificates ADD COLUMN date_of_birth_presumed boolean NOT NULL DEFAULT false;
ALTER TABLE public.phd_science_certificates ADD COLUMN date_of_birth_presumed boolean NOT NULL DEFAULT false;
ALTER TABLE public.master_certificates ADD COLUMN date_of_birth_presumed boolean NOT NULL DEFAULT false;
