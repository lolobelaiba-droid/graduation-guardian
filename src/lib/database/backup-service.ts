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
    notes?: TablesInsert<'notes'>[];
  };
}

export class BackupService {
  /**
   * جلب جميع الصفوف من جدول مع pagination لتجاوز حد 1000 صف
   */
  private static async fetchAllRows(tableName: string): Promise<unknown[]> {
    const PAGE_SIZE = 1000;
    let allData: unknown[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName as 'settings')
        .select("*")
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    return allData;
  }

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
        notes,
      ] = await Promise.all([
        this.fetchAllRows("phd_lmd_certificates"),
        this.fetchAllRows("phd_science_certificates"),
        this.fetchAllRows("master_certificates"),
        this.fetchAllRows("certificate_templates"),
        this.fetchAllRows("certificate_template_fields"),
        this.fetchAllRows("settings"),
        this.fetchAllRows("user_settings"),
        this.fetchAllRows("dropdown_options"),
        this.fetchAllRows("custom_fonts"),
        this.fetchAllRows("activity_log"),
        this.fetchAllRows("phd_lmd_students"),
        this.fetchAllRows("phd_science_students"),
        this.fetchAllRows("academic_titles"),
        this.fetchAllRows("custom_fields"),
        this.fetchAllRows("custom_field_values"),
        this.fetchAllRows("custom_field_options"),
        this.fetchAllRows("print_history"),
        this.fetchAllRows("notes"),
      ]);

      const backupData: BackupData = {
        version: "2.0",
        created_at: new Date().toISOString(),
        data: {
          phd_lmd_certificates: phdLmd as TablesInsert<'phd_lmd_certificates'>[],
          phd_science_certificates: phdScience as TablesInsert<'phd_science_certificates'>[],
          master_certificates: master as TablesInsert<'master_certificates'>[],
          certificate_templates: templates as TablesInsert<'certificate_templates'>[],
          certificate_template_fields: templateFields as TablesInsert<'certificate_template_fields'>[],
          settings: settings as TablesInsert<'settings'>[],
          user_settings: userSettings as TablesInsert<'user_settings'>[],
          dropdown_options: dropdownOptions as TablesInsert<'dropdown_options'>[],
          custom_fonts: customFonts as TablesInsert<'custom_fonts'>[],
          activity_log: activityLog as TablesInsert<'activity_log'>[],
          phd_lmd_students: phdLmdStudents as TablesInsert<'phd_lmd_students'>[],
          phd_science_students: phdScienceStudents as TablesInsert<'phd_science_students'>[],
          academic_titles: academicTitles as TablesInsert<'academic_titles'>[],
          custom_fields: customFields as TablesInsert<'custom_fields'>[],
          custom_field_values: customFieldValues as TablesInsert<'custom_field_values'>[],
          custom_field_options: customFieldOptions as TablesInsert<'custom_field_options'>[],
          print_history: printHistory as TablesInsert<'print_history'>[],
          notes: notes as TablesInsert<'notes'>[],
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
      
      // Helper to delete all rows from a table
      const deleteTable = async (tableName: string) => {
        const { error } = await supabase.from(tableName as 'settings').delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) console.warn(`Warning deleting ${tableName}:`, error.message);
      };

      // Delete existing data (order matters for foreign keys)
      // Dependent tables first
      await Promise.all([
        deleteTable("custom_field_values"),
        deleteTable("custom_field_options"),
        deleteTable("certificate_template_fields"),
        deleteTable("print_history"),
      ]);

      // Then parent/independent tables
      await Promise.all([
        deleteTable("certificate_templates"),
        deleteTable("custom_fields"),
        deleteTable("phd_lmd_certificates"),
        deleteTable("phd_science_certificates"),
        deleteTable("master_certificates"),
        deleteTable("phd_lmd_students"),
        deleteTable("phd_science_students"),
        deleteTable("dropdown_options"),
        deleteTable("custom_fonts"),
        deleteTable("academic_titles"),
        deleteTable("activity_log"),
        deleteTable("user_settings"),
        deleteTable("settings"),
        deleteTable("notes"),
      ]);

      // Helper to restore a table in batches with error checking
      const BATCH_SIZE = 500;
      const restoreTable = async (tableName: string, data: unknown[] | undefined) => {
        if (!data || data.length === 0) return;
        
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from(tableName as 'phd_lmd_certificates').insert(batch as TablesInsert<'phd_lmd_certificates'>[]);
          if (error) {
            console.error(`Error restoring ${tableName} (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
            throw new Error(`فشل استعادة جدول ${tableName}: ${error.message}`);
          }
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
        restoreTable("notes", tableData.notes),
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
    let text: string;
    try {
      text = await file.text();
    } catch (e) {
      console.error("Failed to read file content:", e);
      throw new Error("فشل في قراءة محتوى الملف. تأكد من أن الملف غير تالف.");
    }

    let backupData: Record<string, unknown>;
    try {
      backupData = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      throw new Error("الملف ليس بتنسيق JSON صالح. تأكد من اختيار ملف نسخة احتياطية صحيح.");
    }

    // Support both wrapped format {version, data: {...}} and raw data format {...tables...}
    if (backupData.version && backupData.data) {
      return backupData as unknown as BackupData;
    }

    // If the file is raw table data (exported from desktop without wrapper)
    const hasTableKeys = ['phd_lmd_certificates', 'settings', 'certificate_templates']
      .some(key => key in backupData);
    
    if (hasTableKeys) {
      return {
        version: "2.0",
        created_at: new Date().toISOString(),
        data: backupData as unknown as BackupData['data'],
      };
    }

    // Check if data is nested one level deeper (e.g. {data: {tables...}})
    if (backupData.data && typeof backupData.data === 'object') {
      return {
        version: "2.0",
        created_at: (backupData.created_at as string) || new Date().toISOString(),
        data: backupData.data as BackupData['data'],
      };
    }

    throw new Error("هيكل ملف النسخة الاحتياطية غير معروف. تأكد من أن الملف تم تصديره من هذا البرنامج.");
  }
}
