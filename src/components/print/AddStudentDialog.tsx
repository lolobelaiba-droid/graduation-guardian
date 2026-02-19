import { useState, useEffect, useCallback } from "react";
import { useFieldDomainSync } from "@/hooks/useFieldDomainSync";
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
import { DateInput } from "@/components/ui/date-input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { JuryTableInput, SupervisorTableInput } from "@/components/ui/jury-table-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  useCreatePhdLmdCertificate,
  useCreatePhdScienceCertificate,
  useCreateMasterCertificate,
} from "@/hooks/useCertificates";
import {
  certificateTypeLabels,
  mentionLabels,
  getDefaultSignatureTitle,
  type CertificateType,
  type MentionType,
} from "@/types/certificates";
import { DropdownWithAdd } from "./DropdownWithAdd";
import { UniversityAutocomplete } from "@/components/ui/university-autocomplete";
import { useMultipleFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { useProfessors } from "@/hooks/useProfessors";
import { useUniversityOptions } from "@/hooks/useUniversityOptions";

// توليد السنوات الجامعية من 2000/2001 إلى 2024/2025
const generateAcademicYears = (): string[] => {
  const years: string[] = [];
  for (let year = 2000; year <= 2024; year++) {
    years.push(`${year}/${year + 1}`);
  }
  return years;
};

export const academicYears = generateAcademicYears();

// Schema for Master (without supervisor, first_registration_year, email, phone)
const masterSchema = z.object({
  student_number: z.string().min(1, "رقم الشهادة مطلوب"),
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
  mention: z.enum(['honorable', 'very_honorable']),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().optional(),
  province: z.string().optional().nullable(),
  signature_title: z.string().optional().nullable(),
  scientific_council_date: z.string().min(1, "تاريخ المصادقة في المجلس العلمي مطلوب"),
});

// Base schema for PhD types (includes supervisor and contact info)
const baseSchema = z.object({
  student_number: z.string().min(1, "رقم الشهادة مطلوب"),
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
  mention: z.enum(['honorable', 'very_honorable']),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().optional(),
  province: z.string().optional().nullable(),
  signature_title: z.string().optional().nullable(),
  scientific_council_date: z.string().min(1, "تاريخ المصادقة في المجلس العلمي مطلوب"),
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
});

const phdScienceSchema = baseSchema.extend({
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  thesis_title_fr: z.string().optional().nullable(),
  field_ar: z.string().min(1, "الميدان مطلوب"),
  field_fr: z.string().optional().nullable(),
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
  research_lab_ar: z.string().optional().nullable(), // اختياري لدكتوراه علوم
});

const phdLmdSchema = phdScienceSchema.extend({
  research_lab_ar: z.string().min(1, "مخبر البحث مطلوب"), // مطلوب لدكتوراه ل م د
});

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateType: CertificateType;
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

export function AddStudentDialog({ open, onOpenChange, certificateType: initialCertificateType }: AddStudentDialogProps) {
  const [selectedType, setSelectedType] = useState<CertificateType>(initialCertificateType);
  
  const createPhdLmd = useCreatePhdLmdCertificate();
  const createPhdScience = useCreatePhdScienceCertificate();
  const createMaster = useCreateMasterCertificate();
  
  // Fetch suggestions for autocomplete fields
  const { data: suggestions } = useMultipleFieldSuggestions([
    'branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 
    'supervisor_ar', 'jury_president_ar', 'jury_members_ar'
  ]);

  const { professorNames, ensureProfessor, findProfessor } = useProfessors();
  const { universityNames } = useUniversityOptions();

  // Update selected type when prop changes
  useEffect(() => {
    setSelectedType(initialCertificateType);
  }, [initialCertificateType]);

  const getSchema = () => {
    switch (selectedType) {
      case 'phd_lmd': return phdLmdSchema;
      case 'phd_science': return phdScienceSchema;
      case 'master': return masterSchema;
    }
  };

  const { getFrFromAr, getArFromFr } = useFieldDomainSync();
  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      student_number: '',
      full_name_ar: '',
      full_name_fr: '',
      gender: 'male' as 'male' | 'female',
      date_of_birth: '',
      birthplace_ar: '',
      birthplace_fr: '',
      university_ar: 'جامعة أم البواقي',
      university_fr: "Université D'oum El Bouaghi",
      faculty_ar: '',
      faculty_fr: '',
      branch_ar: '',
      branch_fr: '',
      specialty_ar: '',
      specialty_fr: '',
      mention: 'honorable' as MentionType,
      defense_date: '',
      certificate_date: new Date().toISOString().split('T')[0],
      thesis_title_ar: '',
      thesis_title_fr: '',
      field_ar: '',
      field_fr: '',
      jury_president_ar: '',
      jury_president_fr: '',
      jury_members_ar: '',
      jury_members_fr: '',
      first_registration_year: '',
      professional_email: '',
      phone_number: '',
      supervisor_ar: '',
      research_lab_ar: '',
      province: 'أم البواقي',
      signature_title: '',
      scientific_council_date: '',
    },
  });

  // Reset form when certificate type changes
  useEffect(() => {
    form.clearErrors();
  }, [selectedType, form]);

  // Auto-compute signature_title based on faculty
  const watchedFaculty = form.watch('faculty_ar');
  useEffect(() => {
    if (watchedFaculty) {
      const currentSig = form.getValues('signature_title');
      if (!currentSig) {
        form.setValue('signature_title', getDefaultSignatureTitle(watchedFaculty));
      }
    }
  }, [watchedFaculty, form]);

  const isLoading = createPhdLmd.isPending || createPhdScience.isPending || createMaster.isPending;

  const onSubmit = async (data: z.infer<typeof phdLmdSchema>) => {
    try {
      // حفظ أسماء الأساتذة في قاعدة البيانات
      const d = data as Record<string, unknown>;
      if (d.supervisor_ar) ensureProfessor(String(d.supervisor_ar));
      if (d.co_supervisor_ar) ensureProfessor(String(d.co_supervisor_ar));
      if (d.jury_president_ar) ensureProfessor(String(d.jury_president_ar));
      if (d.jury_members_ar) {
        String(d.jury_members_ar).split(/\s*-\s*/).forEach(m => ensureProfessor(m));
      }

      // Remove field_ar/field_fr for master type (doesn't have these columns)
      const { field_ar, field_fr, ...restData } = data;
      
      switch (selectedType) {
        case 'phd_lmd':
          await createPhdLmd.mutateAsync({ ...restData, field_ar, field_fr } as Parameters<typeof createPhdLmd.mutateAsync>[0]);
          break;
        case 'phd_science':
          await createPhdScience.mutateAsync({ ...restData, field_ar: field_ar || '', field_fr } as Parameters<typeof createPhdScience.mutateAsync>[0]);
          break;
        case 'master':
          await createMaster.mutateAsync(restData as Parameters<typeof createMaster.mutateAsync>[0]);
          break;
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const showThesisFields = selectedType === 'phd_lmd' || selectedType === 'phd_science';
  const showFieldField = selectedType === 'phd_lmd' || selectedType === 'phd_science';
  const showJuryFields = selectedType === 'phd_lmd' || selectedType === 'phd_science';
  const showResearchLabField = selectedType === 'phd_lmd' || selectedType === 'phd_science';
  const isResearchLabRequired = selectedType === 'phd_lmd';
  const showPhdOnlyFields = selectedType === 'phd_lmd' || selectedType === 'phd_science';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            إضافة طالب جديد
            <Badge variant="secondary">{certificateTypeLabels[selectedType].ar}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Certificate Type Selection - Only show for non-master types */}
            {initialCertificateType !== 'master' ? (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <FormItem>
                  <FormLabel className="text-base font-semibold">نوع الشهادة *</FormLabel>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as CertificateType)}>
                    <FormControl>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(certificateTypeLabels)
                        .filter(([key]) => key !== 'master')
                        .map(([key, labels]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              {labels.ar}
                              <span className="text-muted-foreground text-sm">({labels.fr})</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    اختر نوع الشهادة المناسب للطالب - سيتم حفظ الطالب في الجدول المخصص لهذا النوع
                  </p>
                </FormItem>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">نوع الشهادة:</span>
                  <Badge variant="secondary" className="text-base">{certificateTypeLabels.master.ar}</Badge>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <SectionHeader title="المعلومات الأساسية" />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="student_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الشهادة *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="رقم الشهادة" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {showPhdOnlyFields && (
                <FormField
                  control={form.control}
                  name="first_registration_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سنة أول تسجيل في الدكتوراه *</FormLabel>
                      <FormControl>
                        <DropdownWithAdd
                          value={field.value || ''}
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
            </div>

            {/* Contact Info - PhD only */}
            {showPhdOnlyFields && (
              <>
                <SectionHeader title="معلومات الاتصال" />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="professional_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني المهني</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
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
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
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
              </>
            )}

            {/* Mention Fields - Separated */}
            <SectionHeader title="التقدير / Mention" />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mention"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التقدير (عربي) *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر التقدير" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(mentionLabels).map(([key, labels]) => (
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

              <FormField
                control={form.control}
                name="mention"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mention</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir la mention" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(mentionLabels).map(([key, labels]) => (
                          <SelectItem key={key} value={key}>
                            {labels.fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Name Fields */}
            <SectionHeader title="الاسم واللقب / Nom et Prénom" />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="full_name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم واللقب (عربي) *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="الاسم الكامل بالعربية" />
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
                      <Input {...field} value={field.value || ''} dir="ltr" placeholder="Nom et Prénom en français" />
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
            </div>

            {/* Birth Info */}
            <SectionHeader title="معلومات الميلاد / Naissance" />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الميلاد / Né(e) le *</FormLabel>
                    <FormControl>
                      <DateInput value={field.value} onChange={field.onChange} />
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
                    <FormLabel>مكان الميلاد (عربي) *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مكان الميلاد" />
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
                    <FormLabel>lieu de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" placeholder="Lieu de naissance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* University */}
            <SectionHeader title="الجامعة / Université" />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="university_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجامعة (عربي)</FormLabel>
                    <FormControl>
                      <UniversityAutocomplete
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="university_fr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Université</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" placeholder="Nom de l'université en français" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Faculty */}
            <SectionHeader title="الكلية" />
            <div className="grid grid-cols-1 gap-4">
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
                        placeholder="اختر أو أدخل الكلية"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Research Lab - After Faculty */}
            {showResearchLabField && (
              <>
                <SectionHeader title="مخبر البحث / Laboratoire de recherche" />
                <div className="grid grid-cols-1 gap-4">
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
                            placeholder="اختر أو أدخل اسم مخبر البحث"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Field (PhD LMD only) */}
            {showFieldField && (
              <>
                <SectionHeader title="الميدان / domaine" />
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
                            onChange={(v) => {
                              field.onChange(v);
                              const fr = getFrFromAr(v);
                              if (fr) form.setValue('field_fr', fr);
                            }}
                            optionType="field_ar"
                            placeholder="اختر أو أدخل الميدان"
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
                        <FormLabel>domaine</FormLabel>
                        <FormControl>
                          <DropdownWithAdd
                            value={field.value || ''}
                            onChange={(v) => {
                              field.onChange(v);
                              const ar = getArFromFr(v);
                              if (ar) form.setValue('field_ar', ar);
                            }}
                            optionType="field_fr"
                            placeholder="Choisir ou saisir le domaine"
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
            <SectionHeader title="الشعبة والتخصص / filière et spécialité" />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branch_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الشعبة (عربي) *</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
                        suggestions={suggestions?.branch_ar || []}
                        placeholder="الشعبة"
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
                    <FormLabel>filière</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
                        value={field.value || ''}
                        suggestions={suggestions?.branch_fr || []}
                        dir="ltr"
                        placeholder="Filière"
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
                    <FormLabel>التخصص (عربي) *</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
                        suggestions={suggestions?.specialty_ar || []}
                        placeholder="التخصص"
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
                    <FormLabel>spécialité</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
                        value={field.value || ''}
                        suggestions={suggestions?.specialty_fr || []}
                        dir="ltr"
                        placeholder="Spécialité"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Supervisor - PhD only */}
            {showPhdOnlyFields && (
              <>
                <SectionHeader title="المشرف / Directeur de thèse" />
                <FormField
                  control={form.control}
                  name="supervisor_ar"
                  render={({ field: supervisorField }) => (
                    <FormItem>
                      <FormControl>
                        <SupervisorTableInput
                          supervisorValue={supervisorField.value || ''}
                          supervisorUniversity={''}
                          coSupervisorValue={''}
                          coSupervisorUniversity={''}
                          onSupervisorChange={(name) => supervisorField.onChange(name)}
                          onCoSupervisorChange={() => {}}
                          nameSuggestions={professorNames}
                          universitySuggestions={universityNames}
                          findProfessor={findProfessor}
                          onProfessorDataChange={ensureProfessor}
                          showCoSupervisor={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Thesis */}
            {showThesisFields && (
              <>
                <SectionHeader title="عنوان الأطروحة" />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="thesis_title_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان الأطروحة *</FormLabel>
                        <FormControl>
                        <Textarea 
                            {...field} 
                            rows={2} 
                            placeholder="عنوان الأطروحة (يمكن الكتابة بالعربية أو الفرنسية)"
                            dir="auto"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Dates */}
            <SectionHeader title="التواريخ / Dates" />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ محضر المناقشة *</FormLabel>
                    <FormControl>
                      <DateInput value={field.value} onChange={field.onChange} />
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
                    <FormLabel>تاريخ اصدار الشهادة</FormLabel>
                    <FormControl>
                      <DateInput value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scientific_council_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ المصادقة في المجلس العلمي *</FormLabel>
                    <FormControl>
                      <DateInput value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Jury */}
            {showJuryFields && (
              <>
                <SectionHeader title="لجنة المناقشة" />
                <FormField
                  control={form.control}
                  name="jury_president_ar"
                  render={({ field: presidentField }) => (
                    <FormField
                      control={form.control}
                      name="jury_members_ar"
                      render={({ field: membersField }) => (
                        <FormItem>
                          <FormControl>
                            <JuryTableInput
                              presidentValue={presidentField.value || ''}
                              membersValue={membersField.value || ''}
                              onChange={(president, members) => {
                                presidentField.onChange(president);
                                membersField.onChange(members);
                              }}
                              supervisorAr={String((form.watch as any)('supervisor_ar') || '')}
                              supervisorUniversity={String((form.getValues as any)('supervisor_university') || '')}
                              coSupervisorAr={String((form.getValues as any)('co_supervisor_ar') || '')}
                              coSupervisorUniversity={String((form.getValues as any)('co_supervisor_university') || '')}
                              nameSuggestions={professorNames}
                              universitySuggestions={universityNames}
                              findProfessor={findProfessor}
                              onProfessorDataChange={ensureProfessor}
                              onSupervisorChange={(name, university) => {
                                (form.setValue as any)('supervisor_ar', name);
                                (form.setValue as any)('supervisor_university', university);
                              }}
                              onCoSupervisorChange={(name, university) => {
                                (form.setValue as any)('co_supervisor_ar', name);
                                (form.setValue as any)('co_supervisor_university', university);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                />
              </>
            )}

            {/* Province & Signature */}
            <SectionHeader title="الولاية والإمضاء" />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الولاية</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || 'أم البواقي'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="signature_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>إمضاء</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="عميد الكلية / مدير المعهد" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                إضافة الطالب
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
