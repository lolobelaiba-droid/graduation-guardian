-- Add gender column to all certificate tables
ALTER TABLE public.phd_lmd_certificates 
ADD COLUMN gender character varying(10) DEFAULT 'male' CHECK (gender IN ('male', 'female'));

ALTER TABLE public.phd_science_certificates 
ADD COLUMN gender character varying(10) DEFAULT 'male' CHECK (gender IN ('male', 'female'));

ALTER TABLE public.master_certificates 
ADD COLUMN gender character varying(10) DEFAULT 'male' CHECK (gender IN ('male', 'female'));