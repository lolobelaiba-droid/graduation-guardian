import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StudentStatus = "active" | "graduated" | "suspended" | "transferred";

export interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  specialty: string | null;
  gpa: number | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentData {
  student_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  specialty?: string;
  gpa?: number;
  status?: StudentStatus;
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Student[];
    },
  });
}

export function useStudentsCount() {
  return useQuery({
    queryKey: ["students-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStudentData) => {
      const { data: student, error } = await supabase
        .from("students")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: `تم إضافة الطالب ${data.first_name} ${data.last_name}`,
        entity_id: student.id,
        entity_type: "student",
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم إضافة الطالب بنجاح");
    },
    onError: (error) => {
      toast.error("فشل في إضافة الطالب: " + error.message);
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Student> & { id: string }) => {
      const { data: student, error } = await supabase
        .from("students")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from("activity_log").insert({
        activity_type: "student_updated",
        description: `تم تعديل بيانات الطالب ${student.first_name} ${student.last_name}`,
        entity_id: id,
        entity_type: "student",
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم تحديث بيانات الطالب بنجاح");
    },
    onError: (error) => {
      toast.error("فشل في تحديث بيانات الطالب: " + error.message);
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get student name before deletion
      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name")
        .eq("id", id)
        .single();

      const { error } = await supabase.from("students").delete().eq("id", id);

      if (error) throw error;

      // Log activity
      if (student) {
        await supabase.from("activity_log").insert({
          activity_type: "student_deleted",
          description: `تم حذف الطالب ${student.first_name} ${student.last_name}`,
          entity_type: "student",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: (error) => {
      toast.error("فشل في حذف الطالب: " + error.message);
    },
  });
}
