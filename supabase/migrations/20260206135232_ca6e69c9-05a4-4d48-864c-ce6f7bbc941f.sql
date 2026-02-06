-- Create custom fields definition table
CREATE TABLE public.custom_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key varchar NOT NULL UNIQUE,
    field_name_ar varchar NOT NULL,
    field_name_fr varchar,
    field_type varchar NOT NULL DEFAULT 'text', -- text, number, date, select
    target_table varchar NOT NULL, -- phd_candidates, defended_students
    is_required boolean DEFAULT false,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create custom field options for select-type fields
CREATE TABLE public.custom_field_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id uuid REFERENCES public.custom_fields(id) ON DELETE CASCADE NOT NULL,
    option_value varchar NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Create custom field values storage (EAV pattern)
CREATE TABLE public.custom_field_values (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id uuid REFERENCES public.custom_fields(id) ON DELETE CASCADE NOT NULL,
    record_id uuid NOT NULL, -- Reference to the student/certificate record
    record_type varchar NOT NULL, -- phd_lmd_students, phd_science_students, phd_lmd_certificates, etc.
    value text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(field_id, record_id, record_type)
);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all on custom_fields" ON public.custom_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on custom_field_options" ON public.custom_field_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on custom_field_values" ON public.custom_field_values FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_custom_fields_updated_at
    BEFORE UPDATE ON public.custom_fields
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_field_values_updated_at
    BEFORE UPDATE ON public.custom_field_values
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();