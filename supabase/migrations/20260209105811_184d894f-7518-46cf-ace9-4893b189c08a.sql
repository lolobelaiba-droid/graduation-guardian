-- Add is_read column to notes table
ALTER TABLE public.notes 
ADD COLUMN is_read BOOLEAN DEFAULT false;