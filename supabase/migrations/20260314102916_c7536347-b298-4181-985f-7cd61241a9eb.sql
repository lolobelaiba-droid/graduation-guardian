
CREATE TABLE public.defense_document_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type character varying NOT NULL,
  title character varying NOT NULL,
  content text NOT NULL DEFAULT '',
  font_family character varying DEFAULT 'IBM Plex Sans Arabic',
  font_size integer DEFAULT 14,
  line_height numeric DEFAULT 1.8,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(document_type)
);

ALTER TABLE public.defense_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on defense_document_templates"
  ON public.defense_document_templates
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

INSERT INTO public.defense_document_templates (document_type, title, content) VALUES
('jury_decision_lmd', 'مقرر تعيين لجنة المناقشة - دكتوراه ل م د', '<div style="text-align: center; font-weight: bold; font-size: 18px;">الجمهورية الجزائرية الديمقراطية الشعبية</div>
<div style="text-align: center;">وزارة التعليم العالي والبحث العلمي</div>
<div style="text-align: center;">{{university_ar}}</div>
<div style="text-align: center;">{{faculty_ar}}</div>
<br/>
<div style="text-align: center; font-weight: bold; font-size: 20px;">مقرر تعيين لجنة المناقشة</div>
<div style="text-align: center;">دكتوراه الطور الثالث (ل م د)</div>
<br/>
<div>بناءً على مداولات المجلس العلمي بتاريخ: {{scientific_council_date}}</div>
<br/>
<div>تم تعيين لجنة مناقشة أطروحة الدكتوراه للطالب(ة):</div>
<div>الاسم الكامل: {{full_name_ar}}</div>
<div>تاريخ الميلاد: {{date_of_birth}} بـ {{birthplace_ar}}</div>
<div>رقم التسجيل: {{registration_number}}</div>
<div>الميدان: {{field_ar}}</div>
<div>الفرع: {{branch_ar}}</div>
<div>التخصص: {{specialty_ar}}</div>
<div>عنوان الأطروحة: {{thesis_title_ar}}</div>
<div>المشرف: {{supervisor_ar}}</div>
<br/>
<div style="font-weight: bold;">تشكيلة اللجنة:</div>
<div>رئيس اللجنة: {{jury_president_ar}}</div>
<div>{{jury_members_ar}}</div>
<br/>
<div style="text-align: left;">{{signature_title}}</div>'),

('jury_decision_science', 'مقرر تعيين لجنة المناقشة - دكتوراه علوم', '<div style="text-align: center; font-weight: bold; font-size: 18px;">الجمهورية الجزائرية الديمقراطية الشعبية</div>
<div style="text-align: center;">وزارة التعليم العالي والبحث العلمي</div>
<div style="text-align: center;">{{university_ar}}</div>
<div style="text-align: center;">{{faculty_ar}}</div>
<br/>
<div style="text-align: center; font-weight: bold; font-size: 20px;">مقرر تعيين لجنة المناقشة</div>
<div style="text-align: center;">دكتوراه علوم</div>
<br/>
<div>بناءً على مداولات المجلس العلمي بتاريخ: {{scientific_council_date}}</div>
<br/>
<div>تم تعيين لجنة مناقشة أطروحة الدكتوراه للطالب(ة):</div>
<div>الاسم الكامل: {{full_name_ar}}</div>
<div>تاريخ الميلاد: {{date_of_birth}} بـ {{birthplace_ar}}</div>
<div>رقم التسجيل: {{registration_number}}</div>
<div>الميدان: {{field_ar}}</div>
<div>الفرع: {{branch_ar}}</div>
<div>التخصص: {{specialty_ar}}</div>
<div>عنوان الأطروحة: {{thesis_title_ar}}</div>
<div>المشرف: {{supervisor_ar}}</div>
<br/>
<div style="font-weight: bold;">تشكيلة اللجنة:</div>
<div>رئيس اللجنة: {{jury_president_ar}}</div>
<div>{{jury_members_ar}}</div>
<br/>
<div style="text-align: left;">{{signature_title}}</div>'),

('defense_auth_lmd', 'الترخيص بالمناقشة - دكتوراه ل م د', '<div style="text-align: center; font-weight: bold; font-size: 18px;">الجمهورية الجزائرية الديمقراطية الشعبية</div>
<div style="text-align: center;">وزارة التعليم العالي والبحث العلمي</div>
<div style="text-align: center;">{{university_ar}}</div>
<div style="text-align: center;">{{faculty_ar}}</div>
<br/>
<div style="text-align: center; font-weight: bold; font-size: 20px;">ترخيص بالمناقشة</div>
<div style="text-align: center;">دكتوراه الطور الثالث (ل م د)</div>
<br/>
<div>يرخص للطالب(ة): {{full_name_ar}}</div>
<div>المولود(ة) في: {{date_of_birth}} بـ {{birthplace_ar}}</div>
<div>رقم التسجيل: {{registration_number}}</div>
<div>الميدان: {{field_ar}}</div>
<div>الفرع: {{branch_ar}}</div>
<div>التخصص: {{specialty_ar}}</div>
<br/>
<div>بمناقشة أطروحته(ا) الموسومة بـ:</div>
<div style="font-weight: bold; text-align: center;">{{thesis_title_ar}}</div>
<br/>
<div>تحت إشراف: {{supervisor_ar}}</div>
<div>تاريخ المناقشة: {{defense_date}}</div>
<br/>
<div style="font-weight: bold;">أمام اللجنة المكونة من:</div>
<div>رئيس اللجنة: {{jury_president_ar}}</div>
<div>{{jury_members_ar}}</div>
<br/>
<div style="text-align: left;">{{signature_title}}</div>'),

('defense_auth_science', 'الترخيص بالمناقشة - دكتوراه علوم', '<div style="text-align: center; font-weight: bold; font-size: 18px;">الجمهورية الجزائرية الديمقراطية الشعبية</div>
<div style="text-align: center;">وزارة التعليم العالي والبحث العلمي</div>
<div style="text-align: center;">{{university_ar}}</div>
<div style="text-align: center;">{{faculty_ar}}</div>
<br/>
<div style="text-align: center; font-weight: bold; font-size: 20px;">ترخيص بالمناقشة</div>
<div style="text-align: center;">دكتوراه علوم</div>
<br/>
<div>يرخص للطالب(ة): {{full_name_ar}}</div>
<div>المولود(ة) في: {{date_of_birth}} بـ {{birthplace_ar}}</div>
<div>رقم التسجيل: {{registration_number}}</div>
<div>الميدان: {{field_ar}}</div>
<div>الفرع: {{branch_ar}}</div>
<div>التخصص: {{specialty_ar}}</div>
<br/>
<div>بمناقشة أطروحته(ا) الموسومة بـ:</div>
<div style="font-weight: bold; text-align: center;">{{thesis_title_ar}}</div>
<br/>
<div>تحت إشراف: {{supervisor_ar}}</div>
<div>تاريخ المناقشة: {{defense_date}}</div>
<br/>
<div style="font-weight: bold;">أمام اللجنة المكونة من:</div>
<div>رئيس اللجنة: {{jury_president_ar}}</div>
<div>{{jury_members_ar}}</div>
<br/>
<div style="text-align: left;">{{signature_title}}</div>');
