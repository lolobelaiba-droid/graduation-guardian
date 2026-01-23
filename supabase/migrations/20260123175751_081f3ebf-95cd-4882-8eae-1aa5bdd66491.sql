-- Create storage bucket for custom fonts
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-fonts', 'custom-fonts', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for font uploads
CREATE POLICY "Anyone can view fonts"
ON storage.objects FOR SELECT
USING (bucket_id = 'custom-fonts');

CREATE POLICY "Anyone can upload fonts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'custom-fonts');

CREATE POLICY "Anyone can delete fonts"
ON storage.objects FOR DELETE
USING (bucket_id = 'custom-fonts');

-- Create table for custom fonts metadata
CREATE TABLE public.custom_fonts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  font_name TEXT NOT NULL,
  font_family TEXT NOT NULL,
  font_url TEXT NOT NULL,
  font_weight TEXT DEFAULT 'normal',
  font_style TEXT DEFAULT 'normal',
  is_arabic BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_fonts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (internal university use)
CREATE POLICY "Anyone can view fonts"
ON public.custom_fonts FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert fonts"
ON public.custom_fonts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete fonts"
ON public.custom_fonts FOR DELETE
USING (true);