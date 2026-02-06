-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Allow all users to manage their backups
CREATE POLICY "Anyone can upload backups"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'backups');

CREATE POLICY "Anyone can read backups"
ON storage.objects FOR SELECT
USING (bucket_id = 'backups');

CREATE POLICY "Anyone can delete backups"
ON storage.objects FOR DELETE
USING (bucket_id = 'backups');