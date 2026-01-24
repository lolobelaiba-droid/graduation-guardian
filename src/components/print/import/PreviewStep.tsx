import { Eye, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ColumnMapping, FieldDefinition, ExcelRow } from "./types";

interface PreviewStepProps {
  excelData: ExcelRow[];
  columnMapping: ColumnMapping;
  requiredFields: FieldDefinition[];
  transformedData: Record<string, unknown>[];
  onBack: () => void;
  onConfirm: () => void;
}

export function PreviewStep({
  excelData,
  columnMapping,
  requiredFields,
  transformedData,
  onBack,
  onConfirm,
}: PreviewStepProps) {
  const previewRows = transformedData.slice(0, 10);
  const mappedFieldKeys = Object.values(columnMapping);
  const mappedFields = requiredFields.filter(f => mappedFieldKeys.includes(f.key));

  // Check for potential issues
  const warnings: string[] = [];
  
  // Check for empty required fields
  const requiredFieldKeys = requiredFields.filter(f => f.required).map(f => f.key);
  transformedData.forEach((row, idx) => {
    requiredFieldKeys.forEach(key => {
      if (!row[key] || String(row[key]).trim() === '') {
        if (warnings.length < 5) {
          const field = requiredFields.find(f => f.key === key);
          warnings.push(`السجل ${idx + 1}: الحقل "${field?.name_ar}" فارغ`);
        }
      }
    });
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{excelData.length}</p>
                <p className="text-sm text-muted-foreground">سجل جاهز للاستيراد</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{mappedFields.length}</p>
                <p className="text-sm text-muted-foreground">حقل سيتم استيراده</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <p className="font-medium mb-1">تحذيرات ({warnings.length > 5 ? "أكثر من 5" : warnings.length}):</p>
            <ul className="text-sm list-disc list-inside">
              {warnings.slice(0, 5).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {warnings.length > 5 && <li>... و{warnings.length - 5} تحذيرات أخرى</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Preview Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              معاينة أول {previewRows.length} سجلات
            </span>
            <Badge variant="outline">
              إجمالي: {excelData.length} سجل
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  {mappedFields.slice(0, 6).map((field) => (
                    <TableHead key={field.key} className="min-w-[120px]">
                      <div className="flex flex-col">
                        <span>{field.name_ar}</span>
                        <span className="text-xs text-muted-foreground font-normal">{field.name_fr}</span>
                      </div>
                    </TableHead>
                  ))}
                  {mappedFields.length > 6 && (
                    <TableHead className="text-center">
                      +{mappedFields.length - 6} حقول
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    {mappedFields.slice(0, 6).map((field) => (
                      <TableCell key={field.key} className="max-w-[150px] truncate">
                        {String(row[field.key] || "-")}
                      </TableCell>
                    ))}
                    {mappedFields.length > 6 && (
                      <TableCell className="text-center text-muted-foreground">...</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Confirmation Notice */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
        <p className="font-medium">هل أنت متأكد من استيراد هذه البيانات؟</p>
        <p className="text-sm text-muted-foreground mt-1">
          سيتم إضافة {excelData.length} طالب إلى قاعدة البيانات
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          رجوع للتعديل
        </Button>
        <Button onClick={onConfirm} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          تأكيد الاستيراد
        </Button>
      </div>
    </div>
  );
}
