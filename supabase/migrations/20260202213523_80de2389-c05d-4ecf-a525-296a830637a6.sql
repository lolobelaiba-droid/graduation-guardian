-- Create academic_titles table for storing custom academic titles
CREATE TABLE public.academic_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name VARCHAR NOT NULL,
  abbreviation VARCHAR NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academic_titles ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations
CREATE POLICY "Allow all on academic_titles" 
ON public.academic_titles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert default academic titles
INSERT INTO public.academic_titles (full_name, abbreviation, display_order) VALUES
('أستاذ التعليم العالي', 'أد', 1),
('دكتور', 'د', 2),
('أستاذ', 'أ', 3),
('Professor', 'Prof', 4),
('Doctor', 'Dr', 5),
('Professeur', 'Pr', 6);