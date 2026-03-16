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
    professors?: TablesInsert<'professors'>[];
    defense_document_templates?: Record<string, unknown>[];
    defense_stage_lmd?: Record<string, unknown>[];
    defense_stage_science?: Record<string, unknown>[];
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
        professors,
        defenseDocTemplates,
        defenseStageLmd,
        defenseStageScience,
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
        this.fetchAllRows("professors"),
        this.fetchAllRows("defense_document_templates"),
        this.fetchAllRows("defense_stage_lmd"),
        this.fetchAllRows("defense_stage_science"),
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
          professors: professors as TablesInsert<'professors'>[],
          defense_document_templates: defenseDocTemplates as Record<string, unknown>[],
          defense_stage_lmd: defenseStageLmd as Record<string, unknown>[],
          defense_stage_science: defenseStageScience as Record<string, unknown>[],
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
  static async importAll(
    backupData: BackupData,
    onProgress?: (step: string, current: number, total: number) => void,
    selectedTables?: string[]
  ): Promise<{ success: boolean; error: Error | null }> {
    const TABLE_LABELS: Record<string, string> = {
      phd_lmd_certificates: "شهادات دكتوراه ل م د",
      phd_science_certificates: "شهادات دكتوراه علوم",
      master_certificates: "شهادات الماستر",
      certificate_templates: "قوالب الشهادات",
      certificate_template_fields: "حقول القوالب",
      settings: "الإعدادات",
      user_settings: "إعدادات المستخدم",
      dropdown_options: "خيارات القوائم",
      custom_fonts: "الخطوط المخصصة",
      activity_log: "سجل النشاطات",
      phd_lmd_students: "طلبة دكتوراه ل م د",
      phd_science_students: "طلبة دكتوراه علوم",
      academic_titles: "الألقاب العلمية",
      custom_fields: "الحقول المخصصة",
      custom_field_values: "قيم الحقول المخصصة",
      custom_field_options: "خيارات الحقول المخصصة",
      print_history: "سجل الطباعة",
      notes: "الملاحظات",
      professors: "الأساتذة",
      defense_document_templates: "قوالب وثائق المناقشة",
      defense_stage_lmd: "طور المناقشة - دكتوراه ل م د",
      defense_stage_science: "طور المناقشة - دكتوراه علوم",
    };

    if (isElectron()) {
      const db = getDbClient()!;
      onProgress?.("جاري استعادة البيانات محلياً...", 1, 2);
      const result = await db.importAllData(backupData);
      onProgress?.("اكتملت الاستعادة", 2, 2);
      
      if (result.success) {
        return { success: true, error: null };
      }
      return { success: false, error: new Error(result.error) };
    }
    
    // Supabase version
    try {
      const { data: tableData } = backupData;

      // Count total restore steps
      const fullTableList = [
        "phd_lmd_certificates", "phd_science_certificates", "master_certificates",
        "phd_lmd_students", "phd_science_students", "dropdown_options", "custom_fonts",
        "academic_titles", "activity_log", "settings", "user_settings", "notes", "professors",
        "defense_document_templates", "defense_stage_lmd", "defense_stage_science",
        "certificate_templates", "custom_fields",
        "certificate_template_fields", "custom_field_values", "custom_field_options", "print_history",
      ];
      // Only include tables that actually have data in the backup (to avoid deleting existing data for missing tables)
      const tablesWithData = fullTableList.filter(t => {
        const d = (tableData as Record<string, unknown[]>)[t];
        return d && d.length > 0;
      });
      const allTables = selectedTables 
        ? tablesWithData.filter(t => selectedTables.includes(t)) 
        : tablesWithData;
      const isPartial = !!selectedTables;
      const totalSteps = allTables.length + 2; // +2 for delete phases
      let currentStep = 0;
      
      // Helper to delete all rows from a table
      const deleteTable = async (tableName: string) => {
        const { error } = await supabase
          .from(tableName as 'settings')
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        if (error) console.warn(`Warning deleting ${tableName}:`, error.message);
      };

      const shouldRestore = (t: string) => allTables.includes(t);

      // Delete existing data - only for selected tables
      onProgress?.("حذف البيانات القديمة (الجداول المرتبطة)...", ++currentStep, totalSteps);
      await Promise.all([
        shouldRestore("custom_field_values") && deleteTable("custom_field_values"),
        shouldRestore("custom_field_options") && deleteTable("custom_field_options"),
        shouldRestore("certificate_template_fields") && deleteTable("certificate_template_fields"),
        shouldRestore("print_history") && deleteTable("print_history"),
      ].filter(Boolean));

      onProgress?.("حذف البيانات القديمة (الجداول الرئيسية)...", ++currentStep, totalSteps);
      const mainDeletes = [
        "certificate_templates", "custom_fields",
        "phd_lmd_certificates", "phd_science_certificates", "master_certificates",
        "phd_lmd_students", "phd_science_students",
        "dropdown_options", "custom_fonts", "academic_titles",
        "activity_log", "user_settings", "settings", "notes", "professors",
        "defense_document_templates", "defense_stage_lmd", "defense_stage_science",
      ].filter(shouldRestore).map(deleteTable);
      await Promise.all(mainDeletes);

      // Helper to restore a table in batches
      const DEFAULT_BATCH_SIZE = 500;
      // Tables with large data (e.g. base64 images) need smaller batches to avoid timeouts
      const SMALL_BATCH_TABLES = ['certificate_templates', 'certificate_template_fields', 'custom_fonts'];
      // Tables with unique constraints that need upsert
      const UPSERT_TABLES = ['settings', 'user_settings', 'dropdown_options'];
      
      // Known columns per table to filter out unknown fields from backup data
      const TABLE_COLUMNS: Record<string, string[] | null> = {
        academic_titles: ['id', 'abbreviation', 'full_name', 'display_order', 'created_at'],
        activity_log: ['id', 'activity_type', 'entity_id', 'entity_type', 'description', 'created_by', 'created_at'],
        certificate_template_fields: [
          'id', 'template_id', 'field_key', 'field_name_ar', 'field_name_fr',
          'position_x', 'position_y', 'font_size', 'font_name', 'font_color',
          'text_align', 'is_rtl', 'is_visible', 'field_order', 'field_width', 'line_height', 'created_at'
        ],
        custom_fonts: ['id', 'font_name', 'font_family', 'font_url', 'font_weight', 'font_style', 'is_arabic', 'created_at'],
      };

      const cleanBatchData = (tableName: string, batch: Record<string, unknown>[]) => {
        const allowedCols = TABLE_COLUMNS[tableName];
        if (!allowedCols) return batch; // no filtering needed
        return batch.map(row => {
          const cleaned: Record<string, unknown> = {};
          for (const col of allowedCols) {
            if (col in row) cleaned[col] = row[col];
          }
          return cleaned;
        });
      };

      const restoreTable = async (tableName: string, data: unknown[] | undefined) => {
        const label = TABLE_LABELS[tableName] || tableName;
        const count = data?.length || 0;
        onProgress?.(`استعادة ${label} (${count} سجل)...`, ++currentStep, totalSteps);
        
        if (!data || data.length === 0) return;
        
        const useUpsert = UPSERT_TABLES.includes(tableName);
        const BATCH_SIZE = SMALL_BATCH_TABLES.includes(tableName) ? 50 : DEFAULT_BATCH_SIZE;
        
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = cleanBatchData(tableName, data.slice(i, i + BATCH_SIZE) as Record<string, unknown>[]);
          let error;
          
          if (useUpsert) {
            const result = await supabase.from(tableName as 'settings').upsert(batch as TablesInsert<'settings'>[], { onConflict: 'id' });
            error = result.error;
          } else {
            const result = await supabase.from(tableName as 'phd_lmd_certificates').insert(batch as TablesInsert<'phd_lmd_certificates'>[]);
            error = result.error;
          }
          
          if (error) {
            console.error(`Error restoring ${tableName} (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
            throw new Error(`فشل استعادة ${label}: ${error.message}`);
          }
        }
      };

      // Independent tables (sequential for progress visibility) - only selected
      const independentTables: [string, unknown[] | undefined][] = [
        ["phd_lmd_certificates", tableData.phd_lmd_certificates],
        ["phd_science_certificates", tableData.phd_science_certificates],
        ["master_certificates", tableData.master_certificates],
        ["phd_lmd_students", tableData.phd_lmd_students],
        ["phd_science_students", tableData.phd_science_students],
        ["dropdown_options", tableData.dropdown_options],
        ["custom_fonts", tableData.custom_fonts],
        ["academic_titles", tableData.academic_titles],
        ["activity_log", tableData.activity_log],
        ["settings", tableData.settings],
        ["user_settings", tableData.user_settings],
        ["notes", tableData.notes],
        ["professors", tableData.professors],
        ["defense_document_templates", tableData.defense_document_templates],
        ["defense_stage_lmd", tableData.defense_stage_lmd],
        ["defense_stage_science", tableData.defense_stage_science],
      ];
      for (const [name, data] of independentTables) {
        if (shouldRestore(name)) await restoreTable(name, data);
      }

      // Parent tables with dependents
      if (shouldRestore("certificate_templates")) await restoreTable("certificate_templates", tableData.certificate_templates);
      if (shouldRestore("custom_fields")) await restoreTable("custom_fields", tableData.custom_fields);

      // Dependent tables
      if (shouldRestore("certificate_template_fields")) await restoreTable("certificate_template_fields", tableData.certificate_template_fields);
      if (shouldRestore("custom_field_values")) await restoreTable("custom_field_values", tableData.custom_field_values);
      if (shouldRestore("custom_field_options")) await restoreTable("custom_field_options", tableData.custom_field_options);
      if (shouldRestore("print_history")) await restoreTable("print_history", tableData.print_history);

      // After restoration, rebuild professors table if it wasn't in the backup
      const professorsInBackup = (tableData.professors && tableData.professors.length > 0);
      if (!professorsInBackup) {
        onProgress?.("إعادة بناء سجل الأساتذة من بيانات الشهادات...", totalSteps - 1, totalSteps);
        await this.rebuildProfessorsFromCertificates(backupData);
      }

      // Rebuild academic_titles if not in backup
      const titlesInBackup = (tableData.academic_titles && tableData.academic_titles.length > 0);
      if (!titlesInBackup) {
        onProgress?.("إعادة بناء الألقاب العلمية...", totalSteps, totalSteps);
        await this.rebuildDefaultAcademicTitles();
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * استخراج الرتبة والاسم النظيف من اسم كامل يحتوي على لقب علمي
   */
  private static extractRankAndName(fullNameWithRank: string): { cleanName: string; rankAbbr: string; rankLabel: string } {
    const KNOWN_RANKS: { abbr: string; label: string; pattern: RegExp }[] = [
      { abbr: 'أد.', label: 'أستاذ التعليم العالي', pattern: /^أ\.?د\.?\s*/ },
      { abbr: 'أد.', label: 'أستاذ التعليم العالي', pattern: /^أد\.?\s*/ },
      { abbr: 'د.', label: 'أستاذ محاضر أ', pattern: /^د\.?\s*/ },
      { abbr: 'د.', label: 'أستاذ محاضر ب', pattern: /^م\.?ب\.?\s*/ },
      { abbr: 'أم.', label: 'أستاذ مميز', pattern: /^أم\.?\s*/ },
    ];

    const trimmed = fullNameWithRank.trim();
    for (const rank of KNOWN_RANKS) {
      if (rank.pattern.test(trimmed)) {
        const cleanName = trimmed.replace(rank.pattern, '').trim();
        if (cleanName) {
          return { cleanName, rankAbbr: rank.abbr, rankLabel: rank.label };
        }
      }
    }
    return { cleanName: trimmed, rankAbbr: '', rankLabel: '' };
  }

  /**
   * إعادة بناء جدول الأساتذة من بيانات الشهادات المستعادة
   */
  private static async rebuildProfessorsFromCertificates(backupData: BackupData): Promise<void> {
    const profMap = new Map<string, { rank_label: string; rank_abbreviation: string; university: string }>();

    const processCerts = (certs: Record<string, unknown>[] | undefined) => {
      if (!certs) return;
      for (const cert of certs) {
        // Supervisor
        const supervisorRaw = cert.supervisor_ar as string;
        if (supervisorRaw) {
          const { cleanName, rankAbbr, rankLabel } = this.extractRankAndName(supervisorRaw);
          if (cleanName && !profMap.has(cleanName)) {
            profMap.set(cleanName, {
              rank_label: rankLabel,
              rank_abbreviation: rankAbbr,
              university: (cert.supervisor_university as string) || '',
            });
          }
        }

        // Co-supervisor
        const coSupRaw = cert.co_supervisor_ar as string;
        if (coSupRaw) {
          const { cleanName, rankAbbr, rankLabel } = this.extractRankAndName(coSupRaw);
          if (cleanName && !profMap.has(cleanName)) {
            profMap.set(cleanName, {
              rank_label: rankLabel,
              rank_abbreviation: rankAbbr,
              university: (cert.co_supervisor_university as string) || '',
            });
          }
        }

        // Jury president
        const presidentRaw = cert.jury_president_ar as string;
        if (presidentRaw) {
          const { cleanName, rankAbbr, rankLabel } = this.extractRankAndName(presidentRaw);
          if (cleanName && !profMap.has(cleanName)) {
            profMap.set(cleanName, { rank_label: rankLabel, rank_abbreviation: rankAbbr, university: '' });
          }
        }

        // Jury members (separated by " - ")
        const membersRaw = cert.jury_members_ar as string;
        if (membersRaw) {
          const members = membersRaw.split(/\s*-\s*/);
          for (const member of members) {
            const trimmed = member.trim();
            if (!trimmed) continue;
            const { cleanName, rankAbbr, rankLabel } = this.extractRankAndName(trimmed);
            if (cleanName && !profMap.has(cleanName)) {
              profMap.set(cleanName, { rank_label: rankLabel, rank_abbreviation: rankAbbr, university: '' });
            }
          }
        }
      }
    };

    processCerts(backupData.data.phd_lmd_certificates as Record<string, unknown>[]);
    processCerts(backupData.data.phd_science_certificates as Record<string, unknown>[]);

    if (profMap.size === 0) return;

    // Insert into professors table
    const professors = Array.from(profMap.entries()).map(([name, info]) => ({
      full_name: name,
      rank_label: info.rank_label || null,
      rank_abbreviation: info.rank_abbreviation || null,
      university: info.university || null,
    }));

    if (isElectron()) {
      const db = getDbClient()!;
      for (const prof of professors) {
        await db.insert('professors', prof);
      }
    } else {
      // Batch insert via Supabase
      const BATCH = 100;
      for (let i = 0; i < professors.length; i += BATCH) {
        const batch = professors.slice(i, i + BATCH);
        await supabase.from('professors').upsert(
          batch as TablesInsert<'professors'>[],
          { onConflict: 'id' }
        );
      }
    }

    // professors rebuilt
  }

  /**
   * إعادة بناء الألقاب العلمية الافتراضية
   */
  private static async rebuildDefaultAcademicTitles(): Promise<void> {
    const defaultTitles = [
      { abbreviation: 'أد.', full_name: 'أستاذ التعليم العالي', display_order: 1 },
      { abbreviation: 'د.', full_name: 'أستاذ محاضر أ', display_order: 2 },
      { abbreviation: 'د.', full_name: 'أستاذ محاضر ب', display_order: 3 },
      { abbreviation: 'أم.', full_name: 'أستاذ مميز', display_order: 4 },
    ];

    if (isElectron()) {
      const db = getDbClient()!;
      // Check if already exist
      const existing = await db.getAll('academic_titles', 'display_order', 'ASC');
      if (existing.success && existing.data && (existing.data as unknown[]).length > 0) return;
      for (const title of defaultTitles) {
        await db.insert('academic_titles', title);
      }
    } else {
      const { data: existing } = await supabase.from('academic_titles').select('id').limit(1);
      if (existing && existing.length > 0) return;
      await supabase.from('academic_titles').insert(defaultTitles as TablesInsert<'academic_titles'>[]);
    }

    // academic titles rebuilt
  }

  /**
   * تنزيل ملف النسخة الاحتياطية
   */
  static async downloadBackupFile(backupData: BackupData): Promise<boolean> {
    const jsonContent = JSON.stringify(backupData, null, 2);
    const defaultFileName = `backup_${new Date().toISOString().split("T")[0]}.json`;

    // In Electron, use native save dialog
    if (isElectron() && (window as any).electronAPI?.saveFile) {
      try {
        const result = await (window as any).electronAPI.saveFile(defaultFileName, jsonContent);
        return result.success;
      } catch (e) {
        console.error('Electron save failed, falling back to browser download:', e);
      }
    }

    // Fallback: browser download
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
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
