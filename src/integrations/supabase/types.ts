export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_titles: {
        Row: {
          abbreviation: string
          created_at: string
          display_order: number | null
          full_name: string
          id: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          display_order?: number | null
          full_name: string
          id?: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          display_order?: number | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string | null
          created_by: string | null
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          created_by?: string | null
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          created_by?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      certificate_template_fields: {
        Row: {
          created_at: string | null
          field_key: string
          field_name_ar: string
          field_name_fr: string | null
          field_order: number | null
          font_color: string | null
          font_name: string | null
          font_size: number
          id: string
          is_rtl: boolean | null
          is_visible: boolean | null
          position_x: number
          position_y: number
          template_id: string
          text_align: string | null
        }
        Insert: {
          created_at?: string | null
          field_key: string
          field_name_ar: string
          field_name_fr?: string | null
          field_order?: number | null
          font_color?: string | null
          font_name?: string | null
          font_size?: number
          id?: string
          is_rtl?: boolean | null
          is_visible?: boolean | null
          position_x?: number
          position_y?: number
          template_id: string
          text_align?: string | null
        }
        Update: {
          created_at?: string | null
          field_key?: string
          field_name_ar?: string
          field_name_fr?: string | null
          field_order?: number | null
          font_color?: string | null
          font_name?: string | null
          font_size?: number
          id?: string
          is_rtl?: boolean | null
          is_visible?: boolean | null
          position_x?: number
          position_y?: number
          template_id?: string
          text_align?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          background_image_url: string | null
          background_offset_x: number | null
          background_offset_y: number | null
          background_scale: number | null
          background_scale_x: number | null
          background_scale_y: number | null
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          created_at: string | null
          id: string
          is_active: boolean | null
          language: Database["public"]["Enums"]["template_language"]
          page_orientation: string | null
          page_size: string | null
          print_custom_height: number | null
          print_custom_width: number | null
          print_margin_bottom: number | null
          print_margin_left: number | null
          print_margin_right: number | null
          print_margin_top: number | null
          print_paper_size: string | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          background_image_url?: string | null
          background_offset_x?: number | null
          background_offset_y?: number | null
          background_scale?: number | null
          background_scale_x?: number | null
          background_scale_y?: number | null
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: Database["public"]["Enums"]["template_language"]
          page_orientation?: string | null
          page_size?: string | null
          print_custom_height?: number | null
          print_custom_width?: number | null
          print_margin_bottom?: number | null
          print_margin_left?: number | null
          print_margin_right?: number | null
          print_margin_top?: number | null
          print_paper_size?: string | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          background_image_url?: string | null
          background_offset_x?: number | null
          background_offset_y?: number | null
          background_scale?: number | null
          background_scale_x?: number | null
          background_scale_y?: number | null
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: Database["public"]["Enums"]["template_language"]
          page_orientation?: string | null
          page_size?: string | null
          print_custom_height?: number | null
          print_custom_width?: number | null
          print_margin_bottom?: number | null
          print_margin_left?: number | null
          print_margin_right?: number | null
          print_margin_top?: number | null
          print_paper_size?: string | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_field_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_id: string
          id: string
          option_value: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_id: string
          id?: string
          option_value: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_id?: string
          id?: string
          option_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string | null
          field_id: string
          id: string
          record_id: string
          record_type: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          field_id: string
          id?: string
          record_id: string
          record_type: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string
          id?: string
          record_id?: string
          record_type?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_key: string
          field_name_ar: string
          field_name_fr: string | null
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          target_table: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_key: string
          field_name_ar: string
          field_name_fr?: string | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          target_table: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_key?: string
          field_name_ar?: string
          field_name_fr?: string | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          target_table?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_fonts: {
        Row: {
          created_at: string
          font_family: string
          font_name: string
          font_style: string | null
          font_url: string
          font_weight: string | null
          id: string
          is_arabic: boolean | null
        }
        Insert: {
          created_at?: string
          font_family: string
          font_name: string
          font_style?: string | null
          font_url: string
          font_weight?: string | null
          id?: string
          is_arabic?: boolean | null
        }
        Update: {
          created_at?: string
          font_family?: string
          font_name?: string
          font_style?: string | null
          font_url?: string
          font_weight?: string | null
          id?: string
          is_arabic?: boolean | null
        }
        Relationships: []
      }
      dropdown_options: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          option_type: string
          option_value: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          option_type: string
          option_value: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          option_type?: string
          option_value?: string
        }
        Relationships: []
      }
      master_certificates: {
        Row: {
          birthplace_ar: string
          birthplace_fr: string | null
          branch_ar: string
          branch_fr: string | null
          certificate_date: string
          created_at: string | null
          date_of_birth: string
          defense_date: string
          faculty_ar: string
          faculty_fr: string | null
          first_registration_year: string | null
          full_name_ar: string
          full_name_fr: string | null
          gender: string | null
          id: string
          mention: Database["public"]["Enums"]["mention_type"]
          phone_number: string | null
          professional_email: string | null
          research_lab_ar: string | null
          specialty_ar: string
          specialty_fr: string | null
          student_number: string
          supervisor_ar: string
          university_ar: string | null
          university_fr: string | null
          updated_at: string | null
        }
        Insert: {
          birthplace_ar: string
          birthplace_fr?: string | null
          branch_ar: string
          branch_fr?: string | null
          certificate_date?: string
          created_at?: string | null
          date_of_birth: string
          defense_date: string
          faculty_ar?: string
          faculty_fr?: string | null
          first_registration_year?: string | null
          full_name_ar: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          mention?: Database["public"]["Enums"]["mention_type"]
          phone_number?: string | null
          professional_email?: string | null
          research_lab_ar?: string | null
          specialty_ar: string
          specialty_fr?: string | null
          student_number: string
          supervisor_ar: string
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          birthplace_ar?: string
          birthplace_fr?: string | null
          branch_ar?: string
          branch_fr?: string | null
          certificate_date?: string
          created_at?: string | null
          date_of_birth?: string
          defense_date?: string
          faculty_ar?: string
          faculty_fr?: string | null
          first_registration_year?: string | null
          full_name_ar?: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          mention?: Database["public"]["Enums"]["mention_type"]
          phone_number?: string | null
          professional_email?: string | null
          research_lab_ar?: string | null
          specialty_ar?: string
          specialty_fr?: string | null
          student_number?: string
          supervisor_ar?: string
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      phd_lmd_certificates: {
        Row: {
          birthplace_ar: string
          birthplace_fr: string | null
          branch_ar: string
          branch_fr: string | null
          certificate_date: string
          created_at: string | null
          date_of_birth: string
          defense_date: string
          faculty_ar: string
          faculty_fr: string | null
          field_ar: string
          field_fr: string | null
          first_registration_year: string | null
          full_name_ar: string
          full_name_fr: string | null
          gender: string | null
          id: string
          jury_members_ar: string
          jury_members_fr: string | null
          jury_president_ar: string
          jury_president_fr: string | null
          mention: Database["public"]["Enums"]["mention_type"]
          phone_number: string | null
          professional_email: string | null
          research_lab_ar: string | null
          specialty_ar: string
          specialty_fr: string | null
          student_number: string
          supervisor_ar: string
          thesis_title_ar: string
          thesis_title_fr: string | null
          university_ar: string | null
          university_fr: string | null
          updated_at: string | null
        }
        Insert: {
          birthplace_ar: string
          birthplace_fr?: string | null
          branch_ar: string
          branch_fr?: string | null
          certificate_date?: string
          created_at?: string | null
          date_of_birth: string
          defense_date: string
          faculty_ar?: string
          faculty_fr?: string | null
          field_ar: string
          field_fr?: string | null
          first_registration_year?: string | null
          full_name_ar: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          jury_members_ar: string
          jury_members_fr?: string | null
          jury_president_ar: string
          jury_president_fr?: string | null
          mention?: Database["public"]["Enums"]["mention_type"]
          phone_number?: string | null
          professional_email?: string | null
          research_lab_ar?: string | null
          specialty_ar: string
          specialty_fr?: string | null
          student_number: string
          supervisor_ar: string
          thesis_title_ar: string
          thesis_title_fr?: string | null
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          birthplace_ar?: string
          birthplace_fr?: string | null
          branch_ar?: string
          branch_fr?: string | null
          certificate_date?: string
          created_at?: string | null
          date_of_birth?: string
          defense_date?: string
          faculty_ar?: string
          faculty_fr?: string | null
          field_ar?: string
          field_fr?: string | null
          first_registration_year?: string | null
          full_name_ar?: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          jury_members_ar?: string
          jury_members_fr?: string | null
          jury_president_ar?: string
          jury_president_fr?: string | null
          mention?: Database["public"]["Enums"]["mention_type"]
          phone_number?: string | null
          professional_email?: string | null
          research_lab_ar?: string | null
          specialty_ar?: string
          specialty_fr?: string | null
          student_number?: string
          supervisor_ar?: string
          thesis_title_ar?: string
          thesis_title_fr?: string | null
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      phd_lmd_students: {
        Row: {
          birthplace_ar: string
          birthplace_fr: string | null
          branch_ar: string
          branch_fr: string | null
          created_at: string | null
          date_of_birth: string
          faculty_ar: string
          faculty_fr: string | null
          field_ar: string
          field_fr: string | null
          first_registration_year: string | null
          full_name_ar: string
          full_name_fr: string | null
          gender: string | null
          id: string
          notes: string | null
          phone_number: string | null
          professional_email: string | null
          registration_number: string
          research_lab_ar: string | null
          specialty_ar: string
          specialty_fr: string | null
          status: string | null
          supervisor_ar: string
          thesis_title_ar: string | null
          thesis_title_fr: string | null
          university_ar: string | null
          university_fr: string | null
          updated_at: string | null
        }
        Insert: {
          birthplace_ar: string
          birthplace_fr?: string | null
          branch_ar: string
          branch_fr?: string | null
          created_at?: string | null
          date_of_birth: string
          faculty_ar?: string
          faculty_fr?: string | null
          field_ar: string
          field_fr?: string | null
          first_registration_year?: string | null
          full_name_ar: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          phone_number?: string | null
          professional_email?: string | null
          registration_number: string
          research_lab_ar?: string | null
          specialty_ar: string
          specialty_fr?: string | null
          status?: string | null
          supervisor_ar: string
          thesis_title_ar?: string | null
          thesis_title_fr?: string | null
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          birthplace_ar?: string
          birthplace_fr?: string | null
          branch_ar?: string
          branch_fr?: string | null
          created_at?: string | null
          date_of_birth?: string
          faculty_ar?: string
          faculty_fr?: string | null
          field_ar?: string
          field_fr?: string | null
          first_registration_year?: string | null
          full_name_ar?: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          phone_number?: string | null
          professional_email?: string | null
          registration_number?: string
          research_lab_ar?: string | null
          specialty_ar?: string
          specialty_fr?: string | null
          status?: string | null
          supervisor_ar?: string
          thesis_title_ar?: string | null
          thesis_title_fr?: string | null
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      phd_science_certificates: {
        Row: {
          birthplace_ar: string
          birthplace_fr: string | null
          branch_ar: string
          branch_fr: string | null
          certificate_date: string
          created_at: string | null
          date_of_birth: string
          defense_date: string
          faculty_ar: string
          faculty_fr: string | null
          first_registration_year: string | null
          full_name_ar: string
          full_name_fr: string | null
          gender: string | null
          id: string
          jury_members_ar: string
          jury_members_fr: string | null
          jury_president_ar: string
          jury_president_fr: string | null
          mention: Database["public"]["Enums"]["mention_type"]
          phone_number: string | null
          professional_email: string | null
          research_lab_ar: string | null
          specialty_ar: string
          specialty_fr: string | null
          student_number: string
          supervisor_ar: string
          thesis_title_ar: string
          thesis_title_fr: string | null
          university_ar: string | null
          university_fr: string | null
          updated_at: string | null
        }
        Insert: {
          birthplace_ar: string
          birthplace_fr?: string | null
          branch_ar: string
          branch_fr?: string | null
          certificate_date?: string
          created_at?: string | null
          date_of_birth: string
          defense_date: string
          faculty_ar?: string
          faculty_fr?: string | null
          first_registration_year?: string | null
          full_name_ar: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          jury_members_ar: string
          jury_members_fr?: string | null
          jury_president_ar: string
          jury_president_fr?: string | null
          mention?: Database["public"]["Enums"]["mention_type"]
          phone_number?: string | null
          professional_email?: string | null
          research_lab_ar?: string | null
          specialty_ar: string
          specialty_fr?: string | null
          student_number: string
          supervisor_ar: string
          thesis_title_ar: string
          thesis_title_fr?: string | null
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          birthplace_ar?: string
          birthplace_fr?: string | null
          branch_ar?: string
          branch_fr?: string | null
          certificate_date?: string
          created_at?: string | null
          date_of_birth?: string
          defense_date?: string
          faculty_ar?: string
          faculty_fr?: string | null
          first_registration_year?: string | null
          full_name_ar?: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          jury_members_ar?: string
          jury_members_fr?: string | null
          jury_president_ar?: string
          jury_president_fr?: string | null
          mention?: Database["public"]["Enums"]["mention_type"]
          phone_number?: string | null
          professional_email?: string | null
          research_lab_ar?: string | null
          specialty_ar?: string
          specialty_fr?: string | null
          student_number?: string
          supervisor_ar?: string
          thesis_title_ar?: string
          thesis_title_fr?: string | null
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      phd_science_students: {
        Row: {
          birthplace_ar: string
          birthplace_fr: string | null
          branch_ar: string
          branch_fr: string | null
          created_at: string | null
          date_of_birth: string
          faculty_ar: string
          faculty_fr: string | null
          first_registration_year: string | null
          full_name_ar: string
          full_name_fr: string | null
          gender: string | null
          id: string
          notes: string | null
          phone_number: string | null
          professional_email: string | null
          registration_number: string
          research_lab_ar: string | null
          specialty_ar: string
          specialty_fr: string | null
          status: string | null
          supervisor_ar: string
          thesis_title_ar: string | null
          thesis_title_fr: string | null
          university_ar: string | null
          university_fr: string | null
          updated_at: string | null
        }
        Insert: {
          birthplace_ar: string
          birthplace_fr?: string | null
          branch_ar: string
          branch_fr?: string | null
          created_at?: string | null
          date_of_birth: string
          faculty_ar?: string
          faculty_fr?: string | null
          first_registration_year?: string | null
          full_name_ar: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          phone_number?: string | null
          professional_email?: string | null
          registration_number: string
          research_lab_ar?: string | null
          specialty_ar: string
          specialty_fr?: string | null
          status?: string | null
          supervisor_ar: string
          thesis_title_ar?: string | null
          thesis_title_fr?: string | null
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          birthplace_ar?: string
          birthplace_fr?: string | null
          branch_ar?: string
          branch_fr?: string | null
          created_at?: string | null
          date_of_birth?: string
          faculty_ar?: string
          faculty_fr?: string | null
          first_registration_year?: string | null
          full_name_ar?: string
          full_name_fr?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          phone_number?: string | null
          professional_email?: string | null
          registration_number?: string
          research_lab_ar?: string | null
          specialty_ar?: string
          specialty_fr?: string | null
          status?: string | null
          supervisor_ar?: string
          thesis_title_ar?: string | null
          thesis_title_fr?: string | null
          university_ar?: string | null
          university_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      print_history: {
        Row: {
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          id: string
          printed_at: string | null
          printed_by: string | null
          student_ids: string[]
          template_id: string | null
        }
        Insert: {
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          id?: string
          printed_at?: string | null
          printed_by?: string | null
          student_ids: string[]
          template_id?: string | null
        }
        Update: {
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          id?: string
          printed_at?: string | null
          printed_by?: string | null
          student_ids?: string[]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_type:
        | "student_added"
        | "student_updated"
        | "student_deleted"
        | "template_added"
        | "template_updated"
        | "template_deleted"
        | "certificate_printed"
        | "settings_updated"
        | "backup_created"
      certificate_type: "phd_lmd" | "phd_science" | "master"
      mention_type: "honorable" | "very_honorable"
      phd_student_type: "phd_lmd" | "phd_science"
      template_language:
        | "ar"
        | "fr"
        | "en"
        | "ar_fr"
        | "ar_en"
        | "fr_en"
        | "ar_fr_en"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "student_added",
        "student_updated",
        "student_deleted",
        "template_added",
        "template_updated",
        "template_deleted",
        "certificate_printed",
        "settings_updated",
        "backup_created",
      ],
      certificate_type: ["phd_lmd", "phd_science", "master"],
      mention_type: ["honorable", "very_honorable"],
      phd_student_type: ["phd_lmd", "phd_science"],
      template_language: [
        "ar",
        "fr",
        "en",
        "ar_fr",
        "ar_en",
        "fr_en",
        "ar_fr_en",
      ],
    },
  },
} as const
