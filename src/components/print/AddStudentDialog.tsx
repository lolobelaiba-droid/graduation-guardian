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
  full_name_fr: z.string().optional(),
  date_of_birth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  birthplace_ar: z.string().min(1, "مكان الميلاد مطلوب"),
  birthplace_fr: z.string().optional(),
  branch_ar: z.string().min(1, "الشعبة مطلوبة"),
  branch_fr: z.string().optional(),
  specialty_ar: z.string().min(1, "التخصص مطلوب"),
  specialty_fr: z.string().optional(),
  mention: z.enum(['excellent', 'very_good', 'good', 'fairly_good', 'passable']),
  defense_date: z.string().min(1, "تاريخ المناقشة مطلوب"),
  certificate_date: z.string().optional(),
});

const phdSchema = baseSchema.extend({
  thesis_title_ar: z.string().min(1, "عنوان الأطروحة مطلوب"),
  thesis_title_fr: z.string().optional(),
  jury_president_ar: z.string().min(1, "رئيس اللجنة مطلوب"),
  jury_president_fr: z.string().optional(),
  jury_members_ar: z.string().min(1, "أعضاء اللجنة مطلوبون"),
  jury_members_fr: z.string().optional(),
});

const phdLmdSchema = phdSchema.extend({
  field_ar: z.string().min(1, "الميدان مطلوب"),
  field_fr: z.string().optional(),
});

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateType: CertificateType;
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
      mention: 'good' as MentionType,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            إضافة طالب جديد - {certificateTypeLabels[certificateType].ar}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="student_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="رقم الطالب" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mention"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التقدير</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم بالعربية</FormLabel>
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
                      <Input {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الميلاد</FormLabel>
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
                    <FormLabel>مكان الميلاد</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <FormLabel>الميدان</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>الميدان بالفرنسية</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branch_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الشعبة</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>التخصص</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showThesisFields && (
              <FormField
                control={form.control}
                name="thesis_title_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الأطروحة</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ المناقشة</FormLabel>
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
                    <FormLabel>تاريخ الشهادة</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showJuryFields && (
              <>
                <FormField
                  control={form.control}
                  name="jury_president_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رئيس اللجنة</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>أعضاء اللجنة</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} placeholder="اسم العضو 1، اسم العضو 2، ..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
