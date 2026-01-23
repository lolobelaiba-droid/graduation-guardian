-- Add faculty columns to all certificate tables

-- PhD LMD certificates
ALTER TABLE public.phd_lmd_certificates 
ADD COLUMN faculty_ar character varying NOT NULL DEFAULT '',
ADD COLUMN faculty_fr character varying;

-- PhD Science certificates
ALTER TABLE public.phd_science_certificates 
ADD COLUMN faculty_ar character varying NOT NULL DEFAULT '',
ADD COLUMN faculty_fr character varying;

-- Master certificates
ALTER TABLE public.master_certificates 
ADD COLUMN faculty_ar character varying NOT NULL DEFAULT '',
ADD COLUMN faculty_fr character varying;