import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { getCurrentUserName } from "@/lib/current-user-store";
import { toast } from "sonner";
import type { DefenseStageStudent, DefenseStageType } from "@/types/defense-stage";

// ============================================
// Defense Stage LMD
// ============================================
export function useDefenseStageLmd() {
  return useQuery({
    queryKey: ["defense_stage_lmd"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.getAll('defense_stage_lmd', 'created_at', 'DESC');
        if (result.success) return result.data as DefenseStageStudent[];
        return [];
      }

      const { data, error } = await supabase
        .from("defense_stage_lmd" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) as DefenseStageStudent[];
    },
  });
}

export function useCreateDefenseStageLmd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<DefenseStageStudent, 'id' | 'created_at' | 'updated_at'>) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.insert('defense_stage_lmd', data);
        if (!result.success) throw new Error(result.error);
        
        await db.insert('activity_log', {
          activity_type: 'student_added',
          description: `تم نقل الطالب ${data.full_name_ar} إلى طور المناقشة (ل م د)`,
          entity_id: (result.data as { id: string }).id,
          entity_type: 'defense_stage_lmd',
        });
        
        return result.data;
      }

      const { data: student, error } = await supabase
        .from("defense_stage_lmd" as any)
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم نقل الطالب ${data.full_name_ar} إلى طور المناقشة (ل م د)`,
        entity_id: (student as any).id,
        entity_type: "defense_stage_lmd",
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_stage_lmd"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم نقل الطالب إلى طور المناقشة بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في نقل الطالب: " + error.message);
    },
  });
}

export function useUpdateDefenseStageLmd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DefenseStageStudent> & { id: string }) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.update('defense_stage_lmd', id, data);
        if (!result.success) throw new Error(result.error);
        return result.data;
      }

      const { data: student, error } = await supabase
        .from("defense_stage_lmd" as any)
        .update(data as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_stage_lmd"] });
      toast.success("تم تحديث البيانات بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث البيانات: " + error.message);
    },
  });
}

export function useDeleteDefenseStageLmd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.delete('defense_stage_lmd', id);
        if (!result.success) throw new Error(result.error);
        return;
      }

      const { error } = await supabase.from("defense_stage_lmd" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_stage_lmd"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الطالب: " + error.message);
    },
  });
}

// ============================================
// Defense Stage Science
// ============================================
export function useDefenseStageScience() {
  return useQuery({
    queryKey: ["defense_stage_science"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.getAll('defense_stage_science', 'created_at', 'DESC');
        if (result.success) return result.data as DefenseStageStudent[];
        return [];
      }

      const { data, error } = await supabase
        .from("defense_stage_science" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) as DefenseStageStudent[];
    },
  });
}

export function useCreateDefenseStageScience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<DefenseStageStudent, 'id' | 'created_at' | 'updated_at'>) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.insert('defense_stage_science', data);
        if (!result.success) throw new Error(result.error);
        
        await db.insert('activity_log', {
          activity_type: 'student_added',
          description: `تم نقل الطالب ${data.full_name_ar} إلى طور المناقشة (علوم)`,
          entity_id: (result.data as { id: string }).id,
          entity_type: 'defense_stage_science',
        });
        
        return result.data;
      }

      const { data: student, error } = await supabase
        .from("defense_stage_science" as any)
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم نقل الطالب ${data.full_name_ar} إلى طور المناقشة (علوم)`,
        entity_id: (student as any).id,
        entity_type: "defense_stage_science",
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_stage_science"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم نقل الطالب إلى طور المناقشة بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في نقل الطالب: " + error.message);
    },
  });
}

export function useUpdateDefenseStageScience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DefenseStageStudent> & { id: string }) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.update('defense_stage_science', id, data);
        if (!result.success) throw new Error(result.error);
        return result.data;
      }

      const { data: student, error } = await supabase
        .from("defense_stage_science" as any)
        .update(data as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_stage_science"] });
      toast.success("تم تحديث البيانات بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث البيانات: " + error.message);
    },
  });
}

export function useDeleteDefenseStageScience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.delete('defense_stage_science', id);
        if (!result.success) throw new Error(result.error);
        return;
      }

      const { error } = await supabase.from("defense_stage_science" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_stage_science"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الطالب: " + error.message);
    },
  });
}
