
-- جدول طلبة طور المناقشة - دكتوراه ل م د
CREATE TABLE public.defense_stage_lmd (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    -- بيانات الطالب الأساسية (منقولة من phd_lmd_students)
    registration_number VARCHAR NOT NULL DEFAULT '',
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
    field_ar VARCHAR NOT NULL DEFAULT '',
    field_fr VARCHAR,
    branch_ar VARCHAR NOT NULL,
    branch_fr VARCHAR,
    specialty_ar VARCHAR NOT NULL,
    specialty_fr VARCHAR,
    first_registration_year TEXT,
    professional_email TEXT,
    phone_number TEXT,
    supervisor_ar VARCHAR NOT NULL,
    co_supervisor_ar VARCHAR,
    supervisor_university VARCHAR,
    co_supervisor_university VARCHAR,
    thesis_title_ar TEXT,
    thesis_title_fr TEXT,
    thesis_language VARCHAR DEFAULT 'arabic',
    research_lab_ar VARCHAR DEFAULT '',
    employment_status VARCHAR,
    registration_type VARCHAR,
    inscription_status VARCHAR,
    current_year TEXT,
    registration_count INTEGER,
    notes TEXT,
    -- بيانات طور المناقشة (مُدخلة عند بدء الإجراءات)
    jury_president_ar VARCHAR NOT NULL,
    jury_president_fr VARCHAR,
    jury_members_ar TEXT NOT NULL,
    jury_members_fr TEXT,
    scientific_council_date DATE NOT NULL,
    -- حالة طور المناقشة
    stage_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (stage_status IN ('pending', 'authorized', 'defended')),
    defense_date DATE,
    province TEXT DEFAULT 'أم البواقي',
    signature_title TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول طلبة طور المناقشة - دكتوراه علوم
CREATE TABLE public.defense_stage_science (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_number VARCHAR NOT NULL DEFAULT '',
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
    field_ar VARCHAR NOT NULL DEFAULT '',
    field_fr VARCHAR,
    branch_ar VARCHAR NOT NULL,
    branch_fr VARCHAR,
    specialty_ar VARCHAR NOT NULL,
    specialty_fr VARCHAR,
    first_registration_year TEXT,
    professional_email TEXT,
    phone_number TEXT,
    supervisor_ar VARCHAR NOT NULL,
    co_supervisor_ar VARCHAR,
    supervisor_university VARCHAR,
    co_supervisor_university VARCHAR,
    thesis_title_ar TEXT,
    thesis_title_fr TEXT,
    thesis_language VARCHAR DEFAULT 'arabic',
    research_lab_ar VARCHAR DEFAULT '',
    employment_status VARCHAR,
    registration_type VARCHAR,
    inscription_status VARCHAR,
    current_year TEXT,
    registration_count INTEGER,
    notes TEXT,
    jury_president_ar VARCHAR NOT NULL,
    jury_president_fr VARCHAR,
    jury_members_ar TEXT NOT NULL,
    jury_members_fr TEXT,
    scientific_council_date DATE NOT NULL,
    stage_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (stage_status IN ('pending', 'authorized', 'defended')),
    defense_date DATE,
    province TEXT DEFAULT 'أم البواقي',
    signature_title TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.defense_stage_lmd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defense_stage_science ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on defense_stage_lmd" ON public.defense_stage_lmd FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on defense_stage_science" ON public.defense_stage_science FOR ALL TO public USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_defense_stage_lmd_name ON public.defense_stage_lmd(full_name_ar);
CREATE INDEX idx_defense_stage_science_name ON public.defense_stage_science(full_name_ar);
CREATE INDEX idx_defense_stage_lmd_status ON public.defense_stage_lmd(stage_status);
CREATE INDEX idx_defense_stage_science_status ON public.defense_stage_science(stage_status);
