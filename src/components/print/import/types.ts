import { CertificateType } from "@/types/certificates";

export type ImportStep = "upload" | "mode" | "mapping" | "preview" | "importing" | "complete";

export type ImportMode = "append" | "replace";

export interface ColumnMapping {
  [excelColumn: string]: string; // maps Excel column to field key
}

export interface ImportProgress {
  current: number;
  total: number;
}

export interface ImportResults {
  success: number;
  failed: number;
  errors: string[];
}

export interface FieldDefinition {
  key: string;
  name_ar: string;
  name_fr: string;
  required: boolean;
}

export interface ExcelRow {
  [key: string]: unknown;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_ROWS = 500;

// Database field keys that are actually stored (without _ar/_fr suffixes for display-only fields)
export const getDbFieldKey = (fieldKey: string): string => {
  // Map display field keys to database column names
  const mappings: Record<string, string> = {
    'date_of_birth_ar': 'date_of_birth',
    'date_of_birth_fr': 'date_of_birth',
    'defense_date_ar': 'defense_date',
    'defense_date_fr': 'defense_date',
    'certificate_date_ar': 'certificate_date',
    'certificate_date_fr': 'certificate_date',
    'scientific_council_date_ar': 'scientific_council_date',
    'scientific_council_date_fr': 'scientific_council_date',
    'mention_ar': 'mention',
    'mention_fr': 'mention',
  };
  return mappings[fieldKey] || fieldKey;
};
