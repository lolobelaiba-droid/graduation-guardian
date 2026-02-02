-- نظام الشهادات الجامعية - SQLite Schema
-- هذا الملف يحتوي على بنية قاعدة البيانات المحلية

-- جدول إعدادات النظام
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- جدول إعدادات المستخدم
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- جدول شهادات دكتوراه ل م د
CREATE TABLE IF NOT EXISTS phd_lmd_certificates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    student_number TEXT NOT NULL,
    full_name_ar TEXT NOT NULL,
    full_name_fr TEXT,
    date_of_birth TEXT NOT NULL,
    birthplace_ar TEXT NOT NULL,
    birthplace_fr TEXT,
    university_ar TEXT DEFAULT 'جامعة محمد خيضر بسكرة',
    university_fr TEXT DEFAULT 'Université Mohamed Khider Biskra',
    faculty_ar TEXT NOT NULL DEFAULT '',
    faculty_fr TEXT,
    thesis_title_ar TEXT NOT NULL,
    thesis_title_fr TEXT,
    field_ar TEXT NOT NULL,
    field_fr TEXT,
    branch_ar TEXT NOT NULL,
    branch_fr TEXT,
    specialty_ar TEXT NOT NULL,
    specialty_fr TEXT,
    mention TEXT NOT NULL DEFAULT 'honorable' CHECK(mention IN ('honorable', 'very_honorable')),
    defense_date TEXT NOT NULL,
    certificate_date TEXT NOT NULL DEFAULT (date('now')),
    jury_president_ar TEXT NOT NULL,
    jury_president_fr TEXT,
    jury_members_ar TEXT NOT NULL,
    jury_members_fr TEXT,
    gender TEXT DEFAULT 'male' CHECK(gender IN ('male', 'female')),
    first_registration_year TEXT,
    professional_email TEXT,
    phone_number TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- جدول شهادات دكتوراه علوم
CREATE TABLE IF NOT EXISTS phd_science_certificates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    student_number TEXT NOT NULL,
    full_name_ar TEXT NOT NULL,
    full_name_fr TEXT,
    date_of_birth TEXT NOT NULL,
    birthplace_ar TEXT NOT NULL,
    birthplace_fr TEXT,
    university_ar TEXT DEFAULT 'جامعة محمد خيضر بسكرة',
    university_fr TEXT DEFAULT 'Université Mohamed Khider Biskra',
    faculty_ar TEXT NOT NULL DEFAULT '',
    faculty_fr TEXT,
    thesis_title_ar TEXT NOT NULL,
    thesis_title_fr TEXT,
    branch_ar TEXT NOT NULL,
    branch_fr TEXT,
    specialty_ar TEXT NOT NULL,
    specialty_fr TEXT,
    mention TEXT NOT NULL DEFAULT 'honorable' CHECK(mention IN ('honorable', 'very_honorable')),
    defense_date TEXT NOT NULL,
    certificate_date TEXT NOT NULL DEFAULT (date('now')),
    jury_president_ar TEXT NOT NULL,
    jury_president_fr TEXT,
    jury_members_ar TEXT NOT NULL,
    jury_members_fr TEXT,
    gender TEXT DEFAULT 'male' CHECK(gender IN ('male', 'female')),
    first_registration_year TEXT,
    professional_email TEXT,
    phone_number TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- جدول شهادات الماجستير
CREATE TABLE IF NOT EXISTS master_certificates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    student_number TEXT NOT NULL,
    full_name_ar TEXT NOT NULL,
    full_name_fr TEXT,
    date_of_birth TEXT NOT NULL,
    birthplace_ar TEXT NOT NULL,
    birthplace_fr TEXT,
    university_ar TEXT DEFAULT 'جامعة محمد خيضر بسكرة',
    university_fr TEXT DEFAULT 'Université Mohamed Khider Biskra',
    faculty_ar TEXT NOT NULL DEFAULT '',
    faculty_fr TEXT,
    branch_ar TEXT NOT NULL,
    branch_fr TEXT,
    specialty_ar TEXT NOT NULL,
    specialty_fr TEXT,
    mention TEXT NOT NULL DEFAULT 'honorable' CHECK(mention IN ('honorable', 'very_honorable')),
    defense_date TEXT NOT NULL,
    certificate_date TEXT NOT NULL DEFAULT (date('now')),
    gender TEXT DEFAULT 'male' CHECK(gender IN ('male', 'female')),
    first_registration_year TEXT,
    professional_email TEXT,
    phone_number TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- جدول قوالب الشهادات
CREATE TABLE IF NOT EXISTS certificate_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    template_name TEXT NOT NULL,
    certificate_type TEXT NOT NULL CHECK(certificate_type IN ('phd_lmd', 'phd_science', 'master')),
    language TEXT NOT NULL DEFAULT 'ar' CHECK(language IN ('ar', 'fr', 'en', 'ar_fr', 'ar_en', 'fr_en', 'ar_fr_en')),
    page_orientation TEXT DEFAULT 'portrait',
    page_size TEXT DEFAULT 'A4',
    is_active INTEGER DEFAULT 1,
    background_image_url TEXT,
    background_scale REAL DEFAULT 100,
    background_offset_x REAL DEFAULT 0,
    background_offset_y REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- جدول حقول القوالب
CREATE TABLE IF NOT EXISTS certificate_template_fields (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    template_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_name_ar TEXT NOT NULL,
    field_name_fr TEXT,
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    font_size INTEGER NOT NULL DEFAULT 12,
    font_name TEXT DEFAULT 'IBM Plex Sans Arabic',
    font_color TEXT DEFAULT '#000000',
    text_align TEXT DEFAULT 'center',
    is_rtl INTEGER DEFAULT 1,
    is_visible INTEGER DEFAULT 1,
    field_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES certificate_templates(id) ON DELETE CASCADE
);

-- جدول الخطوط المخصصة
CREATE TABLE IF NOT EXISTS custom_fonts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    font_name TEXT NOT NULL,
    font_family TEXT NOT NULL,
    font_url TEXT NOT NULL,
    font_weight TEXT DEFAULT 'normal',
    font_style TEXT DEFAULT 'normal',
    is_arabic INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- جدول خيارات القوائم المنسدلة
CREATE TABLE IF NOT EXISTS dropdown_options (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    option_type TEXT NOT NULL,
    option_value TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- جدول سجل النشاطات
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    activity_type TEXT NOT NULL CHECK(activity_type IN ('student_added', 'student_updated', 'student_deleted', 'template_added', 'template_updated', 'template_deleted', 'certificate_printed', 'settings_updated', 'backup_created')),
    description TEXT NOT NULL,
    entity_id TEXT,
    entity_type TEXT,
    created_by TEXT DEFAULT 'النظام',
    created_at TEXT DEFAULT (datetime('now'))
);

-- جدول سجل الطباعة
CREATE TABLE IF NOT EXISTS print_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    certificate_type TEXT NOT NULL CHECK(certificate_type IN ('phd_lmd', 'phd_science', 'master')),
    template_id TEXT,
    student_ids TEXT NOT NULL, -- JSON array stored as text
    printed_by TEXT DEFAULT 'النظام',
    printed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES certificate_templates(id) ON DELETE SET NULL
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_phd_lmd_student_number ON phd_lmd_certificates(student_number);
CREATE INDEX IF NOT EXISTS idx_phd_lmd_full_name_ar ON phd_lmd_certificates(full_name_ar);
CREATE INDEX IF NOT EXISTS idx_phd_science_student_number ON phd_science_certificates(student_number);
CREATE INDEX IF NOT EXISTS idx_phd_science_full_name_ar ON phd_science_certificates(full_name_ar);
CREATE INDEX IF NOT EXISTS idx_master_student_number ON master_certificates(student_number);
CREATE INDEX IF NOT EXISTS idx_master_full_name_ar ON master_certificates(full_name_ar);
CREATE INDEX IF NOT EXISTS idx_templates_type ON certificate_templates(certificate_type);
CREATE INDEX IF NOT EXISTS idx_template_fields_template ON certificate_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_date ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_type ON dropdown_options(option_type);
