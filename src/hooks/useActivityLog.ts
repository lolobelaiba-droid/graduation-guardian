import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toast } from "sonner";

export type ActivityType = 
  | "student_added"
  | "student_updated"
  | "student_deleted"
  | "template_added"
  | "template_updated"
  | "template_deleted"
  | "certificate_printed"
  | "settings_updated"
  | "backup_created";

export interface ActivityLog {
  id: string;
  activity_type: ActivityType;
  description: string;
  entity_id: string | null;
  entity_type: string | null;
  created_by: string;
  created_at: string;
}

export function useActivityLog(limit?: number) {
  return useQuery({
    queryKey: ["activity-log", limit],
    queryFn: async () => {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAll('activity_log', 'created_at', 'DESC');
        if (result.success) {
          const data = result.data as ActivityLog[];
          return limit ? data.slice(0, limit) : data;
        }
        return [];
      }

      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ActivityLog[];
    },
  });
}

export function useDeleteOldActivities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (daysOld: number = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      if (isElectron()) {
        const db = getDbClient();
        if (db && 'deleteOldActivities' in db) {
          const result = await (db as any).deleteOldActivities(daysOld);
          if (!result.success) {
            throw new Error(result.error || 'فشل في حذف السجلات');
          }
          return result.data;
        }
        return;
      }

      const { error } = await supabase
        .from("activity_log")
        .delete()
        .lt("created_at", cutoffDate.toISOString());

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("تم حذف السجلات القديمة بنجاح");
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف السجلات: " + error.message);
    },
  });
}

export const activityTypeLabels: Record<ActivityType, string> = {
  student_added: "إضافة طالب",
  student_updated: "تعديل طالب",
  student_deleted: "حذف طالب",
  template_added: "إضافة قالب",
  template_updated: "تعديل قالب",
  template_deleted: "حذف قالب",
  certificate_printed: "طباعة شهادة",
  settings_updated: "تحديث الإعدادات",
  backup_created: "إنشاء نسخة احتياطية",
};

export const activityTypeIcons: Record<ActivityType, "create" | "edit" | "delete" | "print"> = {
  student_added: "create",
  student_updated: "edit",
  student_deleted: "delete",
  template_added: "create",
  template_updated: "edit",
  template_deleted: "delete",
  certificate_printed: "print",
  settings_updated: "edit",
  backup_created: "create",
};
