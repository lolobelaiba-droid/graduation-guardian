-- Add separate horizontal and vertical scale columns for background
ALTER TABLE public.certificate_templates
ADD COLUMN background_scale_x numeric DEFAULT 100,
ADD COLUMN background_scale_y numeric DEFAULT 100;