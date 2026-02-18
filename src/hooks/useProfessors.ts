import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";

export interface Professor {
  id: string;
  full_name: string;
  rank_label: string | null;
  rank_abbreviation: string | null;
  university: string | null;
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
  const trimmed = data.full_name.trim();
  if (!trimmed) return;

  const cleanName = stripAbbreviation(trimmed);
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
  const ensureProfessor = (name: string, rankLabel?: string, rankAbbreviation?: string, university?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cleanName = stripAbbreviation(trimmed);
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
  const findProfessor = (name: string): Professor | undefined => {
    const cleanName = stripAbbreviation(name.trim());
    if (!cleanName) return undefined;
    return professors.find(p => p.full_name === cleanName);
  };

  return { professors, professorNames, ensureProfessor, findProfessor };
}

/**
 * إزالة اختصار الرتبة من بداية الاسم إن وجد
 */
function stripAbbreviation(name: string): string {
  // Common abbreviation patterns (ordered longest first)
  const abbrPatterns = [
    /^أ\s*\.?\s*ت\s*\.?\s*ع\s*/,   // أ.ت.ع
    /^أ\s*\.?\s*م\s*\.?\s*أ\s*/,   // أ.م.أ
    /^أ\s*\.?\s*م\s*\.?\s*ب\s*/,   // أ.م.ب
    /^أ\s*\.?\s*م\s*\.?\s*س\s*\.?\s*أ\s*/, // أ.م.س.أ
    /^أ\s*\.?\s*م\s*\.?\s*س\s*\.?\s*ب\s*/, // أ.م.س.ب
    /^أ\s*د\.\s*/,
    /^م\s*ب\.\s*/,
    /^د\.\s*/,
    /^Pr\.\s*/i,
    /^Dr\.\s*/i,
    /^Prof\.\s*/i,
  ];
  
  for (const pattern of abbrPatterns) {
    if (pattern.test(name)) {
      return name.replace(pattern, '').trim();
    }
  }
  return name;
}
