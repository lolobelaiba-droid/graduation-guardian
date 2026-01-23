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
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          created_at: string | null
          id: string
          is_active: boolean | null
          language: Database["public"]["Enums"]["template_language"]
          page_orientation: string | null
          page_size: string | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: Database["public"]["Enums"]["template_language"]
          page_orientation?: string | null
          page_size?: string | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: Database["public"]["Enums"]["template_language"]
          page_orientation?: string | null
          page_size?: string | null
          template_name?: string
          updated_at?: string | null
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
          full_name_ar: string
          full_name_fr: string | null
          id: string
          mention: Database["public"]["Enums"]["mention_type"]
          specialty_ar: string
          specialty_fr: string | null
          student_number: string
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
          full_name_ar: string
          full_name_fr?: string | null
          id?: string
          mention?: Database["public"]["Enums"]["mention_type"]
          specialty_ar: string
          specialty_fr?: string | null
          student_number: string
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
          full_name_ar?: string
          full_name_fr?: string | null
          id?: string
          mention?: Database["public"]["Enums"]["mention_type"]
          specialty_ar?: string
          specialty_fr?: string | null
          student_number?: string
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
          field_ar: string
          field_fr: string | null
          full_name_ar: string
          full_name_fr: string | null
          id: string
          jury_members_ar: string
          jury_members_fr: string | null
          jury_president_ar: string
          jury_president_fr: string | null
          mention: Database["public"]["Enums"]["mention_type"]
          specialty_ar: string
          specialty_fr: string | null
          student_number: string
          thesis_title_ar: string
          thesis_title_fr: string | null
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
          field_ar: string
          field_fr?: string | null
          full_name_ar: string
          full_name_fr?: string | null
          id?: string
          jury_members_ar: string
          jury_members_fr?: string | null
          jury_president_ar: string
          jury_president_fr?: string | null
          mention?: Database["public"]["Enums"]["mention_type"]
          specialty_ar: string
          specialty_fr?: string | null
          student_number: string
          thesis_title_ar: string
          thesis_title_fr?: string | null
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
          field_ar?: string
          field_fr?: string | null
          full_name_ar?: string
          full_name_fr?: string | null
          id?: string
          jury_members_ar?: string
          jury_members_fr?: string | null
          jury_president_ar?: string
          jury_president_fr?: string | null
          mention?: Database["public"]["Enums"]["mention_type"]
          specialty_ar?: string
          specialty_fr?: string | null
          student_number?: string
          thesis_title_ar?: string
          thesis_title_fr?: string | null
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
          full_name_ar: string
          full_name_fr: string | null
          id: string
          jury_members_ar: string
          jury_members_fr: string | null
          jury_president_ar: string
          jury_president_fr: string | null
          mention: Database["public"]["Enums"]["mention_type"]
          specialty_ar: string
          specialty_fr: string | null
          student_number: string
          thesis_title_ar: string
          thesis_title_fr: string | null
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
          full_name_ar: string
          full_name_fr?: string | null
          id?: string
          jury_members_ar: string
          jury_members_fr?: string | null
          jury_president_ar: string
          jury_president_fr?: string | null
          mention?: Database["public"]["Enums"]["mention_type"]
          specialty_ar: string
          specialty_fr?: string | null
          student_number: string
          thesis_title_ar: string
          thesis_title_fr?: string | null
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
          full_name_ar?: string
          full_name_fr?: string | null
          id?: string
          jury_members_ar?: string
          jury_members_fr?: string | null
          jury_president_ar?: string
          jury_president_fr?: string | null
          mention?: Database["public"]["Enums"]["mention_type"]
          specialty_ar?: string
          specialty_fr?: string | null
          student_number?: string
          thesis_title_ar?: string
          thesis_title_fr?: string | null
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
      mention_type:
        | "excellent"
        | "very_good"
        | "good"
        | "fairly_good"
        | "passable"
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
      mention_type: [
        "excellent",
        "very_good",
        "good",
        "fairly_good",
        "passable",
      ],
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
