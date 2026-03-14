ALTER TABLE defense_stage_lmd DROP CONSTRAINT defense_stage_lmd_stage_status_check;
ALTER TABLE defense_stage_lmd ADD CONSTRAINT defense_stage_lmd_stage_status_check CHECK (stage_status IN ('pending', 'under_review', 'authorized', 'defended'));

ALTER TABLE defense_stage_science DROP CONSTRAINT defense_stage_science_stage_status_check;
ALTER TABLE defense_stage_science ADD CONSTRAINT defense_stage_science_stage_status_check CHECK (stage_status IN ('pending', 'under_review', 'authorized', 'defended'));