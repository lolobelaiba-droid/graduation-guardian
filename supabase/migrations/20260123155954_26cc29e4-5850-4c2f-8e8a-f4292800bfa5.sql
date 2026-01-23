-- Drop old tables (cascade to remove dependencies)
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.template_fields CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS public.certificate_type CASCADE;
DROP TYPE IF EXISTS public.student_status CASCADE;

-- Create new enums
CREATE TYPE public.certificate_type AS ENUM ('phd_lmd', 'phd_science', 'master');
CREATE TYPE public.template_language AS ENUM ('ar', 'fr', 'en', 'ar_fr', 'ar_en', 'fr_en', 'ar_fr_en');
CREATE TYPE public.mention_type AS ENUM ('excellent', 'very_good', 'good', 'fairly_good', 'passable');

-- ============================================
-- PhD LMD Certificates Table
-- ============================================
CREATE TABLE public.phd_lmd_certificates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_number VARCHAR(50) NOT NULL UNIQUE,
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_fr VARCHAR(255),
    date_of_birth DATE NOT NULL,
    birthplace_ar VARCHAR(255) NOT NULL,
    birthplace_fr VARCHAR(255),
    thesis_title_ar TEXT NOT NULL,
    thesis_title_fr TEXT,
    field_ar VARCHAR(255) NOT NULL,
    field_fr VARCHAR(255),
    branch_ar VARCHAR(255) NOT NULL,
    branch_fr VARCHAR(255),
    specialty_ar VARCHAR(255) NOT NULL,
    specialty_fr VARCHAR(255),
    mention mention_type NOT NULL DEFAULT 'good',
    defense_date DATE NOT NULL,
    jury_president_ar VARCHAR(255) NOT NULL,
    jury_president_fr VARCHAR(255),
    jury_members_ar TEXT NOT NULL,
    jury_members_fr TEXT,
    certificate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PhD Science Certificates Table
-- ============================================
CREATE TABLE public.phd_science_certificates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_number VARCHAR(50) NOT NULL UNIQUE,
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_fr VARCHAR(255),
    date_of_birth DATE NOT NULL,
    birthplace_ar VARCHAR(255) NOT NULL,
    birthplace_fr VARCHAR(255),
    thesis_title_ar TEXT NOT NULL,
    thesis_title_fr TEXT,
    branch_ar VARCHAR(255) NOT NULL,
    branch_fr VARCHAR(255),
    specialty_ar VARCHAR(255) NOT NULL,
    specialty_fr VARCHAR(255),
    mention mention_type NOT NULL DEFAULT 'good',
    defense_date DATE NOT NULL,
    jury_president_ar VARCHAR(255) NOT NULL,
    jury_president_fr VARCHAR(255),
    jury_members_ar TEXT NOT NULL,
    jury_members_fr TEXT,
    certificate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Master Certificates Table
-- ============================================
CREATE TABLE public.master_certificates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_number VARCHAR(50) NOT NULL UNIQUE,
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_fr VARCHAR(255),
    date_of_birth DATE NOT NULL,
    birthplace_ar VARCHAR(255) NOT NULL,
    birthplace_fr VARCHAR(255),
    branch_ar VARCHAR(255) NOT NULL,
    branch_fr VARCHAR(255),
    specialty_ar VARCHAR(255) NOT NULL,
    specialty_fr VARCHAR(255),
    mention mention_type NOT NULL DEFAULT 'good',
    defense_date DATE NOT NULL,
    certificate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Templates Table (for storing field positions)
-- ============================================
CREATE TABLE public.certificate_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    certificate_type certificate_type NOT NULL,
    language template_language NOT NULL DEFAULT 'ar',
    page_orientation VARCHAR(20) DEFAULT 'portrait',
    page_size VARCHAR(20) DEFAULT 'A4',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(certificate_type, language)
);

-- ============================================
-- Template Fields Table (X/Y positions in mm)
-- ============================================
CREATE TABLE public.certificate_template_fields (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.certificate_templates(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    field_name_ar VARCHAR(255) NOT NULL,
    field_name_fr VARCHAR(255),
    position_x DECIMAL(10,2) NOT NULL DEFAULT 0,
    position_y DECIMAL(10,2) NOT NULL DEFAULT 0,
    font_size INTEGER NOT NULL DEFAULT 12,
    font_name VARCHAR(100) DEFAULT 'IBM Plex Sans Arabic',
    font_color VARCHAR(20) DEFAULT '#000000',
    text_align VARCHAR(20) DEFAULT 'center',
    is_rtl BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    field_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(template_id, field_key)
);

-- ============================================
-- Print History Table
-- ============================================
CREATE TABLE public.print_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    certificate_type certificate_type NOT NULL,
    student_ids UUID[] NOT NULL,
    template_id UUID REFERENCES public.certificate_templates(id),
    printed_at TIMESTAMPTZ DEFAULT now(),
    printed_by VARCHAR(255) DEFAULT 'النظام'
);

-- ============================================
-- User Settings Table (for auto-save)
-- ============================================
CREATE TABLE public.user_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.phd_lmd_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phd_science_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies (Permissive for internal use)
-- ============================================
-- PhD LMD
CREATE POLICY "Allow all on phd_lmd_certificates" ON public.phd_lmd_certificates FOR ALL USING (true) WITH CHECK (true);

-- PhD Science
CREATE POLICY "Allow all on phd_science_certificates" ON public.phd_science_certificates FOR ALL USING (true) WITH CHECK (true);

-- Master
CREATE POLICY "Allow all on master_certificates" ON public.master_certificates FOR ALL USING (true) WITH CHECK (true);

-- Templates
CREATE POLICY "Allow all on certificate_templates" ON public.certificate_templates FOR ALL USING (true) WITH CHECK (true);

-- Template Fields
CREATE POLICY "Allow all on certificate_template_fields" ON public.certificate_template_fields FOR ALL USING (true) WITH CHECK (true);

-- Print History
CREATE POLICY "Allow all on print_history" ON public.print_history FOR ALL USING (true) WITH CHECK (true);

-- User Settings
CREATE POLICY "Allow all on user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE TRIGGER update_phd_lmd_updated_at BEFORE UPDATE ON public.phd_lmd_certificates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_phd_science_updated_at BEFORE UPDATE ON public.phd_science_certificates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_updated_at BEFORE UPDATE ON public.master_certificates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificate_templates_updated_at BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_phd_lmd_student_number ON public.phd_lmd_certificates(student_number);
CREATE INDEX idx_phd_science_student_number ON public.phd_science_certificates(student_number);
CREATE INDEX idx_master_student_number ON public.master_certificates(student_number);
CREATE INDEX idx_template_fields_template_id ON public.certificate_template_fields(template_id);
CREATE INDEX idx_print_history_type ON public.print_history(certificate_type);