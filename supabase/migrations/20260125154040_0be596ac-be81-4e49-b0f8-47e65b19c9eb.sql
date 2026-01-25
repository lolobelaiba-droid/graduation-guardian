-- Create table for storing dropdown options for faculty, field, etc.
CREATE TABLE public.dropdown_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_type VARCHAR NOT NULL, -- 'faculty', 'field_ar', 'field_fr'
  option_value VARCHAR NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (internal university network)
CREATE POLICY "Allow all on dropdown_options" 
ON public.dropdown_options 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_dropdown_options_unique ON public.dropdown_options (option_type, option_value);

-- Create index for faster queries
CREATE INDEX idx_dropdown_options_type ON public.dropdown_options (option_type);