-- Create storage bucket for template backgrounds
INSERT INTO storage.buckets (id, name, public) 
VALUES ('template-backgrounds', 'template-backgrounds', true);

-- Allow public read access
CREATE POLICY "Public read access for template backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-backgrounds');

-- Allow public insert
CREATE POLICY "Allow insert for template backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'template-backgrounds');

-- Allow public update
CREATE POLICY "Allow update for template backgrounds"
ON storage.objects FOR UPDATE
USING (bucket_id = 'template-backgrounds');

-- Allow public delete
CREATE POLICY "Allow delete for template backgrounds"
ON storage.objects FOR DELETE
USING (bucket_id = 'template-backgrounds');

-- Add background_image_url column to certificate_templates
ALTER TABLE public.certificate_templates 
ADD COLUMN background_image_url TEXT;