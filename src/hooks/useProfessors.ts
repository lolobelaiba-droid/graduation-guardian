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

  if (isElectron()) {
    const db = getDbClient()!;
    // Check if exists
    const existing = await db.getAll('professors', 'full_name', 'asc');
    const found = (existing.data as Professor[] || []).find(p => p.full_name === cleanName);
    if (found) {
      // Update rank/university if provided
      const updates: Record<string, string> = {};
      if (data.rank_label) updates.rank_label = data.rank_label;
      if (data.rank_abbreviation) updates.rank_abbreviation = data.rank_abbreviation;
      if (data.university) updates.university = data.university;
      if (Object.keys(updates).length > 0) {
        await db.update('professors', found.id, updates);
      }
    } else {
      await db.insert('professors', {
        full_name: cleanName,
        rank_label: data.rank_label || null,
        rank_abbreviation: data.rank_abbreviation || null,
        university: data.university || null,
      });
    }
    return;
  }

  await supabase
    .from('professors')
    .upsert({
      full_name: cleanName,
      rank_label: data.rank_label || null,
      rank_abbreviation: data.rank_abbreviation || null,
      university: data.university || null,
    }, { onConflict: 'full_name' });
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
    return professors.find(p => p.full_name === cleanName);
  };

  return { professors, professorNames, ensureProfessor, findProfessor };
}

/**
 * إزالة اختصار الرتبة من بداية الاسم إن وجد
 */
function stripAbbreviation(name: string): string {
  const abbrPatterns = [
    /^أ\s*د\.\s*/,
    /^د\.\s*/,
    /^م\s*ب\.\s*/,
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
