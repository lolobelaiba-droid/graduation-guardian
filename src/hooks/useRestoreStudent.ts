import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
        registration_number: (student as any).registration_number || student.student_number,
        full_name_ar: student.full_name_ar,
        full_name_fr: student.full_name_fr || null,
        gender: (student as any).gender || "male",
        date_of_birth: student.date_of_birth,
        birthplace_ar: student.birthplace_ar,
        birthplace_fr: student.birthplace_fr || null,
        university_ar: (student as any).university_ar || "جامعة أم البواقي",
        university_fr: (student as any).university_fr || "Université D'oum El Bouaghi",
        faculty_ar: student.faculty_ar || "",
        faculty_fr: (student as any).faculty_fr || null,
        branch_ar: student.branch_ar,
        branch_fr: student.branch_fr || null,
        specialty_ar: student.specialty_ar,
        specialty_fr: student.specialty_fr || null,
        first_registration_year: (student as any).first_registration_year || null,
        professional_email: (student as any).professional_email || null,
        phone_number: (student as any).phone_number || null,
        supervisor_ar: (student as any).supervisor_ar || "",
        thesis_title_ar: (student as any).thesis_title_ar || null,
        thesis_title_fr: (student as any).thesis_title_fr || null,
        research_lab_ar: (student as any).research_lab_ar || null,
        co_supervisor_ar: (student as any).co_supervisor_ar || null,
        supervisor_university: (student as any).supervisor_university || null,
        co_supervisor_university: (student as any).co_supervisor_university || null,
        employment_status: (student as any).employment_status || null,
        registration_type: (student as any).registration_type || null,
        inscription_status: (student as any).inscription_status || null,
        current_year: (student as any).current_year || null,
        registration_count: (student as any).registration_count || null,
        thesis_language: (student as any).thesis_language || null,
        status: "graduated",
        notes: (student as any).notes || `تم إرجاعه من قاعدة بيانات الطلبة المناقشين - تاريخ المناقشة: ${student.defense_date}`,
      };

      // Insert into the appropriate PhD students table
      if (certificateType === "phd_lmd") {
        const { error: insertError } = await supabase
          .from("phd_lmd_students")
          .insert({
            ...phdStudentData,
            field_ar: (student as any).field_ar || "",
            field_fr: (student as any).field_fr || null,
          });

        if (insertError) throw insertError;

        // Delete from certificates table
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

        // Delete from certificates table
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
    onSuccess: (_, { certificateType }) => {
      // Invalidate all relevant queries
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
