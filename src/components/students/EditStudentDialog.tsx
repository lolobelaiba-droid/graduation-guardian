import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { JuryTableInput, SupervisorTableInput } from "@/components/ui/jury-table-input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { CertificateType, MentionType, Certificate } from "@/types/certificates";
import { mentionLabels, certificateTypeLabels, getDefaultSignatureTitle } from "@/types/certificates";
import {
  useUpdatePhdLmdCertificate,
  useUpdatePhdScienceCertificate,
  useUpdateMasterCertificate,
} from "@/hooks/useCertificates";
import { DropdownWithAdd } from "@/components/print/DropdownWithAdd";
import { useMultipleFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { useProfessors } from "@/hooks/useProfessors";
import { academicYears } from "@/components/print/AddStudentDialog";

// PhD LMD schema
const phdLmdSchema = z.object({
  student_number: z.string().min(1, "رقم الشهادة مطلوب"),
  registration_number: z.string().optional().nullable(),
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  date_of_birth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  birthplace_ar: z.string().min(1, "مكان الميلاد مطلوب"),
  birthplace_fr: z.string().optional().nullable(),
  university_ar: z.string().optional().nullable(),
  university_fr: z.string().optional().nullable(),
  faculty_ar: z.string().min(1, "الكلية مطلوبة"),
  faculty_fr: z.string().optional().nullable(),
  research_lab_ar: z.string().min(1, "مخبر البحث مطلوب"),
  branch_ar: z.string().min(1, "الشعبة مطلوبة"),
  branch_fr: z.string().optional().nullable(),
  specialty_ar: z.string().min(1, "التخصص مطلوب"),
  specialty_fr: z.string().optional().nullable(),
  mention: z.enum(["honorable", "very_honorable"]),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().min(1, "تاريخ الشهادة مطلوب"),
  field_ar: z.string().min(1, "الميدان مطلوب"),
  field_fr: z.string().optional().nullable(),
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  thesis_title_fr: z.string().optional().nullable(),
  thesis_language: z.string().optional().nullable(),
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
  co_supervisor_ar: z.string().optional().nullable(),
  supervisor_university: z.string().optional().nullable(),
  co_supervisor_university: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  registration_type: z.string().optional().nullable(),
  inscription_status: z.string().optional().nullable(),
  current_year: z.string().optional().nullable(),
  registration_count: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  signature_title: z.string().optional().nullable(),
  scientific_council_date: z.string().min(1, "تاريخ المصادقة في المجلس العلمي مطلوب"),
});

type PhdLmdFormValues = z.infer<typeof phdLmdSchema>;

// PhD Science schema
const phdScienceSchema = z.object({
  student_number: z.string().min(1, "رقم الشهادة مطلوب"),
  registration_number: z.string().optional().nullable(),
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  date_of_birth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  birthplace_ar: z.string().min(1, "مكان الميلاد مطلوب"),
  birthplace_fr: z.string().optional().nullable(),
  university_ar: z.string().optional().nullable(),
  university_fr: z.string().optional().nullable(),
  faculty_ar: z.string().min(1, "الكلية مطلوبة"),
  faculty_fr: z.string().optional().nullable(),
  research_lab_ar: z.string().optional().nullable(),
  branch_ar: z.string().min(1, "الشعبة مطلوبة"),
  branch_fr: z.string().optional().nullable(),
  specialty_ar: z.string().min(1, "التخصص مطلوب"),
  specialty_fr: z.string().optional().nullable(),
  mention: z.enum(["honorable", "very_honorable"]),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().min(1, "تاريخ الشهادة مطلوب"),
  field_ar: z.string().min(1, "الميدان مطلوب"),
  field_fr: z.string().optional().nullable(),
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  thesis_title_fr: z.string().optional().nullable(),
  thesis_language: z.string().optional().nullable(),
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
  co_supervisor_ar: z.string().optional().nullable(),
  supervisor_university: z.string().optional().nullable(),
  co_supervisor_university: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  registration_type: z.string().optional().nullable(),
  inscription_status: z.string().optional().nullable(),
  current_year: z.string().optional().nullable(),
  registration_count: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  signature_title: z.string().optional().nullable(),
  scientific_council_date: z.string().min(1, "تاريخ المصادقة في المجلس العلمي مطلوب"),
});

type PhdScienceFormValues = z.infer<typeof phdScienceSchema>;

// Magister schema (without supervisor, research_lab, first_registration_year, email, phone)
const masterSchema = z.object({
  student_number: z.string().min(1, "رقم الشهادة مطلوب"),
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  date_of_birth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  birthplace_ar: z.string().min(1, "مكان الميلاد مطلوب"),
  birthplace_fr: z.string().optional().nullable(),
  university_ar: z.string().optional().nullable(),
  university_fr: z.string().optional().nullable(),
  faculty_ar: z.string().min(1, "الكلية مطلوبة"),
  faculty_fr: z.string().optional().nullable(),
  branch_ar: z.string().min(1, "الشعبة مطلوبة"),
  branch_fr: z.string().optional().nullable(),
  specialty_ar: z.string().min(1, "التخصص مطلوب"),
  specialty_fr: z.string().optional().nullable(),
  mention: z.enum(["honorable", "very_honorable"]),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().min(1, "تاريخ الشهادة مطلوب"),
  province: z.string().optional().nullable(),
  signature_title: z.string().optional().nullable(),
  scientific_council_date: z.string().min(1, "تاريخ المصادقة في المجلس العلمي مطلوب"),
});

type MasterFormValues = z.infer<typeof masterSchema>;

type FormValues = PhdLmdFormValues | PhdScienceFormValues | MasterFormValues;

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Certificate | null;
  certificateType: CertificateType;
}

export default function EditStudentDialog({
  open,
  onOpenChange,
  student,
  certificateType,
}: EditStudentDialogProps) {
  const updatePhdLmd = useUpdatePhdLmdCertificate();
  const updatePhdScience = useUpdatePhdScienceCertificate();
  const updateMaster = useUpdateMasterCertificate();
  
  // Fetch suggestions for autocomplete fields
  const { data: suggestions } = useMultipleFieldSuggestions([
    'branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 
    'supervisor_ar', 'jury_president_ar', 'jury_members_ar'
  ]);

  const { professors, ensureProfessor } = useProfessors();

  const getSchema = () => {
    switch (certificateType) {
      case "phd_lmd": return phdLmdSchema;
      case "phd_science": return phdScienceSchema;
      case "master": return masterSchema;
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(getSchema()),
  });

  useEffect(() => {
    if (student && open) {
      const baseValues = {
        student_number: student.student_number,
        full_name_ar: student.full_name_ar,
        full_name_fr: student.full_name_fr || "",
        gender: student.gender || "",
        date_of_birth: student.date_of_birth,
        birthplace_ar: student.birthplace_ar,
        birthplace_fr: student.birthplace_fr || "",
        university_ar: student.university_ar || "جامعة أم البواقي",
        university_fr: student.university_fr || "Université D'oum El Bouaghi",
        faculty_ar: student.faculty_ar || "",
        faculty_fr: student.faculty_fr || "",
        branch_ar: student.branch_ar,
        branch_fr: student.branch_fr || "",
        specialty_ar: student.specialty_ar,
        specialty_fr: student.specialty_fr || "",
        mention: student.mention as "honorable" | "very_honorable",
        defense_date: student.defense_date,
        certificate_date: student.certificate_date,
        first_registration_year: student.first_registration_year || "",
        professional_email: student.professional_email || "",
        phone_number: student.phone_number || "",
        supervisor_ar: ('supervisor_ar' in student ? student.supervisor_ar : "") || "",
        research_lab_ar: student.research_lab_ar || "",
        registration_number: student.registration_number || "",
        co_supervisor_ar: student.co_supervisor_ar || "",
        supervisor_university: student.supervisor_university || "",
        co_supervisor_university: student.co_supervisor_university || "",
        employment_status: student.employment_status || "",
        registration_type: student.registration_type || "",
        inscription_status: student.inscription_status || "",
        current_year: student.current_year || "",
        registration_count: student.registration_count || null,
        notes: student.notes || "",
        province: student.province || "أم البواقي",
        signature_title: student.signature_title || getDefaultSignatureTitle(student.faculty_ar || ""),
        scientific_council_date: student.scientific_council_date || "",
      };

      if (certificateType === "phd_lmd" && "field_ar" in student) {
        form.reset({
          ...baseValues,
          field_ar: student.field_ar,
          field_fr: student.field_fr || "",
          thesis_title_ar: student.thesis_title_ar,
          thesis_title_fr: student.thesis_title_fr || "",
          thesis_language: student.thesis_language || "",
          jury_president_ar: student.jury_president_ar,
          jury_president_fr: student.jury_president_fr || "",
          jury_members_ar: student.jury_members_ar,
          jury_members_fr: student.jury_members_fr || "",
        } as PhdLmdFormValues);
      } else if (certificateType === "phd_science" && "thesis_title_ar" in student) {
        form.reset({
          ...baseValues,
          field_ar: ('field_ar' in student ? student.field_ar : "") || "",
          field_fr: ('field_fr' in student ? student.field_fr : "") || "",
          thesis_title_ar: student.thesis_title_ar,
          thesis_title_fr: student.thesis_title_fr || "",
          thesis_language: student.thesis_language || "",
          jury_president_ar: student.jury_president_ar,
          jury_president_fr: student.jury_president_fr || "",
          jury_members_ar: student.jury_members_ar,
          jury_members_fr: student.jury_members_fr || "",
        } as PhdScienceFormValues);
      } else {
        form.reset(baseValues as MasterFormValues);
      }
    }
  }, [student, open, certificateType, form]);

  const isLoading = updatePhdLmd.isPending || updatePhdScience.isPending || updateMaster.isPending;

  const onSubmit = (data: FormValues) => {
    if (!student) return;

    // حفظ أسماء الأساتذة في قاعدة البيانات
    const d = data as Record<string, unknown>;
    if (d.supervisor_ar) ensureProfessor(String(d.supervisor_ar));
    if (d.co_supervisor_ar) ensureProfessor(String(d.co_supervisor_ar));
    if (d.jury_president_ar) ensureProfessor(String(d.jury_president_ar));
    if (d.jury_members_ar) {
      String(d.jury_members_ar).split(/\s*-\s*/).forEach(m => ensureProfessor(m));
    }

    const handleSuccess = () => {
      onOpenChange(false);
    };

    switch (certificateType) {
      case "phd_lmd":
        updatePhdLmd.mutate({ id: student.id, ...data } as Parameters<typeof updatePhdLmd.mutate>[0], { onSuccess: handleSuccess });
        break;
      case "phd_science":
        updatePhdScience.mutate({ id: student.id, ...data } as Parameters<typeof updatePhdScience.mutate>[0], { onSuccess: handleSuccess });
        break;
      case "master":
        updateMaster.mutate({ id: student.id, ...data } as Parameters<typeof updateMaster.mutate>[0], { onSuccess: handleSuccess });
        break;
    }
  };

  const isPhdLmd = certificateType === "phd_lmd";
  const isPhdScience = certificateType === "phd_science";
  const isPhdType = isPhdLmd || isPhdScience;
  const hasThesis = isPhdLmd || isPhdScience;
  const hasJury = isPhdLmd || isPhdScience;
  const hasField = isPhdLmd || isPhdScience;

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            تعديل بيانات الطالب
            <span className="text-muted-foreground text-sm font-normal">
              ({certificateTypeLabels[certificateType].ar})
            </span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">المعلومات الشخصية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="student_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الشهادة *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isPhdType && (
                  <FormField
                    control={form.control}
                    name={"first_registration_year" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سنة أول تسجيل في الدكتوراه *</FormLabel>
                        <FormControl>
                          <DropdownWithAdd
                            value={(field.value as string) || ''}
                            onChange={field.onChange}
                            optionType="academic_year"
                            placeholder="اختر أو أضف السنة الجامعية"
                            defaultOptions={academicYears}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="full_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم بالعربية *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="full_name_fr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم بالفرنسية</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} className="text-left" dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"gender" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجنس</FormLabel>
                      <Select onValueChange={field.onChange} value={(field.value as string) || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الجنس" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">ذكر</SelectItem>
                          <SelectItem value="female">أنثى</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الميلاد *</FormLabel>
                      <FormControl>
                        <DateInput value={(field.value as string) || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthplace_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مكان الميلاد بالعربية *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthplace_fr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مكان الميلاد بالفرنسية</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} className="text-left" dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information - PhD only */}
            {isPhdType && (
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">معلومات الاتصال</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={"professional_email" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني المهني</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={(field.value as string) || ""} 
                          type="email" 
                          dir="ltr" 
                          placeholder="example@university.dz" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"phone_number" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهاتف</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={(field.value as string) || ""} 
                          type="tel" 
                          dir="ltr" 
                          placeholder="0XX XXX XXXX" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* Academic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">المعلومات الأكاديمية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={"university_ar" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجامعة (عربي)</FormLabel>
                      <FormControl>
                        <Input {...field} value={(field.value as string) || ""} placeholder="اسم الجامعة بالعربية" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"university_fr" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Université</FormLabel>
                      <FormControl>
                        <Input {...field} value={(field.value as string) || ""} className="text-left" dir="ltr" placeholder="Nom de l'université" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"faculty_ar" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>الكلية *</FormLabel>
                      <FormControl>
                        <Input {...field} value={(field.value as string) || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isPhdType && (
                  <FormField
                    control={form.control}
                    name={"research_lab_ar" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>مخبر البحث {isPhdLmd ? '*' : ''}</FormLabel>
                        <FormControl>
                          <DropdownWithAdd
                            value={(field.value as string) || ''}
                            onChange={field.onChange}
                            optionType="research_lab"
                            placeholder="اختر أو أضف مخبر البحث"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {hasField && (
                  <>
                    <FormField
                      control={form.control}
                      name={"field_ar" as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الميدان بالعربية *</FormLabel>
                          <FormControl>
                            <Input {...field} value={(field.value as string) || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={"field_fr" as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الميدان بالفرنسية</FormLabel>
                          <FormControl>
                            <Input {...field} value={(field.value as string) || ""} className="text-left" dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="branch_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الشعبة بالعربية *</FormLabel>
                      <FormControl>
                        <AutocompleteInput
                          {...field}
                          value={field.value || ""}
                          suggestions={suggestions?.branch_ar || []}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branch_fr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الشعبة بالفرنسية</FormLabel>
                      <FormControl>
                        <AutocompleteInput
                          {...field}
                          value={field.value || ""}
                          suggestions={suggestions?.branch_fr || []}
                          className="text-left"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التخصص بالعربية *</FormLabel>
                      <FormControl>
                        <AutocompleteInput
                          {...field}
                          value={field.value || ""}
                          suggestions={suggestions?.specialty_ar || []}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty_fr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التخصص بالفرنسية</FormLabel>
                      <FormControl>
                        <AutocompleteInput
                          {...field}
                          value={field.value || ""}
                          suggestions={suggestions?.specialty_fr || []}
                          className="text-left"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Mention Fields - Separated */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">التقدير / Mention</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mention"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التقدير (عربي) *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر التقدير" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(mentionLabels) as MentionType[]).map((key) => (
                            <SelectItem key={key} value={key}>
                              {mentionLabels[key].ar}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mention"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mention</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir la mention" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(mentionLabels) as MentionType[]).map((key) => (
                            <SelectItem key={key} value={key}>
                              {mentionLabels[key].fr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Supervisor Information - PhD only */}
            {isPhdType && (
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">المشرف ومخبر البحث</h3>
              <FormField
                control={form.control}
                name={"supervisor_ar" as keyof FormValues}
                render={({ field: supField }) => (
                  <FormField
                    control={form.control}
                    name={"supervisor_university" as keyof FormValues}
                    render={({ field: supUniField }) => (
                      <FormField
                        control={form.control}
                        name={"co_supervisor_ar" as keyof FormValues}
                        render={({ field: coSupField }) => (
                          <FormField
                            control={form.control}
                            name={"co_supervisor_university" as keyof FormValues}
                            render={({ field: coSupUniField }) => (
                              <FormItem>
                                <FormControl>
                                  <SupervisorTableInput
                                    supervisorValue={(supField.value as string) || ""}
                                    supervisorUniversity={(supUniField.value as string) || ""}
                                    coSupervisorValue={(coSupField.value as string) || ""}
                                    coSupervisorUniversity={(coSupUniField.value as string) || ""}
                                    onSupervisorChange={(name, university) => {
                                      supField.onChange(name);
                                      supUniField.onChange(university);
                                    }}
                                    onCoSupervisorChange={(name, university) => {
                                      coSupField.onChange(name);
                                      coSupUniField.onChange(university);
                                    }}
                                    nameSuggestions={professors}
                                    universitySuggestions={[]}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      />
                    )}
                  />
                )}
              />
            </div>
            )}

            {/* Thesis Information */}
            {hasThesis && (
              <div className="space-y-4">
                <h3 className="font-semibold text-primary">عنوان الأطروحة</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name={"thesis_title_ar" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان الأطروحة *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={(field.value as string) || ""} 
                            rows={2}
                            dir="auto"
                            placeholder="عنوان الأطروحة (يمكن الكتابة بالعربية أو الفرنسية)"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"thesis_language" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>لغة الأطروحة</FormLabel>
                        <Select onValueChange={field.onChange} value={(field.value as string) || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر لغة الأطروحة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="arabic">العربية</SelectItem>
                            <SelectItem value="french">الفرنسية</SelectItem>
                            <SelectItem value="english">الإنجليزية</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Jury Information */}
            {hasJury && (
              <div className="space-y-4">
                <h3 className="font-semibold text-primary">لجنة المناقشة</h3>
                <FormField
                  control={form.control}
                  name={"jury_president_ar" as keyof FormValues}
                  render={({ field: presidentField }) => (
                    <FormField
                      control={form.control}
                      name={"jury_members_ar" as keyof FormValues}
                      render={({ field: membersField }) => (
                        <FormItem>
                          <FormControl>
                            <JuryTableInput
                              presidentValue={(presidentField.value as string) || ''}
                              membersValue={(membersField.value as string) || ''}
                              onChange={(president, members) => {
                                presidentField.onChange(president);
                                membersField.onChange(members);
                              }}
                              supervisorAr={(form.watch('supervisor_ar' as keyof FormValues) as string) || ''}
                              supervisorUniversity={(form.watch('supervisor_university' as keyof FormValues) as string) || ''}
                              coSupervisorAr={(form.watch('co_supervisor_ar' as keyof FormValues) as string) || ''}
                              coSupervisorUniversity={(form.watch('co_supervisor_university' as keyof FormValues) as string) || ''}
                              nameSuggestions={professors}
                              universitySuggestions={suggestions?.supervisor_ar || []}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                />
              </div>
            )}

            {/* Additional PhD Data */}
            {isPhdType && (
              <div className="space-y-4">
                <h3 className="font-semibold text-primary">بيانات إضافية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={"registration_number" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم التسجيل</FormLabel>
                        <FormControl>
                          <Input {...field} value={(field.value as string) || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"employment_status" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحالة الوظيفية</FormLabel>
                        <FormControl>
                          <Input {...field} value={(field.value as string) || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"registration_type" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع التسجيل</FormLabel>
                        <FormControl>
                          <Input {...field} value={(field.value as string) || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"inscription_status" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حالة التسجيل</FormLabel>
                        <FormControl>
                          <Input {...field} value={(field.value as string) || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"current_year" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سنة التسجيل</FormLabel>
                        <FormControl>
                          <Input {...field} value={(field.value as string) || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"registration_count" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد التسجيلات</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            value={field.value != null ? String(field.value) : ""} 
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"notes" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>ملاحظات</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={(field.value as string) || ""} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">التواريخ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defense_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ المناقشة *</FormLabel>
                      <FormControl>
                        <DateInput value={(field.value as string) || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="certificate_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الشهادة *</FormLabel>
                      <FormControl>
                        <DateInput value={(field.value as string) || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"scientific_council_date" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ المصادقة في المجلس العلمي *</FormLabel>
                      <FormControl>
                        <DateInput value={(field.value as string) || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Province & Signature */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">الولاية والإمضاء</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={"province" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الولاية</FormLabel>
                      <FormControl>
                        <Input {...field} value={(field.value as string) || "أم البواقي"} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"signature_title" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>إمضاء</FormLabel>
                      <FormControl>
                        <Input {...field} value={(field.value as string) || ""} placeholder="عميد الكلية / مدير المعهد" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
