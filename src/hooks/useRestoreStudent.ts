import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toast } from "sonner";
import type { CertificateType, Certificate } from "@/types/certificates";

interface RestoreStudentParams {
  student: Certificate;
  certificateType: CertificateType;
}

export function useRestoreStudentToPhd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ student, certificateType }: RestoreStudentParams) => {
      // Prepare the data for the PhD students table
      const phdStudentData = {
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
        thesis_title_ar: ('thesis_title_ar' in student ? (student as any).thesis_title_ar : null) || null,
        thesis_title_fr: ('thesis_title_fr' in student ? (student as any).thesis_title_fr : null) || null,
        research_lab_ar: student.research_lab_ar || null,
        co_supervisor_ar: ('co_supervisor_ar' in student ? (student as any).co_supervisor_ar : null) || null,
        supervisor_university: ('supervisor_university' in student ? (student as any).supervisor_university : null) || null,
        co_supervisor_university: ('co_supervisor_university' in student ? (student as any).co_supervisor_university : null) || null,
        employment_status: ('employment_status' in student ? (student as any).employment_status : null) || null,
        registration_type: ('registration_type' in student ? (student as any).registration_type : null) || null,
        inscription_status: ('inscription_status' in student ? (student as any).inscription_status : null) || null,
        current_year: ('current_year' in student ? (student as any).current_year : null) || null,
        registration_count: ('registration_count' in student ? (student as any).registration_count : null) || null,
        thesis_language: ('thesis_language' in student ? (student as any).thesis_language : null) || null,
        status: "graduated",
        notes: ('notes' in student ? (student as any).notes : null) || `تم إرجاعه من قاعدة بيانات الطلبة المناقشين - تاريخ المناقشة: ${student.defense_date}`,
      };

      if (isElectron()) {
        const db = getDbClient()!;
        
        if (certificateType === "phd_lmd") {
          const insertResult = await db.insert('phd_lmd_students', {
            ...phdStudentData,
            field_ar: ('field_ar' in student ? (student as any).field_ar : "") || "",
            field_fr: ('field_fr' in student ? (student as any).field_fr : null) || null,
          });
          if (!insertResult.success) throw new Error(insertResult.error);

          const deleteResult = await db.delete('phd_lmd_certificates', student.id);
          if (!deleteResult.success) throw new Error(deleteResult.error);
        } else if (certificateType === "phd_science") {
          const insertResult = await db.insert('phd_science_students', phdStudentData);
          if (!insertResult.success) throw new Error(insertResult.error);

          const deleteResult = await db.delete('phd_science_certificates', student.id);
          if (!deleteResult.success) throw new Error(deleteResult.error);
        }

        await db.insert('activity_log', {
          activity_type: 'student_updated',
          description: `تم إرجاع الطالب ${student.full_name_ar} إلى قاعدة بيانات طلبة الدكتوراه`,
          entity_id: student.id,
          entity_type: certificateType === "phd_lmd" ? "phd_lmd_student" : "phd_science_student",
        });

        return student;
      }

      // Web/Supabase path
      if (certificateType === "phd_lmd") {
        const { error: insertError } = await supabase
          .from("phd_lmd_students")
          .insert({
            ...phdStudentData,
            field_ar: ('field_ar' in student ? (student as any).field_ar : "") || "",
            field_fr: ('field_fr' in student ? (student as any).field_fr : null) || null,
          });

        if (insertError) throw insertError;

        const { error: deleteError } = await supabase
          .from("phd_lmd_certificates")
          .delete()
          .eq("id", student.id);

        if (deleteError) throw deleteError;
      } else if (certificateType === "phd_science") {
        const { error: insertError } = await supabase
          .from("phd_science_students")
          .insert(phdStudentData);

        if (insertError) throw insertError;

        const { error: deleteError } = await supabase
          .from("phd_science_certificates")
          .delete()
          .eq("id", student.id);

        if (deleteError) throw deleteError;
      }

      // Log the activity
      await supabase.from("activity_log").insert({
        activity_type: "student_updated",
        description: `تم إرجاع الطالب ${student.full_name_ar} إلى قاعدة بيانات طلبة الدكتوراه`,
        entity_id: student.id,
        entity_type: certificateType === "phd_lmd" ? "phd_lmd_student" : "phd_science_student",
      });

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_students"] });
      queryClient.invalidateQueries({ queryKey: ["phd_science_students"] });
      queryClient.invalidateQueries({ queryKey: ["phd_lmd_certificates"] });
      queryClient.invalidateQueries({ queryKey: ["phd_science_certificates"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      toast.success("تم إرجاع الطالب إلى قاعدة بيانات طلبة الدكتوراه بنجاح");
    },
    onError: (error: Error) => {
      console.error("Restore error:", error);
      toast.error("فشل في إرجاع الطالب: " + error.message);
    },
  });
}
