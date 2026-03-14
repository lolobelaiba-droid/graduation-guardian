ALTER TABLE public.defense_document_templates
  ADD COLUMN IF NOT EXISTS margin_top numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS margin_bottom numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS margin_right numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS margin_left numeric DEFAULT 15;