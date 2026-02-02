-- Add print settings columns to certificate_templates table
-- Each template will have its own print settings

ALTER TABLE public.certificate_templates
ADD COLUMN print_paper_size character varying DEFAULT 'a4',
ADD COLUMN print_custom_width numeric DEFAULT 210,
ADD COLUMN print_custom_height numeric DEFAULT 297,
ADD COLUMN print_margin_top numeric DEFAULT 20,
ADD COLUMN print_margin_bottom numeric DEFAULT 20,
ADD COLUMN print_margin_right numeric DEFAULT 15,
ADD COLUMN print_margin_left numeric DEFAULT 15;