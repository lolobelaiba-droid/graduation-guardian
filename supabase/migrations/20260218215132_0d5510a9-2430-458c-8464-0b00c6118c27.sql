
-- Create professors table to store unique professor names
CREATE TABLE public.professors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;

-- Allow all access (consistent with other tables in this project)
CREATE POLICY "Allow all on professors"
  ON public.professors
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for fast text search
CREATE INDEX idx_professors_full_name_trgm ON public.professors USING btree (full_name);
