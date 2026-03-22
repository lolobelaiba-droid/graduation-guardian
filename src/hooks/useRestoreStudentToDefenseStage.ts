import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { getCurrentUserName } from "@/lib/current-user-store";
import { toast } from "sonner";
import type { CertificateType, Certificate } from "@/types/certificates";

interface RestoreToDefenseParams {
  student: Certificate;
  certificateType: CertificateType;
}

export function useRestoreStudentToDefenseStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ student, certificateType }: RestoreToDefenseParams) => {
      const defenseData = {
        registration_number: student.registration_number || student.student_number,
        full_name_ar: student.full_name_ar,
        full_name_fr: student.full_name_fr || null,
        gender: student.gender || "male",
        date_of_birth: student.date_of_birth,
        birthplace_ar: student.birthplace_ar,
        birthplace_fr: student.birthplace_fr || null,
        university_ar: student.university_ar || "جامعة أم البواقي",
        university_fr: student.university_fr || "Université D'oum El Bouaghi",
        faculty_ar: student.faculty_ar || "",
        faculty_fr: student.faculty_fr || null,
        branch_ar: student.branch_ar,
        branch_fr: student.branch_fr || null,
        specialty_ar: student.specialty_ar,
        specialty_fr: student.specialty_fr || null,
        first_registration_year: student.first_registration_year || null,
        professional_email: student.professional_email || null,
        phone_number: student.phone_number || null,
        supervisor_ar: ('supervisor_ar' in student ? (student as any).supervisor_ar : "") || "",
        co_supervisor_ar: ('co_supervisor_ar' in student ? (student as any).co_supervisor_ar : null) || null,
        supervisor_university: ('supervisor_university' in student ? (student as any).supervisor_university : null) || null,
        co_supervisor_university: ('co_supervisor_university' in student ? (student as any).co_supervisor_university : null) || null,
        thesis_title_ar: ('thesis_title_ar' in student ? (student as any).thesis_title_ar : null) || null,
        thesis_title_fr: ('thesis_title_fr' in student ? (student as any).thesis_title_fr : null) || null,
        thesis_language: ('thesis_language' in student ? (student as any).thesis_language : null) || null,
        research_lab_ar: student.research_lab_ar || null,
        employment_status: ('employment_status' in student ? (student as any).employment_status : null) || null,
        registration_type: ('registration_type' in student ? (student as any).registration_type : null) || null,
        inscription_status: ('inscription_status' in student ? (student as any).inscription_status : null) || null,
        current_year: ('current_year' in student ? (student as any).current_year : null) || null,
        registration_count: ('registration_count' in student ? (student as any).registration_count : null) || null,
        notes: ('notes' in student ? (student as any).notes : null) || null,
        // Defense stage specific fields
        jury_president_ar: ('jury_president_ar' in student ? (student as any).jury_president_ar : "") || "",
        jury_president_fr: ('jury_president_fr' in student ? (student as any).jury_president_fr : null) || null,
        jury_members_ar: ('jury_members_ar' in student ? (student as any).jury_members_ar : "") || "",
        jury_members_fr: ('jury_members_fr' in student ? (student as any).jury_members_fr : null) || null,
        scientific_council_date: ('scientific_council_date' in student ? (student as any).scientific_council_date : null) || new Date().toISOString().split('T')[0],
        defense_date: student.defense_date || null,
        province: student.province || "أم البواقي",
        signature_title: student.signature_title || null,
        stage_status: "defended",
      };

      const certTable = certificateType === "phd_lmd" ? "phd_lmd_certificates" : "phd_science_certificates";
      const defenseTable = certificateType === "phd_lmd" ? "defense_stage_lmd" : "defense_stage_science";

      // Add field_ar/field_fr for LMD
      const insertData = certificateType === "phd_lmd"
        ? {
            ...defenseData,
            field_ar: ('field_ar' in student ? (student as any).field_ar : "") || "",
            field_fr: ('field_fr' in student ? (student as any).field_fr : null) || null,
          }
        : {
            ...defenseData,
            field_ar: ('field_ar' in student ? (student as any).field_ar : "") || "",
            field_fr: ('field_fr' in student ? (student as any).field_fr : null) || null,
          };

      if (isElectron()) {
        const db = getDbClient()!;

        const insertResult = await db.insert(defenseTable, insertData);
        if (!insertResult.success) throw new Error(insertResult.error);

        const deleteResult = await db.delete(certTable, student.id);
        if (!deleteResult.success) throw new Error(deleteResult.error);

        await db.insert('activity_log', {
          activity_type: 'student_updated',
          description: `تم إرجاع الطالب ${student.full_name_ar} إلى طور المناقشة`,
          entity_id: student.id,
          entity_type: defenseTable,
        });

        return student;
      }

      // Web/Supabase path
      const { error: insertError } = await supabase
        .from(defenseTable as any)
        .insert(insertData as any);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from(certTable)
        .delete()
        .eq("id", student.id);

      if (deleteError) throw deleteError;

      await supabase.from("activity_log").insert({
        activity_type: "student_updated",
        description: `تم إرجاع الطالب ${student.full_name_ar} إلى طور المناقشة`,
        entity_id: student.id,
        entity_type: defenseTable,
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defense_stage_lmd"] });
      queryClient.invalidateQueries({ queryKey: ["defense_stage_science"] });
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_certificates"] });
      queryClient.invalidateQueries({ queryKey: ["phd_science_certificates"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      toast.success("تم إرجاع الطالب إلى طور المناقشة بنجاح");
    },
    onError: (error: Error) => {
      console.error("Restore to defense stage error:", error);
      toast.error("فشل في إرجاع الطالب: " + error.message);
    },
  });
}
