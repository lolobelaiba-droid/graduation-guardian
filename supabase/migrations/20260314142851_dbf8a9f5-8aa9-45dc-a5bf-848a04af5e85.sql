
ALTER TABLE public.defense_stage_lmd
  ADD COLUMN IF NOT EXISTS auth_decision_number text NULL,
  ADD COLUMN IF NOT EXISTS auth_decision_date text NULL,
  ADD COLUMN IF NOT EXISTS dean_letter_number text NULL,
  ADD COLUMN IF NOT EXISTS dean_letter_date text NULL;

ALTER TABLE public.defense_stage_science
  ADD COLUMN IF NOT EXISTS auth_decision_number text NULL,
  ADD COLUMN IF NOT EXISTS auth_decision_date text NULL,
  ADD COLUMN IF NOT EXISTS dean_letter_number text NULL,
  ADD COLUMN IF NOT EXISTS dean_letter_date text NULL;
