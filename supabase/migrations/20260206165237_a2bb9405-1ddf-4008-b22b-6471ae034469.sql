
-- Fix registration_number: set default value since it was removed from forms
ALTER TABLE public.phd_lmd_students
ALTER COLUMN registration_number SET DEFAULT '';

ALTER TABLE public.phd_science_students
ALTER COLUMN registration_number SET DEFAULT '';
