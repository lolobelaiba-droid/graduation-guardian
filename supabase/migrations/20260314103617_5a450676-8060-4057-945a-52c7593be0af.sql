
ALTER TABLE public.defense_document_templates
ADD COLUMN custom_variables jsonb DEFAULT '[]'::jsonb;
