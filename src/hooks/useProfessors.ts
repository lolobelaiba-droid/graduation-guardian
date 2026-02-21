import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";

export interface Professor {
  id: string;
  full_name: string;
  rank_label: string | null;
  rank_abbreviation: string | null;
  university: string | null;
}

interface AcademicTitleEntry {
  abbreviation: string;
  full_name: string;
}

/** Cache for academic title abbreviations used in stripping */
let cachedAbbreviations: string[] | null = null;

async function loadAbbreviations(): Promise<string[]> {
  if (cachedAbbreviations) return cachedAbbreviations;

  try {
    if (isElectron()) {
      const db = getDbClient()!;
      const result = await db.getAll('academic_titles', 'display_order', 'ASC');
      if (result.success && result.data) {
        cachedAbbreviations = (result.data as AcademicTitleEntry[]).map(t => t.abbreviation);
        return cachedAbbreviations;
      }
    } else {
      const { data } = await supabase
        .from('academic_titles')
        .select('abbreviation')
        .order('display_order');
      if (data) {
        cachedAbbreviations = data.map(t => t.abbreviation);
        return cachedAbbreviations;
      }
    }
  } catch (e) {
    console.error('Failed to load abbreviations for professor name stripping:', e);
  }
  return [];
}

/** Invalidate the abbreviation cache (call when academic titles change) */
export function invalidateAbbreviationCache() {
  cachedAbbreviations = null;
}

/**
 * إزالة اختصار الرتبة من بداية الاسم إن وجد
 * يعتمد فقط على الاختصارات المحفوظة في جدول academic_titles
 */
function stripAbbreviationSync(name: string, abbreviations: string[]): string {
  if (!name || abbreviations.length === 0) return name;

  // Sort by length descending so longer abbreviations match first
  const sorted = [...abbreviations].sort((a, b) => b.length - a.length);

  // Loop to strip multiple stacked abbreviations (e.g. "أ د. أ د. name")
  let result = name;
  let changed = true;
  while (changed) {
    changed = false;
    for (const abbr of sorted) {
      if (!abbr) continue;
      const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`^${escaped}\\s*`);
      if (pattern.test(result)) {
        const stripped = result.replace(pattern, '').trim();
        if (stripped && stripped !== result) {
          result = stripped;
          changed = true;
          break; // restart from longest abbreviation
        }
      }
    }
  }
  return result;
}

async function fetchProfessors(): Promise<Professor[]> {
  if (isElectron()) {
    const db = getDbClient()!;
    const result = await db.getAll('professors', 'full_name', 'asc');
    if (!result.success || !result.data) return [];
    return result.data as Professor[];
  }

  const { data, error } = await supabase
    .from('professors')
    .select('id, full_name, rank_label, rank_abbreviation, university')
    .order('full_name');
  
  if (error || !data) return [];
  return data as Professor[];
}

interface UpsertProfessorData {
  full_name: string;
  rank_label?: string;
  rank_abbreviation?: string;
  university?: string;
}

async function upsertProfessor(data: UpsertProfessorData): Promise<void> {
  const abbreviations = await loadAbbreviations();
  const trimmed = data.full_name.trim();
  if (!trimmed) return;

  const cleanName = stripAbbreviationSync(trimmed, abbreviations);
  if (!cleanName) return;

  // Build update object with only explicitly provided fields
  const hasRank = data.rank_label !== undefined && data.rank_label !== '';
  const hasAbbr = data.rank_abbreviation !== undefined && data.rank_abbreviation !== '';
  const hasUni = data.university !== undefined && data.university !== '';

  if (isElectron()) {
    const db = getDbClient()!;
    const existing = await db.getAll('professors', 'full_name', 'asc');
    const found = (existing.data as Professor[] || []).find(p => p.full_name === cleanName);
    if (found) {
      const updates: Record<string, string | null> = {};
      if (hasRank) updates.rank_label = data.rank_label!;
      if (hasAbbr) updates.rank_abbreviation = data.rank_abbreviation!;
      if (hasUni) updates.university = data.university!;
      if (Object.keys(updates).length > 0) {
        await db.update('professors', found.id, updates);
      }
    } else {
      await db.insert('professors', {
        full_name: cleanName,
        rank_label: hasRank ? data.rank_label! : null,
        rank_abbreviation: hasAbbr ? data.rank_abbreviation! : null,
        university: hasUni ? data.university! : null,
      });
    }
    return;
  }

  // Check if professor already exists
  const { data: existing } = await supabase
    .from('professors')
    .select('id')
    .eq('full_name', cleanName)
    .maybeSingle();

  if (existing) {
    // Only update fields that were explicitly provided
    const updates: Record<string, string | null> = {};
    if (hasRank) updates.rank_label = data.rank_label!;
    if (hasAbbr) updates.rank_abbreviation = data.rank_abbreviation!;
    if (hasUni) updates.university = data.university!;
    if (Object.keys(updates).length > 0) {
      await supabase.from('professors').update(updates).eq('id', existing.id);
    }
  } else {
    await supabase.from('professors').insert({
      full_name: cleanName,
      rank_label: hasRank ? data.rank_label! : null,
      rank_abbreviation: hasAbbr ? data.rank_abbreviation! : null,
      university: hasUni ? data.university! : null,
    });
  }
}

export function useProfessors() {
  const queryClient = useQueryClient();

  const { data: professors = [] } = useQuery({
    queryKey: ['professors'],
    queryFn: fetchProfessors,
    staleTime: 2 * 60 * 1000,
  });

  const professorNames = professors.map(p => p.full_name);

  const upsertMutation = useMutation({
    mutationFn: upsertProfessor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professors'] });
    },
  });

  /**
   * يضيف أو يحدّث الأستاذ في قاعدة البيانات
   */
  const ensureProfessor = async (name: string, rankLabel?: string, rankAbbreviation?: string, university?: string) => {
    const abbreviations = await loadAbbreviations();
    const trimmed = name.trim();
    if (!trimmed) return;
    const cleanName = stripAbbreviationSync(trimmed, abbreviations);
    if (!cleanName) return;
    
    // Don't save if name matches an existing professor and no new data provided
    const existing = professors.find(p => p.full_name === cleanName);
    if (existing && !rankLabel && !rankAbbreviation && !university) return;
    
    upsertMutation.mutate({
      full_name: cleanName,
      rank_label: rankLabel,
      rank_abbreviation: rankAbbreviation,
      university: university,
    });
  };

  /**
   * البحث عن أستاذ بالاسم وإرجاع بياناته الكاملة
   */
  const findProfessor = useCallback((name: string): Professor | undefined => {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    // Try exact match first
    const exact = professors.find(p => p.full_name === trimmed);
    if (exact) return exact;
    
    // Try without abbreviation - use cached abbreviations
    const abbrs = cachedAbbreviations || [];
    const cleanName = stripAbbreviationSync(trimmed, abbrs);
    if (cleanName && cleanName !== trimmed) {
      const found = professors.find(p => p.full_name === cleanName);
      if (found) return found;
    }
    
    // Try suffix match: check if any professor name appears at the end of the input
    // This handles cases like "أ د. قلاب ذبيح نوال" → finds "قلاب ذبيح نوال"
    for (const p of professors) {
      if (trimmed.endsWith(p.full_name)) return p;
    }
    
    return undefined;
  }, [professors]);

  return { professors, professorNames, ensureProfessor, findProfessor };
}
