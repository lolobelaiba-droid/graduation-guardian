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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateTemplate,
  useBulkCreateTemplateFields,
} from "@/hooks/useCertificates";
import {
  certificateTypeLabels,
  languageLabels,
  certificateFields,
  type CertificateType,
  type TemplateLanguage,
} from "@/types/certificates";

const schema = z.object({
  template_name: z.string().min(1, "اسم القالب مطلوب"),
  certificate_type: z.enum(['phd_lmd', 'phd_science', 'master']),
  language: z.enum(['ar', 'fr', 'en', 'ar_fr', 'ar_en', 'fr_en', 'ar_fr_en']),
  page_orientation: z.enum(['portrait', 'landscape']),
});

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: CertificateType;
  defaultLanguage?: TemplateLanguage;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  defaultType = 'phd_lmd',
  defaultLanguage = 'ar',
}: CreateTemplateDialogProps) {
  const createTemplate = useCreateTemplate();
  const createFields = useBulkCreateTemplateFields();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      template_name: '',
      certificate_type: defaultType,
      language: defaultLanguage,
      page_orientation: 'portrait' as const,
    },
  });

  const isLoading = createTemplate.isPending || createFields.isPending;

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      // Create template
      const template = await createTemplate.mutateAsync({
        template_name: data.template_name,
        certificate_type: data.certificate_type as CertificateType,
        language: data.language as TemplateLanguage,
        page_orientation: data.page_orientation,
      });

      // Create default fields for this certificate type
      const fields = certificateFields[data.certificate_type as CertificateType];
      const fieldData = fields.map((field, index) => ({
        template_id: template.id,
        field_key: field.key,
        field_name_ar: field.name_ar,
        field_name_fr: field.name_fr,
        position_x: 105, // Center of A4
        position_y: 50 + (index * 15), // Spaced vertically
        font_size: 14,
        font_name: 'IBM Plex Sans Arabic',
        font_color: '#000000',
        text_align: 'center',
        is_rtl: data.language.includes('ar'),
        is_visible: true,
        field_order: index,
      }));

      await createFields.mutateAsync(fieldData);

      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إنشاء قالب جديد</DialogTitle>
          <DialogDescription>
            سيتم إنشاء الحقول تلقائياً بناءً على نوع الشهادة
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="template_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم القالب</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="مثال: شهادة الدكتوراه - عربي" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="certificate_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الشهادة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(certificateTypeLabels).map(([key, labels]) => (
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
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>لغة القالب</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(languageLabels).map(([key, labels]) => (
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
              name="page_orientation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اتجاه الصفحة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="portrait">عمودي (Portrait)</SelectItem>
                      <SelectItem value="landscape">أفقي (Landscape)</SelectItem>
                    </SelectContent>
                  </Select>
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
                إنشاء القالب
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
