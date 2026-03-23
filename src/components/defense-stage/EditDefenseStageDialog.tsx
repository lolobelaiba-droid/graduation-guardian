import { useState, useEffect, useCallback } from "react";
import { useNetworkReadOnly } from "@/contexts/NetworkReadOnlyContext";
import { useFieldDomainSync } from "@/hooks/useFieldDomainSync";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { JuryTableInput, SupervisorTableInput } from "@/components/ui/jury-table-input";
import { useUniversityOptions } from "@/hooks/useUniversityOptions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BilingualDropdown } from "@/components/ui/bilingual-dropdown";
import { DateInput } from "@/components/ui/date-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownWithAdd } from "@/components/print/DropdownWithAdd";
import {
  useUpdateDefenseStageLmd,
  useUpdateDefenseStageScience,
} from "@/hooks/useDefenseStage";
import { useDropdownOptions, useAddDropdownOption, useDeleteDropdownOption, useUpdateDropdownOption } from "@/hooks/useDropdownOptions";
import type { OptionType } from "@/hooks/useDropdownOptions";
import { useMultipleFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { useProfessors } from "@/hooks/useProfessors";
import { useBilingualDropdownOptions } from "@/hooks/useBilingualDropdownOptions";
import type { DefenseStageStudent, DefenseStageType } from "@/types/defense-stage";
import { stageStatusLabels } from "@/types/defense-stage";
import { getDefaultSignatureTitle } from "@/types/certificates";
import { useRecordLock } from "@/hooks/useRecordLock";
import { RecordLockBanner } from "@/components/ui/record-lock-banner";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      <Separator className="flex-1" />
      <span className="text-sm font-semibold text-primary whitespace-nowrap">{title}</span>
      <Separator className="flex-1" />
    </div>
  );
}

// Decree Dropdown with add/edit/delete management
function DecreeDropdownField({ form, name, label, optionType, options, addOption, deleteOption, updateOption }: {
  form: any;
  name: string;
  label: string;
  optionType: OptionType;
  options: { id: string; option_value: string }[];
  addOption: any;
  deleteOption: any;
  updateOption: any;
}) {
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [manageOpen, setManageOpen] = useState(false);

  const handleAdd = () => {
    if (!newValue.trim()) return;
    addOption.mutate({ optionType, optionValue: newValue.trim() });
    setNewValue('');
  };

  const handleDelete = (id: string) => {
    deleteOption.mutate({ id, optionType });
  };

  const handleUpdate = (id: string) => {
    if (!editValue.trim()) return;
    updateOption.mutate({ id, optionType, optionValue: editValue.trim() });
    setEditingId(null);
    setEditValue('');
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>{label}</FormLabel>
            <Popover open={manageOpen} onOpenChange={setManageOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <Pencil className="h-3 w-3" />
                  إدارة القرارات
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-3" align="start">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">إدارة قائمة القرارات</h4>
                  <div className="flex gap-2">
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="أضف قراراً جديداً..."
                      className="text-sm"
                    />
                    <Button type="button" size="sm" onClick={handleAdd} disabled={!newValue.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                      {options.map((opt) => (
                        <div key={opt.id} className="flex items-start gap-2 p-2 rounded border bg-muted/30">
                          {editingId === opt.id ? (
                            <>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="text-xs flex-1"
                                autoFocus
                              />
                              <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => handleUpdate(opt.id)}>حفظ</Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setEditingId(null)}>إلغاء</Button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs flex-1 leading-relaxed">{opt.option_value}</span>
                              <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingId(opt.id); setEditValue(opt.option_value); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(opt.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                      {options.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">لا توجد قرارات مسجلة</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <FormControl>
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر القرار..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.id} value={opt.option_value}>
                    <span className="text-xs leading-relaxed">{opt.option_value}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const editSchema = z.object({
  // PhD base fields
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  date_of_birth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  birthplace_ar: z.string().min(1, "مكان الميلاد مطلوب"),
  birthplace_fr: z.string().optional().nullable(),
  registration_number: z.string().optional(),
  university_ar: z.string().optional().nullable(),
  university_fr: z.string().optional().nullable(),
  faculty_ar: z.string().min(1, "الكلية مطلوبة"),
  faculty_fr: z.string().optional().nullable(),
  field_ar: z.string().optional().nullable(),
  field_fr: z.string().optional().nullable(),
  branch_ar: z.string().min(1, "الشعبة مطلوبة"),
  branch_fr: z.string().optional().nullable(),
  specialty_ar: z.string().min(1, "التخصص مطلوب"),
  specialty_fr: z.string().optional().nullable(),
  first_registration_year: z.string().optional().nullable(),
  professional_email: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  supervisor_ar: z.string().min(1, "اسم المشرف مطلوب"),
  co_supervisor_ar: z.string().optional().nullable(),
  supervisor_university: z.string().optional().nullable(),
  co_supervisor_university: z.string().optional().nullable(),
  thesis_title_ar: z.string().optional().nullable(),
  thesis_title_fr: z.string().optional().nullable(),
  thesis_language: z.string().optional().nullable(),
  research_lab_ar: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  registration_type: z.string().optional().nullable(),
  inscription_status: z.string().optional().nullable(),
  current_year: z.string().optional().nullable(),
  registration_count: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Defense stage fields
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
  scientific_council_date: z.string().min(1, "تاريخ المجلس العلمي مطلوب"),
  stage_status: z.enum(['pending', 'under_review', 'authorized', 'defended']),
  defense_date: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  signature_title: z.string().optional().nullable(),
  decree_training: z.string().optional().nullable(),
  decree_accreditation: z.string().optional().nullable(),
  decision_number: z.string().optional().nullable(),
  decision_date: z.string().optional().nullable(),
  auth_decision_number: z.string().optional().nullable(),
  auth_decision_date: z.string().optional().nullable(),
  dean_letter_number: z.string().optional().nullable(),
  dean_letter_date: z.string().optional().nullable(),
});

interface EditDefenseStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: DefenseStageStudent | null;
  studentType: DefenseStageType;
}

export function EditDefenseStageDialog({ open, onOpenChange, student, studentType }: EditDefenseStageDialogProps) {
  const updateLmd = useUpdateDefenseStageLmd();
  const updateScience = useUpdateDefenseStageScience();

  // Record locking
  const tableName = studentType === 'phd_lmd' ? 'defense_stage_lmd' : 'defense_stage_science';
  const { isLocked, lockedBy, acquireLock, releaseLock } = useRecordLock(tableName, open ? student?.id ?? null : null);

  useEffect(() => {
    if (open && student?.id) acquireLock();
    if (!open) releaseLock();
  }, [open, student?.id]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) releaseLock();
    onOpenChange(newOpen);
  }, [onOpenChange, releaseLock]);

  const { getFrFromAr, getArFromFr } = useFieldDomainSync();
  const { professorNames, ensureProfessor, findProfessor } = useProfessors();
  const { universityNames } = useUniversityOptions();

  const { data: suggestions } = useMultipleFieldSuggestions([
    'branch_ar', 'branch_fr', 'specialty_ar', 'specialty_fr',
  ]);

  const { data: employmentOptions = [] } = useBilingualDropdownOptions("employment_status");
  const { data: registrationOptions = [] } = useBilingualDropdownOptions("registration_type");
  const { data: inscriptionOptions = [] } = useBilingualDropdownOptions("inscription_status");

  const { data: decreeTrainingOptions = [] } = useDropdownOptions('decree_training');
  const { data: decreeAccreditationOptions = [] } = useDropdownOptions('decree_accreditation');
  const addDropdownOption = useAddDropdownOption();
  const deleteDropdownOption = useDeleteDropdownOption();
  const updateDropdownOption = useUpdateDropdownOption();

  // Bilingual dropdown states
  const [employmentStatusAr, setEmploymentStatusAr] = useState("");
  const [employmentStatusFr, setEmploymentStatusFr] = useState("");
  const [registrationTypeAr, setRegistrationTypeAr] = useState("");
  const [registrationTypeFr, setRegistrationTypeFr] = useState("");
  const [inscriptionStatusAr, setInscriptionStatusAr] = useState("");
  const [inscriptionStatusFr, setInscriptionStatusFr] = useState("");

  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {} as any,
  });

  // Reset form when student changes
  useEffect(() => {
    if (student && open) {
      form.reset({
        full_name_ar: student.full_name_ar,
        full_name_fr: student.full_name_fr || '',
        gender: student.gender || 'male',
        date_of_birth: student.date_of_birth,
        birthplace_ar: student.birthplace_ar,
        birthplace_fr: student.birthplace_fr || '',
        registration_number: student.registration_number || '',
        university_ar: student.university_ar || '',
        university_fr: student.university_fr || '',
        faculty_ar: student.faculty_ar,
        faculty_fr: student.faculty_fr || '',
        field_ar: student.field_ar || '',
        field_fr: student.field_fr || '',
        branch_ar: student.branch_ar,
        branch_fr: student.branch_fr || '',
        specialty_ar: student.specialty_ar,
        specialty_fr: student.specialty_fr || '',
        first_registration_year: student.first_registration_year || '',
        professional_email: student.professional_email || '',
        phone_number: student.phone_number || '',
        supervisor_ar: student.supervisor_ar,
        co_supervisor_ar: student.co_supervisor_ar || '',
        supervisor_university: student.supervisor_university || '',
        co_supervisor_university: student.co_supervisor_university || '',
        thesis_title_ar: student.thesis_title_ar || '',
        thesis_title_fr: student.thesis_title_fr || '',
        thesis_language: student.thesis_language || 'arabic',
        research_lab_ar: student.research_lab_ar || '',
        employment_status: student.employment_status || '',
        registration_type: student.registration_type || '',
        inscription_status: student.inscription_status || '',
        current_year: student.current_year || '',
        registration_count: student.registration_count ?? null,
        notes: student.notes || '',
        // Defense fields
        jury_president_ar: student.jury_president_ar,
        jury_president_fr: student.jury_president_fr || '',
        jury_members_ar: student.jury_members_ar,
        jury_members_fr: student.jury_members_fr || '',
        scientific_council_date: student.scientific_council_date,
        stage_status: student.stage_status,
        defense_date: student.defense_date || '',
        province: student.province || 'أم البواقي',
        signature_title: student.signature_title || '',
        decree_training: student.decree_training || '',
        decree_accreditation: student.decree_accreditation || '',
        decision_number: student.decision_number || '',
        decision_date: student.decision_date || '',
        auth_decision_number: student.auth_decision_number || '',
        auth_decision_date: student.auth_decision_date || '',
        dean_letter_number: student.dean_letter_number || '',
        dean_letter_date: student.dean_letter_date || '',
      });

      // Set bilingual dropdown states
      setEmploymentStatusAr(student.employment_status || '');
      const empOpt = employmentOptions.find(opt => opt.value_ar === (student.employment_status || ''));
      setEmploymentStatusFr(empOpt?.value_fr || '');

      setRegistrationTypeAr(student.registration_type || '');
      const regOpt = registrationOptions.find(opt => opt.value_ar === (student.registration_type || ''));
      setRegistrationTypeFr(regOpt?.value_fr || '');

      setInscriptionStatusAr(student.inscription_status || '');
      const inscOpt = inscriptionOptions.find(opt => opt.value_ar === (student.inscription_status || ''));
      setInscriptionStatusFr(inscOpt?.value_fr || '');
    }
  }, [student, open, form, employmentOptions, registrationOptions, inscriptionOptions]);

  const isLoading = updateLmd.isPending || updateScience.isPending;

  const onSubmit = async (data: z.infer<typeof editSchema>) => {
    if (!student) return;

    if (data.supervisor_ar) ensureProfessor(data.supervisor_ar);
    if (data.co_supervisor_ar) ensureProfessor(data.co_supervisor_ar);
    if (data.jury_president_ar) ensureProfessor(data.jury_president_ar);
    if (data.jury_members_ar) {
      data.jury_members_ar.split(/\s+-\s+/).forEach(m => {
        const clean = m.replace(/\s*\(مدعو\)/g, '').trim();
        if (clean) ensureProfessor(clean);
      });
    }

    try {
      // Sanitize empty strings to null for date columns to avoid PostgreSQL "invalid input syntax for type date" errors
      const dateFields = ['date_of_birth', 'scientific_council_date', 'defense_date', 'decision_date', 'auth_decision_date', 'dean_letter_date'];
      const sanitized: Record<string, any> = { ...data };
      for (const key of dateFields) {
        if (sanitized[key] === '' || sanitized[key] === undefined) {
          sanitized[key] = null;
        }
      }
      // Also sanitize other optional string fields that might be empty
      for (const [key, val] of Object.entries(sanitized)) {
        if (val === '' && key !== 'full_name_ar' && key !== 'birthplace_ar' && key !== 'faculty_ar' && key !== 'branch_ar' && key !== 'specialty_ar' && key !== 'supervisor_ar' && key !== 'jury_president_ar' && key !== 'jury_members_ar' && key !== 'scientific_council_date' && key !== 'date_of_birth') {
          sanitized[key] = null;
        }
      }
      const submitData = {
        id: student.id,
        ...sanitized,
        employment_status: employmentStatusAr || null,
        registration_type: registrationTypeAr || null,
        inscription_status: inscriptionStatusAr || null,
      };

      if (studentType === 'phd_lmd') {
        await updateLmd.mutateAsync(submitData);
      } else {
        await updateScience.mutateAsync(submitData);
      }
      releaseLock();
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (!student) return null;

  const typeLabel = studentType === 'phd_lmd' ? 'دكتوراه ل م د' : 'دكتوراه علوم';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            تعديل بيانات الطالب
            <Badge variant="secondary">{typeLabel}</Badge>
          </DialogTitle>
          <DialogDescription>
            تعديل كافة بيانات الطالب في طور المناقشة
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* ========== PhD Base Data ========== */}
            <SectionHeader title="المعلومات الأساسية" />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="full_name_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم (عربي) *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="full_name_fr" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom et Prénom</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} dir="ltr" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>الجنس</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'male'}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الميلاد *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="birthplace_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>مكان الميلاد *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="birthplace_fr" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de naissance</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} dir="ltr" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="registration_number" render={({ field }) => (
              <FormItem>
                <FormLabel>رقم التسجيل</FormLabel>
                <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Contact */}
            <SectionHeader title="معلومات الاتصال" />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="professional_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} type="email" dir="ltr" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} type="tel" dir="ltr" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Faculty & University */}
            <SectionHeader title="الجامعة والكلية" />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="university_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>الجامعة (عربي)</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="university_fr" render={({ field }) => (
                <FormItem>
                  <FormLabel>Université</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} dir="ltr" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="faculty_ar" render={({ field }) => (
              <FormItem>
                <FormLabel>الكلية *</FormLabel>
                <FormControl>
                  <DropdownWithAdd value={field.value} onChange={field.onChange} optionType="faculty" placeholder="اختر الكلية" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Field */}
            <SectionHeader title="الميدان" />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="field_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>الميدان (عربي)</FormLabel>
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
              )} />
              <FormField control={form.control} name="field_fr" render={({ field }) => (
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
              )} />
            </div>

            {/* Research Lab */}
            <SectionHeader title="مخبر البحث" />
            <FormField control={form.control} name="research_lab_ar" render={({ field }) => (
              <FormItem>
                <FormLabel>مخبر البحث</FormLabel>
                <FormControl>
                  <DropdownWithAdd value={field.value || ''} onChange={field.onChange} optionType="research_lab" placeholder="مخبر البحث" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Branch & Specialty */}
            <SectionHeader title="الشعبة والتخصص" />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="branch_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>الشعبة *</FormLabel>
                  <FormControl><AutocompleteInput {...field} suggestions={suggestions?.branch_ar || []} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="branch_fr" render={({ field }) => (
                <FormItem>
                  <FormLabel>Filière</FormLabel>
                  <FormControl><AutocompleteInput {...field} value={field.value || ''} suggestions={suggestions?.branch_fr || []} dir="ltr" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="specialty_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>التخصص *</FormLabel>
                  <FormControl><AutocompleteInput {...field} suggestions={suggestions?.specialty_ar || []} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="specialty_fr" render={({ field }) => (
                <FormItem>
                  <FormLabel>Spécialité</FormLabel>
                  <FormControl><AutocompleteInput {...field} value={field.value || ''} suggestions={suggestions?.specialty_fr || []} dir="ltr" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Supervisor */}
            <SectionHeader title="المشرف ومساعد المشرف" />
            <FormField control={form.control} name="supervisor_ar" render={({ field: supField }) => (
              <FormField control={form.control} name="supervisor_university" render={({ field: supUniField }) => (
                <FormField control={form.control} name="co_supervisor_ar" render={({ field: coSupField }) => (
                  <FormField control={form.control} name="co_supervisor_university" render={({ field: coSupUniField }) => (
                    <FormItem>
                      <FormControl>
                        <SupervisorTableInput
                          supervisorValue={supField.value || ""}
                          supervisorUniversity={supUniField.value || ""}
                          coSupervisorValue={coSupField.value || ""}
                          coSupervisorUniversity={coSupUniField.value || ""}
                          onSupervisorChange={(name, university) => {
                            supField.onChange(name);
                            supUniField.onChange(university);
                          }}
                          onCoSupervisorChange={(name, university) => {
                            coSupField.onChange(name);
                            coSupUniField.onChange(university);
                          }}
                          nameSuggestions={professorNames}
                          universitySuggestions={universityNames}
                          findProfessor={findProfessor}
                          onProfessorDataChange={ensureProfessor}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )} />
              )} />
            )} />

            {/* Thesis */}
            <SectionHeader title="الأطروحة" />
            <FormField control={form.control} name="thesis_title_ar" render={({ field }) => (
              <FormItem>
                <FormLabel>عنوان الأطروحة</FormLabel>
                <FormControl>
                  <RichTextEditor value={field.value || ''} onChange={field.onChange} rows={2} dir="auto" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="thesis_title_fr" render={({ field }) => (
              <FormItem>
                <FormLabel>Titre de la thèse</FormLabel>
                <FormControl>
                  <RichTextEditor value={field.value || ''} onChange={field.onChange} rows={2} dir="ltr" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="thesis_language" render={({ field }) => (
              <FormItem>
                <FormLabel>لغة الأطروحة</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'arabic'}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="arabic">عربي</SelectItem>
                    <SelectItem value="french">فرنسي</SelectItem>
                    <SelectItem value="english">انجليزي</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Registration Info */}
            <SectionHeader title="التسجيل" />
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="first_registration_year" render={({ field }) => (
                <FormItem>
                  <FormLabel>سنة أول تسجيل</FormLabel>
                  <FormControl>
                    <DropdownWithAdd value={field.value || ''} onChange={field.onChange} optionType="academic_year" placeholder="اختر السنة" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="current_year" render={({ field }) => (
                <FormItem>
                  <FormLabel>سنة التسجيل</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="registration_count" render={({ field }) => (
                <FormItem>
                  <FormLabel>عدد التسجيلات</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? null : parseInt(v, 10));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Employment & Registration Type */}
            <SectionHeader title="الحالة الوظيفية ونوع التسجيل" />
            <BilingualDropdown
              valueAr={employmentStatusAr}
              valueFr={employmentStatusFr}
              onChangeAr={setEmploymentStatusAr}
              onChangeFr={setEmploymentStatusFr}
              optionType="employment_status"
              labelAr="الحالة الوظيفية"
              labelFr="Situation professionnelle"
              placeholderAr="اختر الحالة الوظيفية"
              placeholderFr="Choisir la situation"
            />
            <BilingualDropdown
              valueAr={registrationTypeAr}
              valueFr={registrationTypeFr}
              onChangeAr={setRegistrationTypeAr}
              onChangeFr={setRegistrationTypeFr}
              optionType="registration_type"
              labelAr="نوع التسجيل"
              labelFr="Type d'inscription"
              placeholderAr="اختر نوع التسجيل"
              placeholderFr="Choisir le type"
            />
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

            {/* ========== Defense Stage Data ========== */}
            <SectionHeader title="بيانات طور المناقشة" />

            <FormField control={form.control} name="scientific_council_date" render={({ field }) => (
              <FormItem>
                <FormLabel>تاريخ مصادقة المجلس العلمي *</FormLabel>
                <FormControl><DateInput value={field.value || ''} onChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="stage_status" render={({ field }) => (
              <FormItem>
                <FormLabel>حالة الطور</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(stageStatusLabels).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="defense_date" render={({ field }) => (
              <FormItem>
                <FormLabel>تاريخ المناقشة</FormLabel>
                <FormControl><DateInput value={field.value || ''} onChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Jury */}
            <SectionHeader title="لجنة المناقشة" />
            <JuryTableInput
              presidentValue={form.watch('jury_president_ar')}
              membersValue={form.watch('jury_members_ar')}
              onChange={(president, members) => {
                form.setValue('jury_president_ar', president);
                form.setValue('jury_members_ar', members);
              }}
              supervisorAr={form.watch('supervisor_ar') || ''}
              supervisorUniversity={form.watch('supervisor_university') || ''}
              coSupervisorAr={form.watch('co_supervisor_ar') || ''}
              coSupervisorUniversity={form.watch('co_supervisor_university') || ''}
              nameSuggestions={professorNames}
              universitySuggestions={universityNames}
              findProfessor={findProfessor}
              onProfessorDataChange={ensureProfessor}
            />

            {/* Decrees */}
            <SectionHeader title="القرارات الوزارية" />
            <DecreeDropdownField
              form={form}
              name="decree_training"
              label="قرار تنظيم التكوين"
              optionType="decree_training"
              options={decreeTrainingOptions}
              addOption={addDropdownOption}
              deleteOption={deleteDropdownOption}
              updateOption={updateDropdownOption}
            />
            <DecreeDropdownField
              form={form}
              name="decree_accreditation"
              label="قرار التأهيل"
              optionType="decree_accreditation"
              options={decreeAccreditationOptions}
              addOption={addDropdownOption}
              deleteOption={deleteDropdownOption}
              updateOption={updateDropdownOption}
            />

            {/* Decision Numbers */}
            <SectionHeader title="أرقام القرارات والمراسلات" />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="decision_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم مقرر تعيين اللجنة</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="decision_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ مقرر تعيين اللجنة</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="auth_decision_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم ترخيص المناقشة</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="auth_decision_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ ترخيص المناقشة</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="dean_letter_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم إرسال العميد</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dean_letter_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ إرسال العميد</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Province & Signature */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="province" render={({ field }) => (
                <FormItem>
                  <FormLabel>الولاية</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="signature_title" render={({ field }) => (
                <FormItem>
                  <FormLabel>الإمضاء</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} placeholder="صفة الموقع" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Notes */}
            <SectionHeader title="ملاحظات" />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>ملاحظات</FormLabel>
                <FormControl><Textarea {...field} value={field.value || ''} rows={2} dir="auto" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading || isLocked}>
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
