
-- Add rank and university columns to professors table
ALTER TABLE public.professors ADD COLUMN rank_label text;
ALTER TABLE public.professors ADD COLUMN rank_abbreviation text;
ALTER TABLE public.professors ADD COLUMN university text;
