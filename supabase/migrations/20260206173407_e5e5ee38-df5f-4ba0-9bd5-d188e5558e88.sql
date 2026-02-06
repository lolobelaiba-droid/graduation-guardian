-- Add field_width column (in mm) to certificate_template_fields for resizable text boxes
ALTER TABLE public.certificate_template_fields
ADD COLUMN field_width numeric NULL;