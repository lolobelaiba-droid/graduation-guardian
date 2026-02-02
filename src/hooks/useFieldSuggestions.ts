import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type FieldSuggestionKey = 
  | 'branch_ar' 
  | 'branch_fr' 
  | 'specialty_ar' 
  | 'specialty_fr' 
  | 'supervisor_ar' 
  | 'jury_president_ar' 
  | 'jury_members_ar';

const CERTIFICATE_TABLES = ['phd_lmd_certificates', 'phd_science_certificates', 'master_certificates'] as const;
type CertificateTable = typeof CERTIFICATE_TABLES[number];

// Define which fields exist on which tables
const TABLE_FIELDS: Record<CertificateTable, FieldSuggestionKey[]> = {
  phd_lmd_certificates: ['branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 'supervisor_ar', 'jury_president_ar', 'jury_members_ar'],
  phd_science_certificates: ['branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 'supervisor_ar', 'jury_president_ar', 'jury_members_ar'],
  master_certificates: ['branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 'supervisor_ar'],
};

async function fetchFieldValuesFromTable(table: CertificateTable, fieldKey: FieldSuggestionKey): Promise<string[]> {
  // Check if this field exists on this table
  if (!TABLE_FIELDS[table].includes(fieldKey)) {
    return [];
  }

  const { data, error } = await supabase
    .from(table)
    .select(fieldKey);

  if (error || !data) {
    return [];
  }

  const values: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data as any[]).forEach((row) => {
    const value = row[fieldKey];
    if (typeof value === 'string' && value.trim()) {
      values.push(value.trim());
    }
  });

  return values;
}

export function useFieldSuggestions(fieldKey: FieldSuggestionKey) {
  return useQuery({
    queryKey: ['field-suggestions', fieldKey],
    queryFn: async () => {
      const allValues = new Set<string>();
      
      // Query all certificate tables for the field
      for (const table of CERTIFICATE_TABLES) {
        const values = await fetchFieldValuesFromTable(table, fieldKey);
        values.forEach(v => allValues.add(v));
      }
      
      return Array.from(allValues).sort();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useMultipleFieldSuggestions(fieldKeys: FieldSuggestionKey[]) {
  return useQuery({
    queryKey: ['field-suggestions-multiple', fieldKeys],
    queryFn: async () => {
      const results: Record<FieldSuggestionKey, string[]> = {
        branch_ar: [],
        branch_fr: [],
        specialty_ar: [],
        specialty_fr: [],
        supervisor_ar: [],
        jury_president_ar: [],
        jury_members_ar: [],
      };
      
      for (const fieldKey of fieldKeys) {
        const allValues = new Set<string>();
        
        for (const table of CERTIFICATE_TABLES) {
          const values = await fetchFieldValuesFromTable(table, fieldKey);
          values.forEach(v => allValues.add(v));
        }
        
        results[fieldKey] = Array.from(allValues).sort();
      }
      
      return results;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
