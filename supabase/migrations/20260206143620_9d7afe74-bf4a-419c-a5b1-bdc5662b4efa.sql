-- Add value_ar and value_fr columns to dropdown_options for bilingual support
ALTER TABLE public.dropdown_options
ADD COLUMN IF NOT EXISTS value_ar character varying,
ADD COLUMN IF NOT EXISTS value_fr character varying;

-- Insert employment status options (bilingual)
INSERT INTO public.dropdown_options (option_type, option_value, value_ar, value_fr, display_order) VALUES
('employment_status', 'maitre_assistant_a', 'أستاذ مساعد أ', 'Maître-Assistant A', 1),
('employment_status', 'maitre_assistant_b', 'أستاذ مساعد ب', 'Maître-Assistant B', 2),
('employment_status', 'attache_recherche_b', 'ملحق بالبحث ب', 'Attaché de Recherche B', 3),
('employment_status', 'attache_recherche_a', 'ملحق بالبحث أ', 'Attaché de Recherche A', 4),
('employment_status', 'salarie_mesrs', 'موظف في قطاع التعليم العالي', 'Salarié MESRS non enseignant', 5),
('employment_status', 'salarie_hors_mesrs', 'موظف خارج قطاع التعليم العالي', 'Salarié Hors MESRS', 6),
('employment_status', 'non_salarie', 'غير موظف', 'Non Salarié', 7)
ON CONFLICT DO NOTHING;

-- Insert registration type options (bilingual)
INSERT INTO public.dropdown_options (option_type, option_value, value_ar, value_fr, display_order) VALUES
('registration_type', 'admis_concours', 'ناجح في مسابقة الدكتوراه', 'Admis au concours', 1),
('registration_type', 'titre_magister', 'حامل للماجستير', 'Sur titre de magister', 2),
('registration_type', 'cooperation', 'في اطار التعاون', 'Cadre de la coopération', 3),
('registration_type', 'convention_mdn', 'اتفاقية مع القطاع العسكري', 'Convention avec le MDN', 4),
('registration_type', 'convention_recherche', 'اتفاقية مع مركز بحث', 'Convention avec Centre de Recherche', 5)
ON CONFLICT DO NOTHING;

-- Insert inscription status options (bilingual)
INSERT INTO public.dropdown_options (option_type, option_value, value_ar, value_fr, display_order) VALUES
('inscription_status', 'inscrit_regulier', 'تسجيل منتظم', 'Inscrit régulier', 1),
('inscription_status', 'retardataire', 'متأخر', 'Retardataire', 2),
('inscription_status', 'abandon', 'منقطع', 'En Abandon', 3),
('inscription_status', 'exclu', 'مقصى', 'Exclu', 4)
ON CONFLICT DO NOTHING;