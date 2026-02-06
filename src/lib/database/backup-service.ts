/**
 * خدمة النسخ الاحتياطي - تعمل مع Supabase أو SQLite
 */

import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "./db-client";
import type { TablesInsert } from "@/integrations/supabase/types";

export interface BackupData {
  version: string;
  created_at: string;
  data: {
    phd_lmd_certificates: TablesInsert<'phd_lmd_certificates'>[];
    phd_science_certificates: TablesInsert<'phd_science_certificates'>[];
    master_certificates: TablesInsert<'master_certificates'>[];
    certificate_templates: TablesInsert<'certificate_templates'>[];
    certificate_template_fields: TablesInsert<'certificate_template_fields'>[];
    settings: TablesInsert<'settings'>[];
    user_settings?: TablesInsert<'user_settings'>[];
    dropdown_options: TablesInsert<'dropdown_options'>[];
    custom_fonts: TablesInsert<'custom_fonts'>[];
    activity_log: TablesInsert<'activity_log'>[];
    phd_lmd_students?: TablesInsert<'phd_lmd_students'>[];
    phd_science_students?: TablesInsert<'phd_science_students'>[];
    academic_titles?: TablesInsert<'academic_titles'>[];
    custom_fields?: TablesInsert<'custom_fields'>[];
    custom_field_values?: TablesInsert<'custom_field_values'>[];
    custom_field_options?: TablesInsert<'custom_field_options'>[];
    print_history?: TablesInsert<'print_history'>[];
  };
}

export class BackupService {
  /**
   * تصدير جميع البيانات
   */
  static async exportAll(): Promise<{ data: BackupData | null; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.exportAllData();
      
      if (result.success) {
        return { data: result.data as BackupData, error: null };
      }
      return { data: null, error: new Error(result.error) };
    }
    
    // Supabase version
    try {
      const [
        phdLmd,
        phdScience,
        master,
        templates,
        templateFields,
        settings,
        userSettings,
        dropdownOptions,
        customFonts,
        activityLog,
        phdLmdStudents,
        phdScienceStudents,
        academicTitles,
        customFields,
        customFieldValues,
        customFieldOptions,
        printHistory,
      ] = await Promise.all([
        supabase.from("phd_lmd_certificates").select("*"),
        supabase.from("phd_science_certificates").select("*"),
        supabase.from("master_certificates").select("*"),
        supabase.from("certificate_templates").select("*"),
        supabase.from("certificate_template_fields").select("*"),
        supabase.from("settings").select("*"),
        supabase.from("user_settings").select("*"),
        supabase.from("dropdown_options").select("*"),
        supabase.from("custom_fonts").select("*"),
        supabase.from("activity_log").select("*"),
        supabase.from("phd_lmd_students").select("*"),
        supabase.from("phd_science_students").select("*"),
        supabase.from("academic_titles").select("*"),
        supabase.from("custom_fields").select("*"),
        supabase.from("custom_field_values").select("*"),
        supabase.from("custom_field_options").select("*"),
        supabase.from("print_history").select("*"),
      ]);

      const backupData: BackupData = {
        version: "2.0",
        created_at: new Date().toISOString(),
        data: {
          phd_lmd_certificates: (phdLmd.data || []) as TablesInsert<'phd_lmd_certificates'>[],
          phd_science_certificates: (phdScience.data || []) as TablesInsert<'phd_science_certificates'>[],
          master_certificates: (master.data || []) as TablesInsert<'master_certificates'>[],
          certificate_templates: (templates.data || []) as TablesInsert<'certificate_templates'>[],
          certificate_template_fields: (templateFields.data || []) as TablesInsert<'certificate_template_fields'>[],
          settings: (settings.data || []) as TablesInsert<'settings'>[],
          user_settings: (userSettings.data || []) as TablesInsert<'user_settings'>[],
          dropdown_options: (dropdownOptions.data || []) as TablesInsert<'dropdown_options'>[],
          custom_fonts: (customFonts.data || []) as TablesInsert<'custom_fonts'>[],
          activity_log: (activityLog.data || []) as TablesInsert<'activity_log'>[],
          phd_lmd_students: (phdLmdStudents.data || []) as TablesInsert<'phd_lmd_students'>[],
          phd_science_students: (phdScienceStudents.data || []) as TablesInsert<'phd_science_students'>[],
          academic_titles: (academicTitles.data || []) as TablesInsert<'academic_titles'>[],
          custom_fields: (customFields.data || []) as TablesInsert<'custom_fields'>[],
          custom_field_values: (customFieldValues.data || []) as TablesInsert<'custom_field_values'>[],
          custom_field_options: (customFieldOptions.data || []) as TablesInsert<'custom_field_options'>[],
          print_history: (printHistory.data || []) as TablesInsert<'print_history'>[],
        },
      };

      return { data: backupData, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * استيراد جميع البيانات
   */
  static async importAll(backupData: BackupData): Promise<{ success: boolean; error: Error | null }> {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.importAllData(backupData);
      
      if (result.success) {
        return { success: true, error: null };
      }
      return { success: false, error: new Error(result.error) };
    }
    
    // Supabase version
    try {
      const { data: tableData } = backupData;
      
      // Delete existing data (order matters for foreign keys)
      await supabase.from("custom_field_values").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("custom_field_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("certificate_template_fields").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("print_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("certificate_templates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("custom_fields").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("phd_lmd_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("phd_science_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("master_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("phd_lmd_students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("phd_science_students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("dropdown_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("custom_fonts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("academic_titles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("user_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Helper to restore a table
      const restoreTable = async (tableName: string, data: unknown[] | undefined) => {
        if (data && data.length > 0) {
          await supabase.from(tableName as 'phd_lmd_certificates').insert(data as TablesInsert<'phd_lmd_certificates'>[]);
        }
      };

      // Independent tables first
      await Promise.all([
        restoreTable("phd_lmd_certificates", tableData.phd_lmd_certificates),
        restoreTable("phd_science_certificates", tableData.phd_science_certificates),
        restoreTable("master_certificates", tableData.master_certificates),
        restoreTable("phd_lmd_students", tableData.phd_lmd_students),
        restoreTable("phd_science_students", tableData.phd_science_students),
        restoreTable("dropdown_options", tableData.dropdown_options),
        restoreTable("custom_fonts", tableData.custom_fonts),
        restoreTable("academic_titles", tableData.academic_titles),
        restoreTable("activity_log", tableData.activity_log),
        restoreTable("settings", tableData.settings),
        restoreTable("user_settings", tableData.user_settings),
      ]);

      // Parent tables with dependents
      await restoreTable("certificate_templates", tableData.certificate_templates);
      await restoreTable("custom_fields", tableData.custom_fields);

      // Dependent tables
      await Promise.all([
        restoreTable("certificate_template_fields", tableData.certificate_template_fields),
        restoreTable("custom_field_values", tableData.custom_field_values),
        restoreTable("custom_field_options", tableData.custom_field_options),
        restoreTable("print_history", tableData.print_history),
      ]);

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * تنزيل ملف النسخة الاحتياطية
   */
  static downloadBackupFile(backupData: BackupData): void {
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * قراءة ملف النسخة الاحتياطية
   */
  static async readBackupFile(file: File): Promise<BackupData | null> {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (!backupData.version || !backupData.data) {
        return null;
      }
      
      return backupData as BackupData;
    } catch {
      return null;
    }
  }
}
