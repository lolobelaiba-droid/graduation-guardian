import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { JuryMembersInput } from "@/components/ui/jury-members-input";
import { AcademicTitleInput } from "@/components/ui/academic-title-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/hooks/usePhdStudents";
import {
  certificateTypeLabels,
  mentionLabels,
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
  faculty_fr: z.string().optional().nullable(),
  branch_ar: z.string().min(1, "الشعبة مطلوبة"),
  branch_fr: z.string().optional().nullable(),
  specialty_ar: z.string().min(1, "التخصص مطلوب"),
  specialty_fr: z.string().optional().nullable(),
  first_registration_year: z.string().min(1, "سنة أول تسجيل مطلوبة"),
  professional_email: z.string().email("البريد الإلكتروني غير صالح").optional().nullable().or(z.literal('')),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
  research_lab_ar: z.string().optional().nullable(),
  
  // Fields to be filled for certificate
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  thesis_title_fr: z.string().optional().nullable(),
  mention: z.enum(['honorable', 'very_honorable']),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().optional(),
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
  
  // PhD LMD specific
  field_ar: z.string().optional().nullable(),
  field_fr: z.string().optional().nullable(),
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
  const [showForm, setShowForm] = useState(false);
  
  const createPhdLmd = useCreatePhdLmdCertificate();
  const createPhdScience = useCreatePhdScienceCertificate();
  
  const { data: phdLmdStudents = [] } = usePhdLmdStudents();
  const { data: phdScienceStudents = [] } = usePhdScienceStudents();
  
  const { data: suggestions } = useMultipleFieldSuggestions([
    'branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr', 
    'supervisor_ar', 'jury_president_ar', 'jury_members_ar'
  ]);

  useEffect(() => {
    setSelectedType(initialCertificateType);
    setSelectedStudent(null);
    setShowForm(false);
    setSearchQuery("");
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
    },
  });

  const handleSelectStudent = (student: PhdStudent) => {
    setSelectedStudent(student);
    
    // Pre-fill form with student data
    form.reset({
      student_number: '', // Certificate number should be new
      full_name_ar: student.full_name_ar,
      full_name_fr: student.full_name_fr || '',
      gender: student.gender as 'male' | 'female',
      date_of_birth: student.date_of_birth,
      birthplace_ar: student.birthplace_ar,
      birthplace_fr: student.birthplace_fr || '',
      university_ar: student.university_ar || 'جامعة أم البواقي',
      university_fr: student.university_fr || "Université D'oum El Bouaghi",
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
      research_lab_ar: student.research_lab_ar || '',
      thesis_title_ar: student.thesis_title_ar || '',
      thesis_title_fr: student.thesis_title_fr || '',
      field_ar: (student as PhdLmdStudent).field_ar || '',
      field_fr: (student as PhdLmdStudent).field_fr || '',
      mention: 'honorable' as MentionType,
      defense_date: '',
      certificate_date: new Date().toISOString().split('T')[0],
      jury_president_ar: '',
      jury_president_fr: '',
      jury_members_ar: '',
      jury_members_fr: '',
    });
    
    setShowForm(true);
  };

  const isLoading = createPhdLmd.isPending || createPhdScience.isPending;

  const onSubmit = async (data: z.infer<typeof certificateSchema>) => {
    try {
      if (selectedType === 'phd_lmd') {
        await createPhdLmd.mutateAsync({
          ...data,
          field_ar: data.field_ar || '',
          research_lab_ar: data.research_lab_ar || '',
        } as Parameters<typeof createPhdLmd.mutateAsync>[0]);
      } else if (selectedType === 'phd_science') {
        await createPhdScience.mutateAsync(data as Parameters<typeof createPhdScience.mutateAsync>[0]);
      }
      form.reset();
      setSelectedStudent(null);
      setShowForm(false);
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const showFieldField = selectedType === 'phd_lmd';
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
              <FormItem>
                <FormLabel className="text-base font-semibold">نوع الشهادة *</FormLabel>
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
              </FormItem>
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
            <ScrollArea className="h-[400px] border rounded-lg">
              {filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <Search className="h-12 w-12 mb-4 opacity-50" />
                  <p>لا يوجد طلاب في قاعدة البيانات</p>
                  <p className="text-sm">أضف طلاباً من صفحة قاعدة بيانات طلبة الدكتوراه أولاً</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSelectStudent(student)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{student.full_name_ar}</h4>
                          <p className="text-sm text-muted-foreground">{student.full_name_fr}</p>
                        </div>
                        <Badge variant="outline">{student.registration_number}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>{student.specialty_ar}</span>
                        <span>•</span>
                        <span>{student.faculty_ar}</span>
                        <span>•</span>
                        <span>{student.supervisor_ar}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
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
              </div>

              {/* Thesis Title */}
              <SectionHeader title="عنوان الأطروحة" />
              <div className="grid grid-cols-1 gap-4">
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
                          placeholder="عنوان الأطروحة"
                          dir="auto"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Jury */}
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

              {/* Pre-filled fields (editable) */}
              <SectionHeader title="البيانات المنقولة من قاعدة البيانات (قابلة للتعديل)" />
              
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
                      <FormLabel>الاسم بالفرنسية</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
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
                          placeholder="اسم المشرف"
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
              </div>

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
                </div>
              )}

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
    </Dialog>
  );
}
