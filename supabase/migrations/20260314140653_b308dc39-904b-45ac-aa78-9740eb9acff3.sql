
-- Add decree columns to defense_stage_lmd
ALTER TABLE public.defense_stage_lmd
  ADD COLUMN decree_training text NULL,
  ADD COLUMN decree_accreditation text NULL;

-- Add decree columns to defense_stage_science
ALTER TABLE public.defense_stage_science
  ADD COLUMN decree_training text NULL,
  ADD COLUMN decree_accreditation text NULL;

-- Insert default decree options
INSERT INTO public.dropdown_options (option_type, option_value, display_order) VALUES
  ('decree_training', 'القرار رقم 961 المؤرخ في 02 ديسمبر 2020 الذي يحدد كيفيات تنظيم التكوين في الطور الثالث وشروط إعداد أطروحة الدكتوراه ومناقشتها', 1),
  ('decree_accreditation', 'القرار رقم 962 المؤرخ في 02 ديسمبر 2020 والمتضمن تأهيل مؤسسات التعليم العالي لضمان التكوين لنيل شهادة الدكتوراه ويحدد عدد المناصب المفتوحة بعنوان السنة الجامعية 2020/2021', 1);
