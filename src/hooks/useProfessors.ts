import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";

/**
 * Hook لإدارة قاعدة بيانات الأساتذة
 * - جلب جميع الأساتذة للاقتراحات
 * - إضافة أستاذ جديد تلقائياً عند إدخال اسم غير موجود
 */

async function fetchProfessors(): Promise<string[]> {
  if (isElectron()) {
    const db = getDbClient()!;
    const result = await db.getAll('professors', 'full_name', 'asc');
    if (!result.success || !result.data) return [];
    return (result.data as Array<{ full_name: string }>).map(r => r.full_name);
  }

  const { data, error } = await supabase
    .from('professors')
    .select('full_name')
    .order('full_name');
  
  if (error || !data) return [];
  return data.map(r => r.full_name);
}

async function addProfessor(fullName: string): Promise<void> {
  const trimmed = fullName.trim();
  if (!trimmed) return;

  if (isElectron()) {
    const db = getDbClient()!;
    await db.insert('professors', { full_name: trimmed });
    return;
  }

  // upsert to avoid duplicates
  await supabase
    .from('professors')
    .upsert({ full_name: trimmed }, { onConflict: 'full_name' });
}

export function useProfessors() {
  const queryClient = useQueryClient();

  const { data: professors = [] } = useQuery({
    queryKey: ['professors'],
    queryFn: fetchProfessors,
    staleTime: 2 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: addProfessor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professors'] });
    },
  });

  /**
   * يضيف الأستاذ إلى قاعدة البيانات إذا لم يكن موجوداً
   */
  const ensureProfessor = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // تحقق مما إذا كان الاسم موجوداً بالفعل (بدون الاختصار)
    const nameWithoutAbbr = stripAbbreviation(trimmed);
    if (nameWithoutAbbr && !professors.includes(nameWithoutAbbr)) {
      addMutation.mutate(nameWithoutAbbr);
    }
  };

  return { professors, ensureProfessor };
}

/**
 * إزالة اختصار الرتبة من بداية الاسم إن وجد
 * مثال: "أ د. أحمد محمد" -> "أحمد محمد"
 */
function stripAbbreviation(name: string): string {
  // Common abbreviation patterns
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
