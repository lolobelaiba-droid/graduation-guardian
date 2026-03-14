
ALTER TABLE public.defense_stage_lmd
  ADD COLUMN IF NOT EXISTS decision_number text NULL,
  ADD COLUMN IF NOT EXISTS decision_date text NULL;

ALTER TABLE public.defense_stage_science
  ADD COLUMN IF NOT EXISTS decision_number text NULL,
  ADD COLUMN IF NOT EXISTS decision_date text NULL;
