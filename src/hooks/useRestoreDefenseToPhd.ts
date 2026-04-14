import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { getCurrentUserName } from "@/lib/current-user-store";
import { toast } from "sonner";
import type { DefenseStageStudent, DefenseStageType } from "@/types/defense-stage";

interface RestoreParams {
  student: DefenseStageStudent;
  defenseType: DefenseStageType;
}

export function useRestoreDefenseToPhd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ student, defenseType }: RestoreParams) => {
      const phdData: Record<string, any> = {
        registration_number: student.registration_number || "",
        full_name_ar: student.full_name_ar,
        full_name_fr: student.full_name_fr || null,
        gender: student.gender || "male",
        date_of_birth: student.date_of_birth,
        date_of_birth_presumed: (student as any).date_of_birth_presumed || false,
        birthplace_ar: student.birthplace_ar,
        birthplace_fr: student.birthplace_fr || null,
        university_ar: student.university_ar || null,
        university_fr: student.university_fr || null,
        faculty_ar: student.faculty_ar || "",
        faculty_fr: student.faculty_fr || null,
        branch_ar: student.branch_ar,
        branch_fr: student.branch_fr || null,
        specialty_ar: student.specialty_ar,
        specialty_fr: student.specialty_fr || null,
        first_registration_year: student.first_registration_year || null,
        professional_email: student.professional_email || null,
        phone_number: student.phone_number || null,
        supervisor_ar: student.supervisor_ar,
        co_supervisor_ar: student.co_supervisor_ar || null,
        supervisor_university: student.supervisor_university || null,
        co_supervisor_university: student.co_supervisor_university || null,
        thesis_title_ar: student.thesis_title_ar || null,
        thesis_title_fr: student.thesis_title_fr || null,
        thesis_language: student.thesis_language || null,
        research_lab_ar: student.research_lab_ar || null,
        employment_status: student.employment_status || null,
        registration_type: student.registration_type || null,
        inscription_status: student.inscription_status || null,
        current_year: student.current_year || null,
        registration_count: student.registration_count || null,
        status: "active",
        notes: student.notes || null,
        field_ar: student.field_ar || "",
        field_fr: student.field_fr || null,
      };

      const phdTable = defenseType === "phd_lmd" ? "phd_lmd_students" : "phd_science_students";
      const defenseTable = defenseType === "phd_lmd" ? "defense_stage_lmd" : "defense_stage_science";

      if (isElectron()) {
        const db = getDbClient()!;

        const insertResult = await db.insert(phdTable, phdData);
        if (!insertResult.success) throw new Error(insertResult.error);

        const deleteResult = await db.delete(defenseTable, student.id);
        if (!deleteResult.success) throw new Error(deleteResult.error);

        await db.insert("activity_log", {
          activity_type: "student_updated",
          description: `تم إرجاع الطالب ${student.full_name_ar} من طور المناقشة إلى قاعدة بيانات طلبة الدكتوراه`,
          entity_id: student.id,
          entity_type: phdTable.replace("_students", "_student"),
          created_by: getCurrentUserName(),
        });

        return student;
      }

      // Supabase path
      const { error: insertError } = await supabase
        .from(phdTable)
        .insert(phdData as any);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from(defenseTable)
        .delete()
        .eq("id", student.id);

      if (deleteError) throw deleteError;

      await supabase.from("activity_log").insert({
        activity_type: "student_updated",
        description: `تم إرجاع الطالب ${student.full_name_ar} من طور المناقشة إلى قاعدة بيانات طلبة الدكتوراه`,
        entity_id: student.id,
        entity_type: phdTable.replace("_students", "_student"),
        created_by: getCurrentUserName(),
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_stage_lmd"] });
      queryClient.invalidateQueries({ queryKey: ["defense_stage_science"] });
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_students"] });
      queryClient.invalidateQueries({ queryKey: ["phd_science_students"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      toast.success("تم إرجاع الطالب إلى قاعدة بيانات طلبة الدكتوراه بنجاح");
    },
    onError: (error: Error) => {
      console.error("Restore defense to PhD error:", error);
      toast.error("فشل في إرجاع الطالب: " + error.message);
    },
  });
}
