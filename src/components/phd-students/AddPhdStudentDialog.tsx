import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Calculator } from "lucide-react";
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
  useCreatePhdLmdStudent,
  useCreatePhdScienceStudent,
} from "@/hooks/usePhdStudents";
import { DropdownWithAdd } from "@/components/print/DropdownWithAdd";
import { useMultipleFieldSuggestions } from "@/hooks/useFieldSuggestions";
import type { PhdStudentType } from "@/types/phd-students";
import { phdStudentTypeLabels, studentStatusLabels } from "@/types/phd-students";
import { calculateRegistrationDetails, getDefaultInscriptionStatus, getCurrentYearLabel } from "@/lib/registration-calculation";
import { toWesternNumerals } from "@/lib/numerals";
import { academicYears } from "@/components/print/AddStudentDialog";

// Base schema for PhD students
const baseSchema = z.object({
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
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  thesis_title_fr: z.string().optional().nullable(),
  thesis_language: z.string().min(1, "لغة الأطروحة مطلوبة"),
  research_lab_ar: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // New fields
  co_supervisor_ar: z.string().optional().nullable(),
  supervisor_university: z.string().optional().nullable(),
  co_supervisor_university: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  registration_type: z.string().optional().nullable(),
  inscription_status: z.string().optional().nullable(),
  current_year: z.string().optional().nullable(), // Auto-calculated
  registration_count: z.number().optional().nullable(), // Auto-calculated
});

// PhD LMD schema (includes field)
const phdLmdSchema = baseSchema.extend({
  field_ar: z.string().min(1, "الميدان مطلوب"),
  field_fr: z.string().optional().nullable(),
  research_lab_ar: z.string().min(1, "مخبر البحث مطلوب"),
});

// PhD Science schema
const phdScienceSchema = baseSchema;

interface AddPhdStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentType: PhdStudentType;
  currentAcademicYear: string;
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

export function AddPhdStudentDialog({ open, onOpenChange, studentType: initialStudentType, currentAcademicYear }: AddPhdStudentDialogProps) {
  const [selectedType, setSelectedType] = useState<PhdStudentType>(initialStudentType);
  
  // Bilingual dropdown states
  const [employmentStatusAr, setEmploymentStatusAr] = useState("");
  const [employmentStatusFr, setEmploymentStatusFr] = useState("");
  const [registrationTypeAr, setRegistrationTypeAr] = useState("");
  const [registrationTypeFr, setRegistrationTypeFr] = useState("");
  const [inscriptionStatusAr, setInscriptionStatusAr] = useState("");
  const [inscriptionStatusFr, setInscriptionStatusFr] = useState("");
  
  // Calculated registration fields
  const [calculatedCurrentYear, setCalculatedCurrentYear] = useState("");
  const [calculatedRegistrationCount, setCalculatedRegistrationCount] = useState<number | null>(null);
  
  // Check if values have been manually overridden
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  
  // Get the displayed current year based on registration count
  const getDisplayedCurrentYear = (count: number | null): string => {
    if (!count) return "";
    return getCurrentYearLabel(count, selectedType);
  };
  
  const createPhdLmd = useCreatePhdLmdStudent();
  const createPhdScience = useCreatePhdScienceStudent();
  
  // Fetch suggestions for autocomplete fields
  const { data: suggestions } = useMultipleFieldSuggestions([
    'branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 'supervisor_ar'
  ]);

  // Update selected type when prop changes
  useEffect(() => {
    setSelectedType(initialStudentType);
  }, [initialStudentType]);

  const getSchema = () => {
    return selectedType === 'phd_lmd' ? phdLmdSchema : phdScienceSchema;
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
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
      first_registration_year: '',
      professional_email: '',
      phone_number: '',
      supervisor_ar: '',
      thesis_title_ar: '',
      thesis_title_fr: '',
      thesis_language: 'arabic',
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
      current_year: '',
      registration_count: null,
      inscription_status: '',
    },
  });

  // Watch fields for auto-calculation
  const watchedFirstRegistrationYear = form.watch("first_registration_year");
  const watchedRegistrationCount = form.watch("registration_count");

  // Auto-calculate current_year and registration_count when first_registration_year changes
  useEffect(() => {
    if (watchedFirstRegistrationYear && currentAcademicYear) {
      const result = calculateRegistrationDetails(
        currentAcademicYear,
        watchedFirstRegistrationYear,
        selectedType
      );
      
      setCalculatedCurrentYear(result.currentYear);
      setCalculatedRegistrationCount(result.registrationCount);
      
      // Only auto-set values if not manually edited
      if (!isManuallyEdited) {
        form.setValue("current_year", result.currentYear);
        form.setValue("registration_count", result.registrationCount);
      }
      
      // Auto-update inscription_status if late
      if (result.isLate) {
        const newInscriptionStatus = getDefaultInscriptionStatus(result.currentYear, inscriptionStatusAr);
        setInscriptionStatusAr(newInscriptionStatus);
      }
    }
  }, [watchedFirstRegistrationYear, currentAcademicYear, selectedType, form, inscriptionStatusAr, isManuallyEdited]);
  
  // Handle manual registration count change - sync current_year based on the new count
  const handleRegistrationCountChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setIsManuallyEdited(true);
      form.setValue("registration_count", numValue);
      // Auto-sync current_year based on the new registration count
      const newCurrentYear = getDisplayedCurrentYear(numValue);
      form.setValue("current_year", newCurrentYear);
    } else if (value === '') {
      setIsManuallyEdited(false);
      form.setValue("registration_count", calculatedRegistrationCount);
      form.setValue("current_year", calculatedCurrentYear);
    }
  };
  
  // Check if there's a mismatch between entered values and calculated values
  const hasMismatch = isManuallyEdited && 
    watchedRegistrationCount !== null && 
    calculatedRegistrationCount !== null &&
    watchedRegistrationCount !== calculatedRegistrationCount;

  // Reset form when certificate type changes
  useEffect(() => {
    form.clearErrors();
  }, [selectedType, form]);

  const isLoading = createPhdLmd.isPending || createPhdScience.isPending;

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
    // Validate bilingual dropdown fields
    if (!validateBilingualFields()) {
      return;
    }

    try {
      // Add bilingual dropdown values
      const submitData = {
        ...data,
        employment_status: employmentStatusAr || null,
        registration_type: registrationTypeAr || null,
        inscription_status: inscriptionStatusAr || null,
      };

      switch (selectedType) {
        case 'phd_lmd':
          await createPhdLmd.mutateAsync(submitData as Parameters<typeof createPhdLmd.mutateAsync>[0]);
          break;
        case 'phd_science':
          await createPhdScience.mutateAsync(submitData as Parameters<typeof createPhdScience.mutateAsync>[0]);
          break;
      }
      form.reset();
      // Reset bilingual states
      setEmploymentStatusAr("");
      setEmploymentStatusFr("");
      setRegistrationTypeAr("");
      setRegistrationTypeFr("");
      setInscriptionStatusAr("");
      setInscriptionStatusFr("");
      setBilingualErrors({});
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const showFieldField = selectedType === 'phd_lmd';
  const isResearchLabRequired = selectedType === 'phd_lmd';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            إضافة طالب دكتوراه جديد
            <Badge variant="secondary">{phdStudentTypeLabels[selectedType].ar}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Student Type Selection */}
            <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
              <FormItem>
                <FormLabel className="text-base font-semibold">نوع الدكتوراه *</FormLabel>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as PhdStudentType)}>
                  <FormControl>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(phdStudentTypeLabels).map(([key, labels]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {labels.ar}
                          <span className="text-muted-foreground text-sm">({labels.fr})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
              
              {/* Current Year and Registration Count - Editable with warning */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="current_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          سنة التسجيل
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            <Calculator className="h-3 w-3 ml-1" />
                            يتوافق مع عدد التسجيلات
                          </Badge>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            value={field.value || ''} 
                            readOnly
                            className="bg-muted/50 text-foreground font-medium"
                            placeholder="يُحسب من عدد التسجيلات"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="registration_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          عدد التسجيلات في الدكتوراه
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            <Calculator className="h-3 w-3 ml-1" />
                            محسوب تلقائياً
                          </Badge>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            value={field.value ?? ''}
                            onChange={(e) => handleRegistrationCountChange(e.target.value)}
                            className="text-foreground font-medium"
                            placeholder="يُحسب من سنة أول تسجيل"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Mismatch warning - shown below both fields */}
                {hasMismatch && calculatedRegistrationCount && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ حسب سنة أول تسجيل، يجب أن يكون عدد التسجيلات <strong>{toWesternNumerals(calculatedRegistrationCount)}</strong> وبالتالي يكون الطالب مسجل في <strong>{calculatedCurrentYear}</strong>
                    </p>
                  </div>
                )}
              </div>
              
              {/* Info note about calculation */}
              <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                💡 يتم حساب "الطالب مسجل في" و "عدد التسجيلات" تلقائياً بناءً على الفرق بين السنة الجامعية الحالية وسنة أول تسجيل في الدكتوراه
              </p>
            </div>

            {/* Basic Info */}
            <SectionHeader title="المعلومات الأساسية" />
            
            <div className="grid grid-cols-1 gap-4">
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
            </div>

            {/* Name Fields - moved after Basic Info */}
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

            {/* Birth Info - moved under Name section */}
            <div className="grid grid-cols-3 gap-4 mt-4">
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
                    <FormLabel>Lieu de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" placeholder="Lieu de naissance" />
                    </FormControl>
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

            {/* Research Lab */}
            <SectionHeader title="مخبر البحث" />
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

            {/* Field (PhD LMD only) */}
            {showFieldField && (
              <>
                <SectionHeader title="الميدان / Domaine" />
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
                        <FormLabel>Domaine</FormLabel>
                        <FormControl>
                          <DropdownWithAdd
                            value={field.value || ''}
                            onChange={field.onChange}
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
            <SectionHeader title="الشعبة والتخصص" />
            
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
                    <FormLabel>Filière</FormLabel>
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
                    <FormLabel>Spécialité</FormLabel>
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

            {/* Supervisor */}
            <SectionHeader title="المشرف / Directeur de thèse" />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supervisor_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم ولقب المشرف *</FormLabel>
                    <FormControl>
                      <AcademicTitleInput
                        {...field}
                        suggestions={suggestions?.supervisor_ar || []}
                        dir="auto"
                        placeholder="اختر الرتبة ثم اكتب الاسم"
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
            <SectionHeader title="مساعد المشرف / Co-Directeur (اختياري)" />
            
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
                        placeholder="اختر الرتبة ثم اكتب الاسم (اختياري)"
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

            {/* Thesis Title */}
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
                        value={field.value || ''}
                        rows={2} 
                        placeholder="عنوان الأطروحة (يمكن الكتابة بالعربية أو الفرنسية)"
                        dir="auto"
                        className="text-right"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thesis_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>لغة الأطروحة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'arabic'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر لغة الأطروحة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="arabic">عربي</SelectItem>
                        <SelectItem value="french">فرنسي</SelectItem>
                        <SelectItem value="english">انجليزي</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  <FormLabel>ملاحظات إضافية</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ''}
                      rows={2} 
                      placeholder="أي ملاحظات إضافية..."
                      dir="auto"
                    />
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
                إضافة الطالب
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
