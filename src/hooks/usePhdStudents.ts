import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toast } from "sonner";
import type { PhdLmdStudent, PhdScienceStudent, PhdStudentType } from "@/types/phd-students";

// ============================================
// PhD LMD Students
// ============================================
export function usePhdLmdStudents() {
  return useQuery({
    queryKey: ["phd_lmd_students"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.getAll('phd_lmd_students', 'created_at', 'DESC');
        if (result.success) {
          return result.data as PhdLmdStudent[];
        }
        return [];
      }

      const { data, error } = await supabase
        .from("phd_lmd_students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PhdLmdStudent[];
    },
  });
}

export function useCreatePhdLmdStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PhdLmdStudent, 'id' | 'created_at' | 'updated_at'>) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.insert('phd_lmd_students', data);
        if (!result.success) throw new Error(result.error);
        
        await db.insert('activity_log', {
          activity_type: 'student_added',
          description: `تم إضافة طالب دكتوراه ل م د: ${data.full_name_ar}`,
          entity_id: (result.data as { id: string }).id,
          entity_type: 'phd_lmd_student',
        });
        
        return result.data;
      }

      const { data: student, error } = await supabase
        .from("phd_lmd_students")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم إضافة طالب دكتوراه ل م د: ${data.full_name_ar}`,
        entity_id: student.id,
        entity_type: "phd_lmd_student",
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_students"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم إضافة الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في إضافة الطالب: " + error.message);
    },
  });
}

export function useUpdatePhdLmdStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PhdLmdStudent> & { id: string }) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.update('phd_lmd_students', id, data);
        if (!result.success) throw new Error(result.error);
        return result.data;
      }

      const { data: student, error } = await supabase
        .from("phd_lmd_students")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_students"] });
      toast.success("تم تحديث البيانات بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث البيانات: " + error.message);
    },
  });
}

export function useDeletePhdLmdStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.delete('phd_lmd_students', id);
        if (!result.success) throw new Error(result.error);
        return;
      }

      const { error } = await supabase.from("phd_lmd_students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_students"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الطالب: " + error.message);
    },
  });
}

// ============================================
// PhD Science Students
// ============================================
export function usePhdScienceStudents() {
  return useQuery({
    queryKey: ["phd_science_students"],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.getAll('phd_science_students', 'created_at', 'DESC');
        if (result.success) {
          return result.data as PhdScienceStudent[];
        }
        return [];
      }

      const { data, error } = await supabase
        .from("phd_science_students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PhdScienceStudent[];
    },
  });
}

export function useCreatePhdScienceStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PhdScienceStudent, 'id' | 'created_at' | 'updated_at'>) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.insert('phd_science_students', data);
        if (!result.success) throw new Error(result.error);
        
        await db.insert('activity_log', {
          activity_type: 'student_added',
          description: `تم إضافة طالب دكتوراه علوم: ${data.full_name_ar}`,
          entity_id: (result.data as { id: string }).id,
          entity_type: 'phd_science_student',
        });
        
        return result.data;
      }

      const { data: student, error } = await supabase
        .from("phd_science_students")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم إضافة طالب دكتوراه علوم: ${data.full_name_ar}`,
        entity_id: student.id,
        entity_type: "phd_science_student",
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_science_students"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم إضافة الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في إضافة الطالب: " + error.message);
    },
  });
}

export function useUpdatePhdScienceStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PhdScienceStudent> & { id: string }) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.update('phd_science_students', id, data);
        if (!result.success) throw new Error(result.error);
        return result.data;
      }

      const { data: student, error } = await supabase
        .from("phd_science_students")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_science_students"] });
      toast.success("تم تحديث البيانات بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث البيانات: " + error.message);
    },
  });
}

export function useDeletePhdScienceStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isElectron()) {
        const db = getDbClient();
        if (!db) throw new Error("فشل الاتصال بقاعدة البيانات المحلية");
        const result = await db.delete('phd_science_students', id);
        if (!result.success) throw new Error(result.error);
        return;
      }

      const { error } = await supabase.from("phd_science_students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_science_students"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الطالب: " + error.message);
    },
  });
}
