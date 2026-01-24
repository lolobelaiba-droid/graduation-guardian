-- Add background offset and scale columns to certificate_templates
ALTER TABLE public.certificate_templates
ADD COLUMN IF NOT EXISTS background_offset_x NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS background_offset_y NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS background_scale NUMERIC DEFAULT 100;