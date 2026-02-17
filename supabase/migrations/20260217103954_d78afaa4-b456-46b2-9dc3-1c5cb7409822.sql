
-- Drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Allow all on phd_lmd_certificates" ON public.phd_lmd_certificates;
CREATE POLICY "Allow all on phd_lmd_certificates" ON public.phd_lmd_certificates AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on phd_science_certificates" ON public.phd_science_certificates;
CREATE POLICY "Allow all on phd_science_certificates" ON public.phd_science_certificates AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on master_certificates" ON public.master_certificates;
CREATE POLICY "Allow all on master_certificates" ON public.master_certificates AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on phd_lmd_students" ON public.phd_lmd_students;
CREATE POLICY "Allow all on phd_lmd_students" ON public.phd_lmd_students AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on phd_science_students" ON public.phd_science_students;
CREATE POLICY "Allow all on phd_science_students" ON public.phd_science_students AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on certificate_templates" ON public.certificate_templates;
CREATE POLICY "Allow all on certificate_templates" ON public.certificate_templates AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on certificate_template_fields" ON public.certificate_template_fields;
CREATE POLICY "Allow all on certificate_template_fields" ON public.certificate_template_fields AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on user_settings" ON public.user_settings;
CREATE POLICY "Allow all on user_settings" ON public.user_settings AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public insert on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public update on settings" ON public.settings;
CREATE POLICY "Allow all on settings" ON public.settings AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on dropdown_options" ON public.dropdown_options;
CREATE POLICY "Allow all on dropdown_options" ON public.dropdown_options AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on custom_fields" ON public.custom_fields;
CREATE POLICY "Allow all on custom_fields" ON public.custom_fields AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on custom_field_values" ON public.custom_field_values;
CREATE POLICY "Allow all on custom_field_values" ON public.custom_field_values AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on custom_field_options" ON public.custom_field_options;
CREATE POLICY "Allow all on custom_field_options" ON public.custom_field_options AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on print_history" ON public.print_history;
CREATE POLICY "Allow all on print_history" ON public.print_history AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on academic_titles" ON public.academic_titles;
CREATE POLICY "Allow all on academic_titles" ON public.academic_titles AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on notes" ON public.notes;
CREATE POLICY "Allow all on notes" ON public.notes AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view fonts" ON public.custom_fonts;
DROP POLICY IF EXISTS "Anyone can insert fonts" ON public.custom_fonts;
DROP POLICY IF EXISTS "Anyone can delete fonts" ON public.custom_fonts;
CREATE POLICY "Allow all on custom_fonts" ON public.custom_fonts AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow public insert on activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow public delete on activity_log" ON public.activity_log;
CREATE POLICY "Allow all on activity_log" ON public.activity_log AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
