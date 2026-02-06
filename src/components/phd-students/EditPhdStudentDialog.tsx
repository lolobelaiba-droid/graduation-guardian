import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { AcademicTitleInput } from "@/components/ui/academic-title-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BilingualDropdown } from "@/components/ui/bilingual-dropdown";
import {
  useUpdatePhdLmdStudent,
  useUpdatePhdScienceStudent,
} from "@/hooks/usePhdStudents";
import { DropdownWithAdd } from "@/components/print/DropdownWithAdd";
import { useMultipleFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { useBilingualDropdownOptions } from "@/hooks/useBilingualDropdownOptions";
import type { PhdStudentType, PhdStudent, PhdLmdStudent } from "@/types/phd-students";
import { phdStudentTypeLabels, studentStatusLabels } from "@/types/phd-students";

// Generate academic years
const generateAcademicYears = (): string[] => {
  const years: string[] = [];
  for (let year = 2000; year <= 2024; year++) {
    years.push(`${year}/${year + 1}`);
  }
  return years;
};

const academicYears = generateAcademicYears();

// Base schema
const baseSchema = z.object({
  registration_number: z.string().min(1, "رقم التسجيل مطلوب"),
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']),
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
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
  thesis_title_ar: z.string().optional().nullable(),
  thesis_title_fr: z.string().optional().nullable(),
  research_lab_ar: z.string().optional().nullable(),
  status: z.string(),
  notes: z.string().optional().nullable(),
  // New fields
  co_supervisor_ar: z.string().optional().nullable(),
  supervisor_university: z.string().optional().nullable(),
  co_supervisor_university: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  registration_type: z.string().optional().nullable(),
  inscription_status: z.string().optional().nullable(),
});

const phdLmdSchema = baseSchema.extend({
  field_ar: z.string().min(1, "الميدان مطلوب"),
  field_fr: z.string().optional().nullable(),
  research_lab_ar: z.string().min(1, "مخبر البحث مطلوب"),
});

const phdScienceSchema = baseSchema;

interface EditPhdStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: PhdStudent | null;
  studentType: PhdStudentType;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      <Separator className="flex-1" />
      <span className="text-sm font-semibold text-primary whitespace-nowrap">{title}</span>
      <Separator className="flex-1" />
    </div>
  );
}

export function EditPhdStudentDialog({ open, onOpenChange, student, studentType }: EditPhdStudentDialogProps) {
  const updatePhdLmd = useUpdatePhdLmdStudent();
  const updatePhdScience = useUpdatePhdScienceStudent();
  
  // Bilingual dropdown states
  const [employmentStatusAr, setEmploymentStatusAr] = useState("");
  const [employmentStatusFr, setEmploymentStatusFr] = useState("");
  const [registrationTypeAr, setRegistrationTypeAr] = useState("");
  const [registrationTypeFr, setRegistrationTypeFr] = useState("");
  const [inscriptionStatusAr, setInscriptionStatusAr] = useState("");
  const [inscriptionStatusFr, setInscriptionStatusFr] = useState("");
  
  // Fetch bilingual options to get French translations
  const { data: employmentOptions = [] } = useBilingualDropdownOptions("employment_status");
  const { data: registrationOptions = [] } = useBilingualDropdownOptions("registration_type");
  const { data: inscriptionOptions = [] } = useBilingualDropdownOptions("inscription_status");
  
  const { data: suggestions } = useMultipleFieldSuggestions([
    'branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 'supervisor_ar'
  ]);

  const getSchema = () => {
    return studentType === 'phd_lmd' ? phdLmdSchema : phdScienceSchema;
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      registration_number: '',
      full_name_ar: '',
      full_name_fr: '',
      gender: 'male' as 'male' | 'female',
      date_of_birth: '',
      birthplace_ar: '',
      birthplace_fr: '',
      university_ar: '',
      university_fr: '',
      faculty_ar: '',
      faculty_fr: '',
      branch_ar: '',
      branch_fr: '',
      specialty_ar: '',
      specialty_fr: '',
      first_registration_year: '',
      professional_email: '',
      phone_number: '',
      supervisor_ar: '',
      thesis_title_ar: '',
      thesis_title_fr: '',
      research_lab_ar: '',
      field_ar: '',
      field_fr: '',
      status: 'active',
      notes: '',
      // New fields
      co_supervisor_ar: '',
      supervisor_university: '',
      co_supervisor_university: '',
      employment_status: '',
      registration_type: '',
      inscription_status: '',
    },
  });

  // Reset form when student changes
  useEffect(() => {
    if (student) {
      form.reset({
        registration_number: student.registration_number,
        full_name_ar: student.full_name_ar,
        full_name_fr: student.full_name_fr || '',
        gender: student.gender as 'male' | 'female',
        date_of_birth: student.date_of_birth,
        birthplace_ar: student.birthplace_ar,
        birthplace_fr: student.birthplace_fr || '',
        university_ar: student.university_ar || '',
        university_fr: student.university_fr || '',
        faculty_ar: student.faculty_ar,
        faculty_fr: student.faculty_fr || '',
        branch_ar: student.branch_ar,
        branch_fr: student.branch_fr || '',
        specialty_ar: student.specialty_ar,
        specialty_fr: student.specialty_fr || '',
        first_registration_year: student.first_registration_year || '',
        professional_email: student.professional_email || '',
        phone_number: student.phone_number || '',
        supervisor_ar: student.supervisor_ar,
        thesis_title_ar: student.thesis_title_ar || '',
        thesis_title_fr: student.thesis_title_fr || '',
        research_lab_ar: student.research_lab_ar || '',
        field_ar: (student as PhdLmdStudent).field_ar || '',
        field_fr: (student as PhdLmdStudent).field_fr || '',
        status: student.status,
        notes: student.notes || '',
        // New fields
        co_supervisor_ar: student.co_supervisor_ar || '',
        supervisor_university: student.supervisor_university || '',
        co_supervisor_university: student.co_supervisor_university || '',
      });

      // Set bilingual dropdown states
      const empStatusAr = student.employment_status || '';
      setEmploymentStatusAr(empStatusAr);
      const empOption = employmentOptions.find(opt => opt.value_ar === empStatusAr);
      setEmploymentStatusFr(empOption?.value_fr || '');

      const regTypeAr = student.registration_type || '';
      setRegistrationTypeAr(regTypeAr);
      const regOption = registrationOptions.find(opt => opt.value_ar === regTypeAr);
      setRegistrationTypeFr(regOption?.value_fr || '');

      const inscStatusAr = student.inscription_status || '';
      setInscriptionStatusAr(inscStatusAr);
      const inscOption = inscriptionOptions.find(opt => opt.value_ar === inscStatusAr);
      setInscriptionStatusFr(inscOption?.value_fr || '');
    }
  }, [student, form, employmentOptions, registrationOptions, inscriptionOptions]);

  const isLoading = updatePhdLmd.isPending || updatePhdScience.isPending;

  // Validation errors for bilingual dropdowns
  const [bilingualErrors, setBilingualErrors] = useState<{ employment_status?: string; registration_type?: string }>({});

  const validateBilingualFields = () => {
    const errors: { employment_status?: string; registration_type?: string } = {};
    
    if (!employmentStatusAr.trim()) {
      errors.employment_status = "الحالة الوظيفية مطلوبة";
    }
    if (!registrationTypeAr.trim()) {
      errors.registration_type = "نوع التسجيل مطلوب";
    }
    
    setBilingualErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (data: z.infer<typeof phdLmdSchema>) => {
    if (!student) return;
    
    // Validate bilingual dropdown fields
    if (!validateBilingualFields()) {
      return;
    }
    
    try {
      const submitData = {
        ...data,
        employment_status: employmentStatusAr || null,
        registration_type: registrationTypeAr || null,
        inscription_status: inscriptionStatusAr || null,
      };

      switch (studentType) {
        case 'phd_lmd':
          await updatePhdLmd.mutateAsync({ id: student.id, ...submitData });
          break;
        case 'phd_science':
          await updatePhdScience.mutateAsync({ id: student.id, ...submitData });
          break;
      }
      setBilingualErrors({});
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (!student) return null;

  const showFieldField = studentType === 'phd_lmd';
  const isResearchLabRequired = studentType === 'phd_lmd';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            تعديل بيانات الطالب
            <Badge variant="secondary">{phdStudentTypeLabels[studentType].ar}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info */}
            <SectionHeader title="المعلومات الأساسية" />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registration_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم التسجيل *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="رقم التسجيل" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="first_registration_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سنة أول تسجيل *</FormLabel>
                    <FormControl>
                      <DropdownWithAdd
                        value={field.value || ''}
                        onChange={field.onChange}
                        optionType="academic_year"
                        placeholder="اختر السنة"
                        defaultOptions={academicYears}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(studentStatusLabels).map(([key, labels]) => (
                          <SelectItem key={key} value={key}>
                            {labels.ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Name Fields - moved after Basic Info */}
            <SectionHeader title="الاسم واللقب" />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="full_name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم (عربي) *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Nom et Prénom</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجنس *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
            </div>

            {/* Contact Info */}
            <SectionHeader title="معلومات الاتصال" />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="professional_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} type="email" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} type="tel" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Birth Info */}
            <SectionHeader title="معلومات الميلاد" />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الميلاد *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>مكان الميلاد *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Lieu de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Faculty */}
            <SectionHeader title="الكلية" />
            <FormField
              control={form.control}
              name="faculty_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الكلية *</FormLabel>
                  <FormControl>
                    <DropdownWithAdd
                      value={field.value}
                      onChange={field.onChange}
                      optionType="faculty"
                      placeholder="اختر الكلية"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Research Lab */}
            <SectionHeader title="مخبر البحث" />
            <FormField
              control={form.control}
              name="research_lab_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مخبر البحث {isResearchLabRequired ? '*' : ''}</FormLabel>
                  <FormControl>
                    <DropdownWithAdd
                      value={field.value || ''}
                      onChange={field.onChange}
                      optionType="research_lab"
                      placeholder="مخبر البحث"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field (PhD LMD only) */}
            {showFieldField && (
              <>
                <SectionHeader title="الميدان" />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="field_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الميدان (عربي) *</FormLabel>
                        <FormControl>
                          <DropdownWithAdd
                            value={field.value || ''}
                            onChange={field.onChange}
                            optionType="field_ar"
                            placeholder="الميدان"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="field_fr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domaine</FormLabel>
                        <FormControl>
                          <DropdownWithAdd
                            value={field.value || ''}
                            onChange={field.onChange}
                            optionType="field_fr"
                            placeholder="Domaine"
                            dir="ltr"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Branch & Specialty */}
            <SectionHeader title="الشعبة والتخصص" />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branch_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الشعبة *</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
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
                    <FormLabel>Filière</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
                        value={field.value || ''}
                        suggestions={suggestions?.branch_fr || []}
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specialty_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التخصص *</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
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
                    <FormLabel>Spécialité</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
                        value={field.value || ''}
                        suggestions={suggestions?.specialty_fr || []}
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Supervisor */}
            <SectionHeader title="المشرف" />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supervisor_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المشرف *</FormLabel>
                    <FormControl>
                      <AcademicTitleInput
                        {...field}
                        suggestions={suggestions?.supervisor_ar || []}
                        dir="auto"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="supervisor_university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>جامعة انتماء المشرف</FormLabel>
                    <FormControl>
                      <DropdownWithAdd
                        value={field.value || ''}
                        onChange={field.onChange}
                        optionType="university"
                        placeholder="اختر أو أضف جامعة المشرف"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Co-Supervisor */}
            <SectionHeader title="مساعد المشرف (اختياري)" />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="co_supervisor_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم ولقب مساعد المشرف</FormLabel>
                    <FormControl>
                      <AcademicTitleInput
                        {...field}
                        value={field.value || ''}
                        suggestions={suggestions?.supervisor_ar || []}
                        dir="auto"
                        placeholder="اختياري"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="co_supervisor_university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>جامعة انتماء مساعد المشرف</FormLabel>
                    <FormControl>
                      <DropdownWithAdd
                        value={field.value || ''}
                        onChange={field.onChange}
                        optionType="university"
                        placeholder="اختر أو أضف جامعة مساعد المشرف"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Thesis */}
            <SectionHeader title="الأطروحة" />
            <FormField
              control={form.control}
              name="thesis_title_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان الأطروحة</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} rows={2} dir="auto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Employment Status, Registration Type, Inscription Status - moved after Thesis */}
            <SectionHeader title="الحالة الوظيفية ونوع التسجيل" />
            
            <div className="space-y-1">
              <BilingualDropdown
                valueAr={employmentStatusAr}
                valueFr={employmentStatusFr}
                onChangeAr={(v) => { setEmploymentStatusAr(v); setBilingualErrors(prev => ({ ...prev, employment_status: undefined })); }}
                onChangeFr={setEmploymentStatusFr}
                optionType="employment_status"
                labelAr="الحالة الوظيفية"
                labelFr="Situation professionnelle"
                placeholderAr="اختر الحالة الوظيفية"
                placeholderFr="Choisir la situation"
                required
              />
              {bilingualErrors.employment_status && (
                <p className="text-sm font-medium text-destructive">{bilingualErrors.employment_status}</p>
              )}
            </div>

            <div className="space-y-1">
              <BilingualDropdown
                valueAr={registrationTypeAr}
                valueFr={registrationTypeFr}
                onChangeAr={(v) => { setRegistrationTypeAr(v); setBilingualErrors(prev => ({ ...prev, registration_type: undefined })); }}
                onChangeFr={setRegistrationTypeFr}
                optionType="registration_type"
                labelAr="نوع التسجيل"
                labelFr="Type d'inscription"
                placeholderAr="اختر نوع التسجيل"
                placeholderFr="Choisir le type"
                required
              />
              {bilingualErrors.registration_type && (
                <p className="text-sm font-medium text-destructive">{bilingualErrors.registration_type}</p>
              )}
            </div>

            <BilingualDropdown
              valueAr={inscriptionStatusAr}
              valueFr={inscriptionStatusFr}
              onChangeAr={setInscriptionStatusAr}
              onChangeFr={setInscriptionStatusFr}
              optionType="inscription_status"
              labelAr="حالة التسجيل"
              labelFr="Statut d'inscription"
              placeholderAr="اختر حالة التسجيل"
              placeholderFr="Choisir le statut"
            />

            {/* Notes */}
            <SectionHeader title="ملاحظات" />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} rows={2} dir="auto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
