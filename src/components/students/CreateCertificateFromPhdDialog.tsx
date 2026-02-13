import { useState, useEffect, useCallback } from "react";
import { useFieldDomainSync } from "@/hooks/useFieldDomainSync";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search, UserPlus, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { JuryMembersInput } from "@/components/ui/jury-members-input";
import { AcademicTitleInput } from "@/components/ui/academic-title-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCreatePhdLmdCertificate,
  useCreatePhdScienceCertificate,
} from "@/hooks/useCertificates";
import {
  usePhdLmdStudents,
  usePhdScienceStudents,
  useDeletePhdLmdStudent,
  useDeletePhdScienceStudent,
} from "@/hooks/usePhdStudents";
import {
  certificateTypeLabels,
  mentionLabels,
  getDefaultSignatureTitle,
  type CertificateType,
  type MentionType,
} from "@/types/certificates";
import type { PhdStudent, PhdLmdStudent } from "@/types/phd-students";
import { DropdownWithAdd } from "@/components/print/DropdownWithAdd";
import { useMultipleFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { academicYears } from "@/components/print/AddStudentDialog";

// Schema for creating certificate from PhD student (fields that need to be filled)
const certificateSchema = z.object({
  // Pre-filled from PhD student
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
  branch_ar: z.string().min(1, "الشعبة مطلوبة"),
  branch_fr: z.string().optional().nullable(),
  specialty_ar: z.string().min(1, "التخصص مطلوب"),
  specialty_fr: z.string().optional().nullable(),
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
  research_lab_ar: z.string().optional().nullable(),
  
  // Fields to be filled for certificate (single fields with auto-direction)
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  mention: z.enum(['honorable', 'very_honorable']),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().optional(),
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  
  // PhD LMD specific
  field_ar: z.string().optional().nullable(),
  field_fr: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  signature_title: z.string().optional().nullable(),
  scientific_council_date: z.string().min(1, "تاريخ المصادقة في المجلس العلمي مطلوب"),
});

interface CreateCertificateFromPhdDialogProps {
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

export function CreateCertificateFromPhdDialog({ 
  open, 
  onOpenChange, 
  certificateType: initialCertificateType 
}: CreateCertificateFromPhdDialogProps) {
  const [selectedType, setSelectedType] = useState<CertificateType>(initialCertificateType);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<PhdStudent | null>(null);
  const [pendingStudent, setPendingStudent] = useState<PhdStudent | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const createPhdLmd = useCreatePhdLmdCertificate();
  const createPhdScience = useCreatePhdScienceCertificate();
  const deletePhdLmd = useDeletePhdLmdStudent();
  const deletePhdScience = useDeletePhdScienceStudent();
  
  const { data: phdLmdStudents = [], isLoading: loadingLmd } = usePhdLmdStudents();
  const { data: phdScienceStudents = [], isLoading: loadingScience } = usePhdScienceStudents();
  
  const isLoadingStudents = loadingLmd || loadingScience;
  
  const { data: suggestions } = useMultipleFieldSuggestions([
    'branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 
    'supervisor_ar', 'jury_president_ar', 'jury_members_ar'
  ]);

  useEffect(() => {
    setSelectedType(initialCertificateType);
    setSelectedStudent(null);
    setPendingStudent(null);
    setShowForm(false);
    setSearchQuery("");
    setShowConfirmDialog(false);
  }, [initialCertificateType, open]);

  // Filter students based on type and search
  const availableStudents = selectedType === 'phd_lmd' ? phdLmdStudents : phdScienceStudents;
  const filteredStudents = availableStudents.filter((student) => {
    if (!searchQuery) return true;
    return (
      student.full_name_ar.includes(searchQuery) ||
      student.registration_number.includes(searchQuery) ||
      (student.full_name_fr?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      student.specialty_ar.includes(searchQuery)
    );
  });

  const { getFrFromAr, getArFromFr } = useFieldDomainSync();
  const form = useForm({
    resolver: zodResolver(certificateSchema),
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
      branch_ar: '',
      branch_fr: '',
      specialty_ar: '',
      specialty_fr: '',
      mention: 'honorable' as MentionType,
      defense_date: '',
      certificate_date: new Date().toISOString().split('T')[0],
      thesis_title_ar: '',
      field_ar: '',
      field_fr: '',
      jury_president_ar: '',
      jury_members_ar: '',
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

  // Show confirmation dialog before selecting student
  const handleStudentClick = (student: PhdStudent) => {
    setPendingStudent(student);
    setShowConfirmDialog(true);
  };

  // Confirm student selection
  const handleConfirmSelection = () => {
    if (!pendingStudent) return;
    
    setSelectedStudent(pendingStudent);
    
    // Pre-fill form with student data
    form.reset({
      student_number: '', // Certificate number should be new
      full_name_ar: pendingStudent.full_name_ar,
      full_name_fr: pendingStudent.full_name_fr || '',
      gender: pendingStudent.gender as 'male' | 'female',
      date_of_birth: pendingStudent.date_of_birth,
      birthplace_ar: pendingStudent.birthplace_ar,
      birthplace_fr: pendingStudent.birthplace_fr || '',
      university_ar: pendingStudent.university_ar || 'جامعة أم البواقي',
      university_fr: pendingStudent.university_fr || "Université D'oum El Bouaghi",
      faculty_ar: pendingStudent.faculty_ar,
      branch_ar: pendingStudent.branch_ar,
      branch_fr: pendingStudent.branch_fr || '',
      specialty_ar: pendingStudent.specialty_ar,
      specialty_fr: pendingStudent.specialty_fr || '',
      first_registration_year: pendingStudent.first_registration_year || '',
      professional_email: pendingStudent.professional_email || '',
      phone_number: pendingStudent.phone_number || '',
      supervisor_ar: pendingStudent.supervisor_ar,
      research_lab_ar: pendingStudent.research_lab_ar || '',
      thesis_title_ar: pendingStudent.thesis_title_ar || '',
      field_ar: (pendingStudent as PhdLmdStudent).field_ar || '',
      field_fr: (pendingStudent as PhdLmdStudent).field_fr || '',
      mention: 'honorable' as MentionType,
      defense_date: '',
      certificate_date: new Date().toISOString().split('T')[0],
      jury_president_ar: '',
      jury_members_ar: '',
      province: 'أم البواقي',
      signature_title: getDefaultSignatureTitle(pendingStudent.faculty_ar || ''),
      scientific_council_date: '',
    });
    
    setShowForm(true);
    setShowConfirmDialog(false);
    setPendingStudent(null);
  };

  const isLoading = createPhdLmd.isPending || createPhdScience.isPending;

  const onSubmit = async (data: z.infer<typeof certificateSchema>) => {
    try {
      // Prepare certificate data with required French fields (empty if not provided)
      // Include PhD reference data from selected student
      const phdReferenceData = selectedStudent ? {
        registration_number: selectedStudent.registration_number || null,
        co_supervisor_ar: selectedStudent.co_supervisor_ar || null,
        supervisor_university: selectedStudent.supervisor_university || null,
        co_supervisor_university: selectedStudent.co_supervisor_university || null,
        employment_status: selectedStudent.employment_status || null,
        registration_type: selectedStudent.registration_type || null,
        inscription_status: selectedStudent.inscription_status || null,
        current_year: selectedStudent.current_year || null,
        registration_count: selectedStudent.registration_count || null,
        thesis_language: selectedStudent.thesis_language || null,
        notes: selectedStudent.notes || null,
      } : {};

      const certificateData = {
        ...data,
        ...phdReferenceData,
        faculty_fr: '',
        thesis_title_fr: '',
        jury_president_fr: '',
        jury_members_fr: '',
      };

      // Create certificate
      if (selectedType === 'phd_lmd') {
        await createPhdLmd.mutateAsync({
          ...certificateData,
          field_ar: data.field_ar || '',
          field_fr: data.field_fr || '',
          research_lab_ar: data.research_lab_ar || '',
        } as any);
        
        if (selectedStudent) {
          await deletePhdLmd.mutateAsync(selectedStudent.id);
        }
      } else if (selectedType === 'phd_science') {
        await createPhdScience.mutateAsync({
          ...certificateData,
          field_ar: data.field_ar || '',
          field_fr: data.field_fr || '',
        } as any);
        
        if (selectedStudent) {
          await deletePhdScience.mutateAsync(selectedStudent.id);
        }
      }
      
      form.reset();
      setSelectedStudent(null);
      setShowForm(false);
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const showFieldField = selectedType === 'phd_lmd' || selectedType === 'phd_science';
  const isResearchLabRequired = selectedType === 'phd_lmd';

  // Filter to only show PhD types (not master)
  const phdCertificateTypes = Object.entries(certificateTypeLabels).filter(
    ([key]) => key === 'phd_lmd' || key === 'phd_science'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            طباعة شهادة جديدة
            <Badge variant="secondary">{certificateTypeLabels[selectedType]?.ar}</Badge>
          </DialogTitle>
          <DialogDescription>
            {!showForm 
              ? "ابحث عن طالب من قاعدة بيانات طلبة الدكتوراه لإنشاء شهادة جديدة" 
              : "أكمل البيانات المطلوبة لإصدار الشهادة"
            }
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            {/* Certificate Type Selection */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <label className="text-base font-semibold">نوع الشهادة *</label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as CertificateType)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {phdCertificateTypes.map(([key, labels]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {labels.ar}
                          <span className="text-muted-foreground text-sm">({labels.fr})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو رقم التسجيل أو التخصص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Students List */}
            <div className="border rounded-lg">
              <div className="p-2 bg-muted/30 border-b flex justify-between items-center">
                <span className="text-sm font-medium">
                  قائمة طلبة الدكتوراه ({selectedType === 'phd_lmd' ? 'ل م د' : 'علوم'})
                </span>
                <Badge variant="secondary">
                  {availableStudents.length} طالب
                </Badge>
              </div>
              <ScrollArea className="h-[350px]">
                {isLoadingStudents ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">جاري تحميل البيانات...</p>
                  </div>
                ) : availableStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <Search className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">لا يوجد طلاب في قاعدة البيانات</p>
                    <p className="text-sm mt-2">أضف طلاباً من صفحة قاعدة بيانات طلبة الدكتوراه أولاً</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => {
                        onOpenChange(false);
                        window.location.hash = '/phd-students';
                      }}
                    >
                      الذهاب إلى قاعدة بيانات طلبة الدكتوراه
                    </Button>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <Search className="h-12 w-12 mb-4 opacity-50" />
                    <p>لا توجد نتائج للبحث</p>
                    <p className="text-sm">جرب البحث باسم آخر أو رقم تسجيل</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                        <tr className="border-b">
                          <th className="text-right font-semibold p-2.5">الاسم بالعربية</th>
                          <th className="text-right font-semibold p-2.5">الاسم بالفرنسية</th>
                          <th className="text-right font-semibold p-2.5">رقم التسجيل</th>
                          <th className="text-right font-semibold p-2.5">التخصص</th>
                          <th className="text-right font-semibold p-2.5">الكلية</th>
                          <th className="text-right font-semibold p-2.5">المشرف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredStudents.map((student) => (
                          <tr
                            key={student.id}
                            className="hover:bg-primary/5 cursor-pointer transition-colors"
                            onClick={() => handleStudentClick(student)}
                          >
                            <td className="p-2.5 font-medium">{student.full_name_ar}</td>
                            <td className="p-2.5 text-muted-foreground">{student.full_name_fr || "-"}</td>
                            <td className="p-2.5">
                              <Badge variant="outline">{student.registration_number}</Badge>
                            </td>
                            <td className="p-2.5">{student.specialty_ar}</td>
                            <td className="p-2.5">{student.faculty_ar}</td>
                            <td className="p-2.5 text-muted-foreground">{student.supervisor_ar}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Selected Student Info */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-primary">{selectedStudent?.full_name_ar}</h4>
                    <p className="text-sm text-muted-foreground">{selectedStudent?.specialty_ar} - {selectedStudent?.faculty_ar}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setShowForm(false); setSelectedStudent(null); }}
                  >
                    تغيير الطالب
                  </Button>
                </div>
              </div>

              {/* Certificate Number */}
              <SectionHeader title="بيانات الشهادة (مطلوب ملئها)" />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="student_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الشهادة *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل رقم الشهادة" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="defense_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ المناقشة *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Mention */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mention"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التقدير *</FormLabel>
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="certificate_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ إصدار الشهادة</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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

              {/* Thesis Title - Single field with auto direction */}
              <SectionHeader title="عنوان الأطروحة" />
              <FormField
                control={form.control}
                name="thesis_title_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الأطروحة * (يمكن الكتابة بالعربية أو الفرنسية)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                        rows={3} 
                        placeholder="عنوان الأطروحة"
                        dir="auto"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Jury - Single fields with auto direction */}
              <SectionHeader title="لجنة المناقشة" />
              
              <FormField
                control={form.control}
                name="jury_president_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رئيس اللجنة *</FormLabel>
                    <FormControl>
                      <AcademicTitleInput
                        {...field}
                        suggestions={suggestions?.jury_president_ar || []}
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
                name="jury_members_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>أعضاء اللجنة *</FormLabel>
                    <FormControl>
                      <JuryMembersInput
                        value={field.value || ''}
                        onChange={field.onChange}
                        suggestions={suggestions?.jury_members_ar || []}
                        dir="auto"
                        placeholder="أضف أعضاء اللجنة"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Personal Info */}
              <SectionHeader title="المعلومات الشخصية / Informations personnelles" />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم بالعربية *</FormLabel>
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
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  name="first_registration_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سنة أول تسجيل *</FormLabel>
                      <FormControl>
                        <DropdownWithAdd
                          value={field.value || ''}
                          onChange={field.onChange}
                          optionType="academic_year"
                          placeholder="السنة الجامعية"
                          defaultOptions={academicYears}
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
                  name="birthplace_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مكان الميلاد *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مكان الميلاد بالعربية" />
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
              <SectionHeader title="معلومات الاتصال / Contact" />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="professional_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} type="email" dir="ltr" placeholder="example@university.dz" />
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
                        <Input {...field} value={field.value || ''} type="tel" dir="ltr" placeholder="0XX XXX XXXX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* University Info */}
              <SectionHeader title="المعلومات الجامعية / Informations universitaires" />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="university_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجامعة</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="اسم الجامعة بالعربية" />
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
                        <Input {...field} value={field.value || ''} dir="ltr" placeholder="Nom de l'université" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              {/* Field (PhD LMD only) */}
              {showFieldField && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="field_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الميدان *</FormLabel>
                        <FormControl>
                          <DropdownWithAdd
                            value={field.value || ''}
                            onChange={(v) => {
                              field.onChange(v);
                              const fr = getFrFromAr(v);
                              if (fr) form.setValue('field_fr', fr);
                            }}
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
                            onChange={(v) => {
                              field.onChange(v);
                              const ar = getArFromFr(v);
                              if (ar) form.setValue('field_ar', ar);
                            }}
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
              )}

              {/* Branch & Specialty */}
              <SectionHeader title="الشعبة والتخصص / Filière et Spécialité" />
              
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
                          placeholder="Filière"
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
                          placeholder="Spécialité"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Supervisor & Research Lab */}
              <SectionHeader title="المشرف ومخبر البحث / Directeur et Laboratoire" />
              
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
                        placeholder="اختر الرتبة ثم اكتب اسم المشرف"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              {/* PhD Student Reference Data - All pre-filled fields from database */}
              {selectedStudent && (
                <>
                  <SectionHeader title="بيانات إضافية من قاعدة بيانات طلبة الدكتوراه (للاطلاع)" />
                  
                  <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {selectedStudent.registration_number && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">رقم التسجيل:</span>
                          <span className="text-sm font-medium">{selectedStudent.registration_number}</span>
                        </div>
                      )}

                      {(selectedStudent as any).current_year && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">سنة التسجيل:</span>
                          <span className="text-sm font-medium">{(selectedStudent as any).current_year}</span>
                        </div>
                      )}

                      {(selectedStudent as any).registration_count && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">عدد التسجيلات:</span>
                          <span className="text-sm font-medium">{(selectedStudent as any).registration_count}</span>
                        </div>
                      )}

                      {(selectedStudent as any).co_supervisor_ar && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">مساعد المشرف:</span>
                          <span className="text-sm font-medium">{(selectedStudent as any).co_supervisor_ar}</span>
                        </div>
                      )}

                      {(selectedStudent as any).supervisor_university && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">جامعة انتماء المشرف:</span>
                          <span className="text-sm font-medium">{(selectedStudent as any).supervisor_university}</span>
                        </div>
                      )}

                      {(selectedStudent as any).co_supervisor_university && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">جامعة انتماء مساعد المشرف:</span>
                          <span className="text-sm font-medium">{(selectedStudent as any).co_supervisor_university}</span>
                        </div>
                      )}

                      {(selectedStudent as any).employment_status && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">الحالة الوظيفية:</span>
                          <span className="text-sm font-medium">{(selectedStudent as any).employment_status}</span>
                        </div>
                      )}

                      {(selectedStudent as any).registration_type && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">نوع التسجيل:</span>
                          <span className="text-sm font-medium">{(selectedStudent as any).registration_type}</span>
                        </div>
                      )}

                      {(selectedStudent as any).inscription_status && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">حالة التسجيل:</span>
                          <span className="text-sm font-medium">{(selectedStudent as any).inscription_status}</span>
                        </div>
                      )}

                      {(selectedStudent as any).thesis_language && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">لغة الأطروحة:</span>
                          <span className="text-sm font-medium">
                            {(selectedStudent as any).thesis_language === 'arabic' ? 'العربية' :
                             (selectedStudent as any).thesis_language === 'french' ? 'الفرنسية' :
                             (selectedStudent as any).thesis_language === 'english' ? 'الإنجليزية' :
                             (selectedStudent as any).thesis_language}
                          </span>
                        </div>
                      )}

                      {(selectedStudent as any).thesis_title_fr && (
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">عنوان الأطروحة (فرنسي):</span>
                          <span className="text-sm font-medium" dir="ltr">{(selectedStudent as any).thesis_title_fr}</span>
                        </div>
                      )}

                      {(selectedStudent as any).faculty_fr && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">الكلية (فرنسي):</span>
                          <span className="text-sm font-medium" dir="ltr">{(selectedStudent as any).faculty_fr}</span>
                        </div>
                      )}

                      {(selectedStudent as any).status && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[140px]">الحالة:</span>
                          <span className="text-sm font-medium">
                            {(selectedStudent as any).status === 'active' ? 'نشط' :
                             (selectedStudent as any).status === 'graduated' ? 'تخرج' :
                             (selectedStudent as any).status === 'suspended' ? 'معلق' :
                             (selectedStudent as any).status === 'withdrawn' ? 'منسحب' :
                             (selectedStudent as any).status}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedStudent.notes && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground">ملاحظات:</span>
                        <p className="text-sm font-medium mt-1 bg-destructive/10 text-destructive p-2 rounded-md border border-destructive/20">
                          {selectedStudent.notes}
                        </p>
                      </div>
                    )}
                  </div>
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
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setSelectedStudent(null); }}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  إنشاء الشهادة
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تأكيد اختيار الطالب
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              <div className="space-y-2">
                <p>هل أنت متأكد من اختيار الطالب:</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-semibold text-foreground">{pendingStudent?.full_name_ar}</p>
                  <p className="text-sm">{pendingStudent?.specialty_ar} - {pendingStudent?.faculty_ar}</p>
                </div>
                <p className="text-warning text-sm font-medium mt-2">
                  ⚠️ سيتم حذف الطالب من قاعدة بيانات طلبة الدكتوراه ونقله إلى قاعدة بيانات الطلبة المناقشين بعد إتمام إصدار الشهادة.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSelection}>
              نعم، اختيار الطالب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
