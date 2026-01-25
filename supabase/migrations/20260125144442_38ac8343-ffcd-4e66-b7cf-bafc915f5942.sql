-- Add university name fields to all certificate tables

-- PhD LMD certificates
ALTER TABLE public.phd_lmd_certificates 
ADD COLUMN university_ar character varying DEFAULT 'جامعة محمد خيضر بسكرة',
ADD COLUMN university_fr character varying DEFAULT 'Université Mohamed Khider Biskra';

-- PhD Science certificates
ALTER TABLE public.phd_science_certificates 
ADD COLUMN university_ar character varying DEFAULT 'جامعة محمد خيضر بسكرة',
ADD COLUMN university_fr character varying DEFAULT 'Université Mohamed Khider Biskra';

-- Master certificates
ALTER TABLE public.master_certificates 
ADD COLUMN university_ar character varying DEFAULT 'جامعة محمد خيضر بسكرة',
ADD COLUMN university_fr character varying DEFAULT 'Université Mohamed Khider Biskra';