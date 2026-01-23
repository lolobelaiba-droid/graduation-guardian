import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  useCreatePhdLmdCertificate,
  useCreatePhdScienceCertificate,
  useCreateMasterCertificate,
} from "@/hooks/useCertificates";
import {
  certificateTypeLabels,
  mentionLabels,
  type CertificateType,
  type MentionType,
} from "@/types/certificates";

const baseSchema = z.object({
  student_number: z.string().min(1, "الرقم مطلوب"),
  full_name_ar: z.string().min(1, "الاسم بالعربية مطلوب"),
  full_name_fr: z.string().optional().nullable(),
  date_of_birth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  birthplace_ar: z.string().min(1, "مكان الميلاد مطلوب"),
  birthplace_fr: z.string().optional().nullable(),
  branch_ar: z.string().min(1, "الشعبة مطلوبة"),
  branch_fr: z.string().optional().nullable(),
  specialty_ar: z.string().min(1, "التخصص مطلوب"),
  specialty_fr: z.string().optional().nullable(),
  mention: z.enum(['honorable', 'very_honorable']),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().optional(),
});

const phdSchema = baseSchema.extend({
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  thesis_title_fr: z.string().optional().nullable(),
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional().nullable(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional().nullable(),
});

const phdLmdSchema = phdSchema.extend({
  field_ar: z.string().min(1, "الميدان مطلوب"),
  field_fr: z.string().optional().nullable(),
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

export function AddStudentDialog({ open, onOpenChange, certificateType }: AddStudentDialogProps) {
  const createPhdLmd = useCreatePhdLmdCertificate();
  const createPhdScience = useCreatePhdScienceCertificate();
  const createMaster = useCreateMasterCertificate();

  const getSchema = () => {
    switch (certificateType) {
      case 'phd_lmd': return phdLmdSchema;
      case 'phd_science': return phdSchema;
      case 'master': return baseSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      student_number: '',
      full_name_ar: '',
      full_name_fr: '',
      date_of_birth: '',
      birthplace_ar: '',
      birthplace_fr: '',
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
    },
  });

  const isLoading = createPhdLmd.isPending || createPhdScience.isPending || createMaster.isPending;

  const onSubmit = async (data: z.infer<typeof phdLmdSchema>) => {
    try {
      switch (certificateType) {
        case 'phd_lmd':
          await createPhdLmd.mutateAsync(data as Parameters<typeof createPhdLmd.mutateAsync>[0]);
          break;
        case 'phd_science':
          await createPhdScience.mutateAsync(data as Parameters<typeof createPhdScience.mutateAsync>[0]);
          break;
        case 'master':
          await createMaster.mutateAsync(data as Parameters<typeof createMaster.mutateAsync>[0]);
          break;
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const showThesisFields = certificateType === 'phd_lmd' || certificateType === 'phd_science';
  const showFieldField = certificateType === 'phd_lmd';
  const showJuryFields = certificateType === 'phd_lmd' || certificateType === 'phd_science';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            إضافة طالب جديد - {certificateTypeLabels[certificateType].ar}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info */}
            <SectionHeader title="المعلومات الأساسية" />
            
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="student_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="رقم الطالب" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
            
            <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel>lieu de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" placeholder="Lieu de naissance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                          <Input {...field} placeholder="الميدان" />
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
                          <Input {...field} value={field.value || ''} dir="ltr" placeholder="Domaine" />
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
                      <Input {...field} placeholder="الشعبة" />
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
                      <Input {...field} value={field.value || ''} dir="ltr" placeholder="Filière" />
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
                      <Input {...field} placeholder="التخصص" />
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
                      <Input {...field} value={field.value || ''} dir="ltr" placeholder="Spécialité" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                            className="text-right"
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
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
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
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="jury_president_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رئيس اللجنة *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="اسم رئيس اللجنة (يمكن الكتابة بالعربية أو الفرنسية)"
                            dir="auto"
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
                          <Textarea 
                            {...field} 
                            rows={3} 
                            placeholder="اسم العضو 1، اسم العضو 2، ... (يمكن الكتابة بالعربية أو الفرنسية)"
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
