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
import { JuryMembersInput } from "@/components/ui/jury-members-input";
import { AcademicTitleInput } from "@/components/ui/academic-title-input";
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
import { mentionLabels, certificateTypeLabels } from "@/types/certificates";
import {
  useUpdatePhdLmdCertificate,
  useUpdatePhdScienceCertificate,
  useUpdateMasterCertificate,
} from "@/hooks/useCertificates";
import { DropdownWithAdd } from "@/components/print/DropdownWithAdd";
import { useMultipleFieldSuggestions } from "@/hooks/useFieldSuggestions";

// توليد السنوات الجامعية من 2000/2001 إلى 2024/2025
const generateAcademicYears = (): string[] => {
  const years: string[] = [];
  for (let year = 2000; year <= 2024; year++) {
    years.push(`${year}/${year + 1}`);
  }
  return years;
};

const academicYears = generateAcademicYears();

// PhD LMD schema
const phdLmdSchema = z.object({
  student_number: z.string().min(1, "رقم الشهادة مطلوب"),
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
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
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
});

type PhdLmdFormValues = z.infer<typeof phdLmdSchema>;

// PhD Science schema
const phdScienceSchema = z.object({
  student_number: z.string().min(1, "رقم الشهادة مطلوب"),
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
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
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  thesis_title_fr: z.string().optional().nullable(),
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
});

type PhdScienceFormValues = z.infer<typeof phdScienceSchema>;

// Magister schema
const masterSchema = z.object({
  student_number: z.string().min(1, "رقم الشهادة مطلوب"),
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
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
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
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
      const studentWithExtras = student as Certificate & {
        first_registration_year?: string;
        professional_email?: string;
        phone_number?: string;
        supervisor_ar?: string;
        research_lab_ar?: string;
      };
      
      const baseValues = {
        student_number: student.student_number,
        full_name_ar: student.full_name_ar,
        full_name_fr: student.full_name_fr || "",
        date_of_birth: student.date_of_birth,
        birthplace_ar: student.birthplace_ar,
        birthplace_fr: student.birthplace_fr || "",
        university_ar: student.university_ar || "جامعة محمد خيضر بسكرة",
        university_fr: student.university_fr || "Université Mohamed Khider Biskra",
        faculty_ar: student.faculty_ar || "",
        faculty_fr: student.faculty_fr || "",
        research_lab_ar: studentWithExtras.research_lab_ar || "",
        branch_ar: student.branch_ar,
        branch_fr: student.branch_fr || "",
        specialty_ar: student.specialty_ar,
        specialty_fr: student.specialty_fr || "",
        mention: student.mention as "honorable" | "very_honorable",
        defense_date: student.defense_date,
        certificate_date: student.certificate_date,
        first_registration_year: studentWithExtras.first_registration_year || "",
        professional_email: studentWithExtras.professional_email || "",
        phone_number: studentWithExtras.phone_number || "",
        supervisor_ar: studentWithExtras.supervisor_ar || "",
      };

      if (certificateType === "phd_lmd" && "field_ar" in student) {
        form.reset({
          ...baseValues,
          field_ar: student.field_ar,
          field_fr: student.field_fr || "",
          thesis_title_ar: student.thesis_title_ar,
          thesis_title_fr: student.thesis_title_fr || "",
          jury_president_ar: student.jury_president_ar,
          jury_president_fr: student.jury_president_fr || "",
          jury_members_ar: student.jury_members_ar,
          jury_members_fr: student.jury_members_fr || "",
        } as PhdLmdFormValues);
      } else if (certificateType === "phd_science" && "thesis_title_ar" in student) {
        form.reset({
          ...baseValues,
          thesis_title_ar: student.thesis_title_ar,
          thesis_title_fr: student.thesis_title_fr || "",
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
  const hasThesis = isPhdLmd || isPhdScience;
  const hasJury = isPhdLmd || isPhdScience;
  const hasField = isPhdLmd;

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
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الميلاد *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
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

            {/* Contact Information */}
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
                    <FormItem>
                      <FormLabel>الكلية *</FormLabel>
                      <FormControl>
                        <DropdownWithAdd
                          value={(field.value as string) || ''}
                          onChange={field.onChange}
                          optionType="faculty"
                          placeholder="اختر أو أدخل الكلية"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"research_lab_ar" as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مخبر البحث</FormLabel>
                      <FormControl>
                        <DropdownWithAdd
                          value={(field.value as string) || ''}
                          onChange={field.onChange}
                          optionType="research_lab"
                          placeholder="اختر أو أدخل مخبر البحث"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

            {/* Supervisor Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">المشرف / Directeur de thèse</h3>
              <FormField
                control={form.control}
                name={"supervisor_ar" as keyof FormValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم ولقب المشرف *</FormLabel>
                    <FormControl>
                      <AcademicTitleInput
                        {...field}
                        value={(field.value as string) || ""}
                        suggestions={suggestions?.supervisor_ar || []}
                        dir="auto"
                        placeholder="اختر الرتبة ثم اكتب الاسم"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                </div>
              </div>
            )}

            {/* Jury Information */}
            {hasJury && (
              <div className="space-y-4">
                <h3 className="font-semibold text-primary">لجنة المناقشة</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name={"jury_president_ar" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رئيس اللجنة *</FormLabel>
                        <FormControl>
                          <AcademicTitleInput
                            value={(field.value as string) || ""}
                            onChange={field.onChange}
                            suggestions={suggestions?.jury_president_ar || []}
                            dir="auto"
                            placeholder="اكتب الرتبة (أد، د) ثم الاسم"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"jury_members_ar" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>أعضاء اللجنة *</FormLabel>
                        <FormControl>
                          <JuryMembersInput
                            value={(field.value as string) || ""}
                            onChange={field.onChange}
                            suggestions={suggestions?.jury_members_ar || []}
                            dir="auto"
                          />
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
                        <Input type="date" {...field} value={field.value || ""} />
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
                        <Input type="date" {...field} value={field.value || ""} />
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
