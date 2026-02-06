-- Create PhD LMD Students table (pre-defense, without certificate fields)
CREATE TABLE public.phd_lmd_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR NOT NULL,
  full_name_ar VARCHAR NOT NULL,
  full_name_fr VARCHAR,
  gender VARCHAR DEFAULT 'male',
  date_of_birth DATE NOT NULL,
  birthplace_ar VARCHAR NOT NULL,
  birthplace_fr VARCHAR,
  university_ar VARCHAR DEFAULT 'جامعة أم البواقي',
  university_fr VARCHAR DEFAULT 'Université D''oum El Bouaghi',
  faculty_ar VARCHAR NOT NULL DEFAULT '',
  faculty_fr VARCHAR,
  field_ar VARCHAR NOT NULL,
  field_fr VARCHAR,
  branch_ar VARCHAR NOT NULL,
  branch_fr VARCHAR,
  specialty_ar VARCHAR NOT NULL,
  specialty_fr VARCHAR,
  first_registration_year TEXT,
  professional_email TEXT,
  phone_number TEXT,
  supervisor_ar VARCHAR NOT NULL,
  thesis_title_ar TEXT,
  thesis_title_fr TEXT,
  research_lab_ar VARCHAR DEFAULT '',
  status VARCHAR DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create PhD Science Students table (pre-defense, without certificate fields)
CREATE TABLE public.phd_science_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR NOT NULL,
  full_name_ar VARCHAR NOT NULL,
  full_name_fr VARCHAR,
  gender VARCHAR DEFAULT 'male',
  date_of_birth DATE NOT NULL,
  birthplace_ar VARCHAR NOT NULL,
  birthplace_fr VARCHAR,
  university_ar VARCHAR DEFAULT 'جامعة أم البواقي',
  university_fr VARCHAR DEFAULT 'Université D''oum El Bouaghi',
  faculty_ar VARCHAR NOT NULL DEFAULT '',
  faculty_fr VARCHAR,
  branch_ar VARCHAR NOT NULL,
  branch_fr VARCHAR,
  specialty_ar VARCHAR NOT NULL,
  specialty_fr VARCHAR,
  first_registration_year TEXT,
  professional_email TEXT,
  phone_number TEXT,
  supervisor_ar VARCHAR NOT NULL,
  thesis_title_ar TEXT,
  thesis_title_fr TEXT,
  research_lab_ar VARCHAR DEFAULT '',
  status VARCHAR DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phd_lmd_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phd_science_students ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all on phd_lmd_students" ON public.phd_lmd_students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on phd_science_students" ON public.phd_science_students FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_phd_lmd_students_updated_at
  BEFORE UPDATE ON public.phd_lmd_students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_phd_science_students_updated_at
  BEFORE UPDATE ON public.phd_science_students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add enum type for PhD student type
DO $$ BEGIN
  CREATE TYPE public.phd_student_type AS ENUM ('phd_lmd', 'phd_science');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;