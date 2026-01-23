
-- Create enum for certificate types
CREATE TYPE public.certificate_type AS ENUM ('bachelor', 'master', 'phd', 'training', 'excellence', 'participation', 'attendance', 'achievement');

-- Create enum for student status
CREATE TYPE public.student_status AS ENUM ('active', 'graduated', 'suspended', 'transferred');

-- Create enum for activity type
CREATE TYPE public.activity_type AS ENUM ('student_added', 'student_updated', 'student_deleted', 'template_added', 'template_updated', 'template_deleted', 'certificate_printed', 'settings_updated', 'backup_created');

-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  specialty VARCHAR(100),
  gpa DECIMAL(3,2) CHECK (gpa >= 0 AND gpa <= 4),
  status public.student_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  certificate_type public.certificate_type NOT NULL,
  language VARCHAR(10) DEFAULT 'ar',
  background_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Template fields table
CREATE TABLE public.template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) DEFAULT 'text',
  field_key VARCHAR(50) NOT NULL,
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0,
  font_size INT DEFAULT 14,
  font_name VARCHAR(50) DEFAULT 'IBM Plex Sans Arabic',
  font_color VARCHAR(20) DEFAULT '#000000',
  text_align VARCHAR(20) DEFAULT 'center',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Certificates table (issued certificates)
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  issued_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  certificate_number VARCHAR(50) UNIQUE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activity log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type public.activity_type NOT NULL,
  description TEXT NOT NULL,
  entity_id UUID,
  entity_type VARCHAR(50),
  created_by VARCHAR(100) DEFAULT 'النظام',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System settings table
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is an internal university system)
CREATE POLICY "Allow public read access on students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public insert on students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on students" ON public.students FOR DELETE USING (true);

CREATE POLICY "Allow public read access on templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Allow public insert on templates" ON public.templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on templates" ON public.templates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on templates" ON public.templates FOR DELETE USING (true);

CREATE POLICY "Allow public read access on template_fields" ON public.template_fields FOR SELECT USING (true);
CREATE POLICY "Allow public insert on template_fields" ON public.template_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on template_fields" ON public.template_fields FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on template_fields" ON public.template_fields FOR DELETE USING (true);

CREATE POLICY "Allow public read access on certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Allow public insert on certificates" ON public.certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on certificates" ON public.certificates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on certificates" ON public.certificates FOR DELETE USING (true);

CREATE POLICY "Allow public read access on activity_log" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert on activity_log" ON public.activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on activity_log" ON public.activity_log FOR DELETE USING (true);

CREATE POLICY "Allow public read access on settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on settings" ON public.settings FOR UPDATE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_students_specialty ON public.students(specialty);
CREATE INDEX idx_students_status ON public.students(status);
CREATE INDEX idx_certificates_student_id ON public.certificates(student_id);
CREATE INDEX idx_certificates_template_id ON public.certificates(template_id);
CREATE INDEX idx_template_fields_template_id ON public.template_fields(template_id);
CREATE INDEX idx_activity_log_type ON public.activity_log(activity_type);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at);
