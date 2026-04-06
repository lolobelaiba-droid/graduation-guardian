import { useState, useEffect } from "react";
import { useNetworkReadOnly } from "@/contexts/NetworkReadOnlyContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search, Scale, Plus, Trash2, Pencil, ChevronUp, ChevronDown } from "lucide-react";
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
import { JuryTableInput, SupervisorTableInput } from "@/components/ui/jury-table-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  usePhdLmdStudents,
  usePhdScienceStudents,
  useDeletePhdLmdStudent,
  useDeletePhdScienceStudent,
} from "@/hooks/usePhdStudents";
import {
  useCreateDefenseStageLmd,
  useCreateDefenseStageScience,
} from "@/hooks/useDefenseStage";
import { useProfessors } from "@/hooks/useProfessors";
import { useUniversityOptions } from "@/hooks/useUniversityOptions";
import { useDropdownOptions, useAddDropdownOption, useDeleteDropdownOption, useUpdateDropdownOption, useReorderDropdownOptions } from "@/hooks/useDropdownOptions";
import type { OptionType } from "@/hooks/useDropdownOptions";
import type { PhdStudent, PhdLmdStudent } from "@/types/phd-students";
import type { DefenseStageType } from "@/types/defense-stage";
import { getDefaultSignatureTitle } from "@/types/certificates";

const defenseStageSchema = z.object({
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
  scientific_council_date: z.string().min(1, "تاريخ مصادقة المجلس العلمي مطلوب"),
  province: z.string().optional().nullable(),
  signature_title: z.string().optional().nullable(),
  decree_training: z.string().min(1, "قرار تنظيم التكوين مطلوب"),
  decree_accreditation: z.string().min(1, "قرار التأهيل مطلوب"),
});

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
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

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

  const toggleSort = () => {
    setSortOrder(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none');
  };

  const sortedOptions = sortOrder === 'none' ? options : [...options].sort((a, b) => {
    const cmp = a.option_value.localeCompare(b.option_value, 'ar');
    return sortOrder === 'asc' ? cmp : -cmp;
  });

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
              <PopoverContent className="w-[500px] p-3" align="start" side="bottom">
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
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">عدد القرارات: {options.length}</div>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={toggleSort}>
                      {sortOrder === 'none' && <ArrowUpDown className="h-3 w-3" />}
                      {sortOrder === 'asc' && <ArrowUp className="h-3 w-3" />}
                      {sortOrder === 'desc' && <ArrowDown className="h-3 w-3" />}
                      {sortOrder === 'none' ? 'ترتيب' : sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[350px]">
                    <div className="space-y-1.5">
                      {sortedOptions.map((opt, index) => (
                        <div key={opt.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                          {editingId === opt.id ? (
                            <>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="text-xs flex-1"
                                autoFocus
                              />
                              <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => handleUpdate(opt.id)}>حفظ</Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => setEditingId(null)}>إلغاء</Button>
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] text-muted-foreground shrink-0">{index + 1}.</span>
                              <span className="text-xs flex-1 leading-relaxed line-clamp-2" title={opt.option_value}>{opt.option_value}</span>
                              <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => { setEditingId(opt.id); setEditValue(opt.option_value); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive shrink-0" onClick={() => handleDelete(opt.id)}>
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

interface StartDefenseProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedStudent?: PhdStudent | null;
  preSelectedType?: DefenseStageType;
}

export function StartDefenseProcedureDialog({ open, onOpenChange, preSelectedStudent, preSelectedType }: StartDefenseProcedureDialogProps) {
  const [selectedType, setSelectedType] = useState<DefenseStageType>(preSelectedType || "phd_lmd");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<PhdStudent | null>(null);
  const [pendingStudent, setPendingStudent] = useState<PhdStudent | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const createStageLmd = useCreateDefenseStageLmd();
  const createStageScience = useCreateDefenseStageScience();
  const deletePhdLmd = useDeletePhdLmdStudent();
  const deletePhdScience = useDeletePhdScienceStudent();

  const { guardWrite } = useNetworkReadOnly();
  const { data: phdLmdStudents = [], isLoading: loadingLmd } = usePhdLmdStudents();
  const { data: phdScienceStudents = [], isLoading: loadingScience } = usePhdScienceStudents();
  const isLoadingStudents = loadingLmd || loadingScience;

  const { professorNames, ensureProfessor, findProfessor } = useProfessors();
  const { universityNames } = useUniversityOptions();

  const { data: decreeTrainingOptions = [] } = useDropdownOptions('decree_training');
  const { data: decreeAccreditationOptions = [] } = useDropdownOptions('decree_accreditation');
  const addDropdownOption = useAddDropdownOption();
  const deleteDropdownOption = useDeleteDropdownOption();
  const updateDropdownOption = useUpdateDropdownOption();

  useEffect(() => {
    if (!open) {
      setSelectedStudent(null);
      setPendingStudent(null);
      setShowForm(false);
      setSearchQuery("");
      setShowConfirmDialog(false);
    } else if (preSelectedStudent) {
      setSelectedType(preSelectedType || "phd_lmd");
      // Show confirmation dialog first instead of skipping directly to form
      setPendingStudent(preSelectedStudent);
      setShowConfirmDialog(true);
    }
  }, [open, preSelectedStudent, preSelectedType]);

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
    resolver: zodResolver(defenseStageSchema),
    defaultValues: {
      jury_president_ar: '',
      jury_president_fr: '',
      jury_members_ar: '',
      jury_members_fr: '',
      scientific_council_date: '',
      province: 'أم البواقي',
      signature_title: '',
      decree_training: '',
      decree_accreditation: '',
    },
  });

  const handleStudentClick = (student: PhdStudent) => {
    setPendingStudent(student);
    setShowConfirmDialog(true);
  };

  const handleConfirmSelection = () => {
    if (!pendingStudent) return;
    setSelectedStudent(pendingStudent);
    form.reset({
      jury_president_ar: '',
      jury_president_fr: '',
      jury_members_ar: '',
      jury_members_fr: '',
      scientific_council_date: '',
      province: 'أم البواقي',
      signature_title: getDefaultSignatureTitle(pendingStudent.faculty_ar || ''),
      decree_training: '',
      decree_accreditation: '',
    });
    setShowForm(true);
    setShowConfirmDialog(false);
    setPendingStudent(null);
  };

  const isLoading = createStageLmd.isPending || createStageScience.isPending;

  const onSubmit = async (data: z.infer<typeof defenseStageSchema>) => {
    if (!guardWrite("بدء إجراء المناقشة")) return;
    if (!selectedStudent) return;
    try {
      // Save professor names
      if (data.jury_president_ar) ensureProfessor(data.jury_president_ar);
      if (data.jury_members_ar) {
        data.jury_members_ar.split(/\s+-\s+/).forEach(m => {
          const clean = m.replace(/\s*\(مدعو\)/g, '').trim();
          if (clean) ensureProfessor(clean);
        });
      }

      const stageData = {
        registration_number: selectedStudent.registration_number,
        full_name_ar: selectedStudent.full_name_ar,
        full_name_fr: selectedStudent.full_name_fr,
        gender: selectedStudent.gender,
        date_of_birth: selectedStudent.date_of_birth,
        birthplace_ar: selectedStudent.birthplace_ar,
        birthplace_fr: selectedStudent.birthplace_fr,
        university_ar: selectedStudent.university_ar,
        university_fr: selectedStudent.university_fr,
        faculty_ar: selectedStudent.faculty_ar,
        faculty_fr: selectedStudent.faculty_fr,
        field_ar: (selectedStudent as PhdLmdStudent).field_ar || '',
        field_fr: (selectedStudent as PhdLmdStudent).field_fr || null,
        branch_ar: selectedStudent.branch_ar,
        branch_fr: selectedStudent.branch_fr,
        specialty_ar: selectedStudent.specialty_ar,
        specialty_fr: selectedStudent.specialty_fr,
        first_registration_year: selectedStudent.first_registration_year,
        professional_email: selectedStudent.professional_email,
        phone_number: selectedStudent.phone_number,
        supervisor_ar: selectedStudent.supervisor_ar,
        co_supervisor_ar: selectedStudent.co_supervisor_ar,
        supervisor_university: selectedStudent.supervisor_university,
        co_supervisor_university: selectedStudent.co_supervisor_university,
        thesis_title_ar: selectedStudent.thesis_title_ar,
        thesis_title_fr: selectedStudent.thesis_title_fr,
        thesis_language: selectedStudent.thesis_language,
        research_lab_ar: selectedStudent.research_lab_ar,
        employment_status: selectedStudent.employment_status,
        registration_type: selectedStudent.registration_type,
        inscription_status: selectedStudent.inscription_status,
        current_year: selectedStudent.current_year,
        registration_count: selectedStudent.registration_count,
        notes: selectedStudent.notes,
        // Defense stage fields
        jury_president_ar: data.jury_president_ar,
        jury_president_fr: data.jury_president_fr || null,
        jury_members_ar: data.jury_members_ar,
        jury_members_fr: data.jury_members_fr || null,
        scientific_council_date: data.scientific_council_date,
        stage_status: 'pending' as const,
        defense_date: null,
        province: data.province || 'أم البواقي',
        signature_title: data.signature_title || null,
        decree_training: data.decree_training,
        decree_accreditation: data.decree_accreditation,
        decision_number: null,
        decision_date: null,
        auth_decision_number: null,
        auth_decision_date: null,
        dean_letter_number: null,
        dean_letter_date: null,
      };

      if (selectedType === 'phd_lmd') {
        await createStageLmd.mutateAsync(stageData);
        await deletePhdLmd.mutateAsync(selectedStudent.id);
      } else {
        await createStageScience.mutateAsync(stageData);
        await deletePhdScience.mutateAsync(selectedStudent.id);
      }

      form.reset();
      setSelectedStudent(null);
      setShowForm(false);
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const typeLabels = {
    phd_lmd: { ar: 'دكتوراه ل م د', fr: 'Doctorat LMD' },
    phd_science: { ar: 'دكتوراه علوم', fr: 'Doctorat Sciences' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            بدء إجراءات المناقشة
          </DialogTitle>
          <DialogDescription>
            {!showForm
              ? "اختر طالباً من قاعدة بيانات الدكتوراه لبدء إجراءات المناقشة"
              : "أدخل بيانات لجنة المناقشة وتاريخ مصادقة المجلس العلمي"
            }
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            {/* Type Selection */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <label className="text-base font-semibold">نوع الدكتوراه *</label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DefenseStageType)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([key, labels]) => (
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
                <Badge variant="secondary">{availableStudents.length} طالب</Badge>
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
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <Search className="h-12 w-12 mb-4 opacity-50" />
                    <p>لا توجد نتائج للبحث</p>
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
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent?.specialty_ar} - {selectedStudent?.faculty_ar}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      المشرف: {selectedStudent?.supervisor_ar}
                    </p>
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

              <SectionHeader title="تاريخ مصادقة المجلس العلمي" />

              <FormField
                control={form.control}
                name="scientific_council_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ مصادقة المجلس العلمي *</FormLabel>
                    <FormControl>
                      <DateInput value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SectionHeader title="لجنة المناقشة" />

              {/* Supervisor Table (read-only display) */}
              <SupervisorTableInput
                supervisorValue={selectedStudent?.supervisor_ar || ''}
                supervisorUniversity={selectedStudent?.supervisor_university || ''}
                coSupervisorValue={selectedStudent?.co_supervisor_ar || ''}
                coSupervisorUniversity={selectedStudent?.co_supervisor_university || ''}
                onSupervisorChange={() => {}}
                onCoSupervisorChange={() => {}}
                nameSuggestions={professorNames}
                universitySuggestions={universityNames}
              />

              {/* Jury Table */}
              <JuryTableInput
                presidentValue={form.watch('jury_president_ar')}
                membersValue={form.watch('jury_members_ar')}
                onChange={(president, members) => {
                  form.setValue('jury_president_ar', president, { shouldValidate: true });
                  form.setValue('jury_members_ar', members, { shouldValidate: true });
                }}
                supervisorAr={selectedStudent?.supervisor_ar || ''}
                supervisorUniversity={selectedStudent?.supervisor_university || ''}
                coSupervisorAr={selectedStudent?.co_supervisor_ar || ''}
                coSupervisorUniversity={selectedStudent?.co_supervisor_university || ''}
                nameSuggestions={professorNames}
                universitySuggestions={universityNames}
                findProfessor={findProfessor}
                onProfessorDataChange={(name, rankLabel, rankAbbreviation, university) => {
                  if (name) ensureProfessor(name, rankLabel || undefined, rankAbbreviation || undefined, university || undefined);
                }}
              />
              {form.formState.errors.jury_president_ar && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.jury_president_ar.message}</p>
              )}
              {form.formState.errors.jury_members_ar && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.jury_members_ar.message}</p>
              )}

              <SectionHeader title="القرارات الوزارية" />

              <DecreeDropdownField
                form={form}
                name="decree_training"
                label="قرار تنظيم التكوين *"
                optionType="decree_training"
                options={decreeTrainingOptions}
                addOption={addDropdownOption}
                deleteOption={deleteDropdownOption}
                updateOption={updateDropdownOption}
              />

              <DecreeDropdownField
                form={form}
                name="decree_accreditation"
                label="قرار التأهيل *"
                optionType="decree_accreditation"
                options={decreeAccreditationOptions}
                addOption={addDropdownOption}
                deleteOption={deleteDropdownOption}
                updateOption={updateDropdownOption}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الولاية</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="الولاية" />
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
                      <FormLabel>الإمضاء</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="صفة الموقع" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  بدء إجراءات المناقشة
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد اختيار الطالب</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم نقل الطالب <strong>{pendingStudent?.full_name_ar}</strong> من قاعدة بيانات الدكتوراه إلى طور المناقشة.
              <br />
              <span className="text-destructive font-medium">لن يظهر الطالب بعد ذلك في قاعدة بيانات طلبة الدكتوراه.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSelection}>
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
