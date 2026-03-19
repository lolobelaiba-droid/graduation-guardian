import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  foundIn: string | null; // e.g. "طور المناقشة (ل م د)", "الطلبة المناقشون (علوم)"
}

// Tables to check against for PhD students (before defense)
const CROSS_TABLES_FOR_PHD = [
  { table: 'defense_stage_lmd', label: 'طور المناقشة (ل م د)' },
  { table: 'defense_stage_science', label: 'طور المناقشة (علوم)' },
  { table: 'phd_lmd_certificates', label: 'الطلبة المناقشون (ل م د)' },
  { table: 'phd_science_certificates', label: 'الطلبة المناقشون (علوم)' },
];

// Tables to check against for defense stage
const CROSS_TABLES_FOR_DEFENSE = [
  { table: 'phd_lmd_certificates', label: 'الطلبة المناقشون (ل م د)' },
  { table: 'phd_science_certificates', label: 'الطلبة المناقشون (علوم)' },
];

// Tables to check against for certificates
const CROSS_TABLES_FOR_CERTIFICATES = [
  { table: 'defense_stage_lmd', label: 'طور المناقشة (ل م د)' },
  { table: 'defense_stage_science', label: 'طور المناقشة (علوم)' },
];

type CheckContext = 'phd_student' | 'defense_stage' | 'certificate';

function getTablesForContext(context: CheckContext) {
  switch (context) {
    case 'phd_student': return CROSS_TABLES_FOR_PHD;
    case 'defense_stage': return CROSS_TABLES_FOR_DEFENSE;
    case 'certificate': return CROSS_TABLES_FOR_CERTIFICATES;
  }
}

/**
 * Check if a student with the same name and date of birth exists in other tables.
 */
export async function checkDuplicateStudent(
  fullNameAr: string,
  dateOfBirth: string,
  context: CheckContext
): Promise<DuplicateCheckResult> {
  if (!fullNameAr || !dateOfBirth) {
    return { isDuplicate: false, foundIn: null };
  }

  const tables = getTablesForContext(context);
  const trimmedName = fullNameAr.trim();

  if (isElectron()) {
    const db = getDbClient();
    if (!db) return { isDuplicate: false, foundIn: null };

    for (const { table, label } of tables) {
      const result = await db.search(table, 'full_name_ar', trimmedName);
      if (result.success && result.data) {
        const match = (result.data as any[]).find(
          (row: any) => row.full_name_ar?.trim() === trimmedName && row.date_of_birth === dateOfBirth
        );
        if (match) return { isDuplicate: true, foundIn: label };
      }
    }
    return { isDuplicate: false, foundIn: null };
  }

  // Supabase path
  for (const { table, label } of tables) {
    const { data, error } = await supabase
      .from(table as any)
      .select('id')
      .eq('full_name_ar', trimmedName)
      .eq('date_of_birth', dateOfBirth)
      .limit(1);

    if (!error && data && data.length > 0) {
      return { isDuplicate: true, foundIn: label };
    }
  }

  return { isDuplicate: false, foundIn: null };
}
