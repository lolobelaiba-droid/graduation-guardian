import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  type CertificateType,
  certificateFields,
  getCertificateTable,
} from "@/types/certificates";
import { useQueryClient } from "@tanstack/react-query";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateType: CertificateType;
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

interface ColumnMapping {
  [excelColumn: string]: string; // maps Excel column to field key
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 500;

export function ImportExcelDialog({
  open,
  onOpenChange,
  certificateType,
}: ImportExcelDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [excelData, setExcelData] = useState<Record<string, unknown>[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const requiredFields = certificateFields[certificateType];

  const resetDialog = () => {
    setStep("upload");
    setExcelData([]);
    setExcelColumns([]);
    setColumnMapping({});
    setImportProgress({ current: 0, total: 0 });
    setImportResults({ success: 0, failed: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      ".xlsx",
      ".xls",
    ];
    const isValidType = validTypes.some(
      (type) => file.type === type || file.name.endsWith(type)
    );

    if (!isValidType) {
      toast.error("يرجى اختيار ملف Excel (.xlsx أو .xls)");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("حجم الملف يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        toast.error("الملف فارغ");
        return;
      }

      if (jsonData.length > MAX_ROWS) {
        toast.error(`الحد الأقصى ${MAX_ROWS} سجل. الملف يحتوي على ${jsonData.length} سجل`);
        return;
      }

      // Get column names from first row
      const columns = Object.keys(jsonData[0]);
      setExcelColumns(columns);
      setExcelData(jsonData);

      // Auto-map columns based on similar names
      const autoMapping: ColumnMapping = {};
      columns.forEach((col) => {
        const normalizedCol = col.toLowerCase().trim();
        const matchedField = requiredFields.find(
          (f) =>
            f.name_ar.includes(col) ||
            f.name_fr.toLowerCase().includes(normalizedCol) ||
            f.key.includes(normalizedCol) ||
            col.includes(f.name_ar) ||
            normalizedCol.includes(f.key)
        );
        if (matchedField) {
          autoMapping[col] = matchedField.key;
        }
      });
      setColumnMapping(autoMapping);

      setStep("mapping");
      toast.success(`تم تحميل ${jsonData.length} سجل`);
    } catch (error) {
      console.error("Error reading Excel:", error);
      toast.error("فشل في قراءة الملف");
    }
  };

  const handleMappingChange = (excelCol: string, fieldKey: string) => {
    setColumnMapping((prev) => {
      const newMapping = { ...prev };
      if (fieldKey === "_none") {
        delete newMapping[excelCol];
      } else {
        // Remove previous mapping for this field
        Object.keys(newMapping).forEach((key) => {
          if (newMapping[key] === fieldKey) {
            delete newMapping[key];
          }
        });
        newMapping[excelCol] = fieldKey;
      }
      return newMapping;
    });
  };

  const getMappedFieldKey = (excelCol: string) => {
    return columnMapping[excelCol] || "_none";
  };

  const getUnmappedRequiredFields = () => {
    const mappedKeys = Object.values(columnMapping);
    return requiredFields.filter((f) => f.required && !mappedKeys.includes(f.key));
  };

  const handleProceedToPreview = () => {
    const unmapped = getUnmappedRequiredFields();
    if (unmapped.length > 0) {
      toast.error(`الحقول التالية مطلوبة: ${unmapped.map((f) => f.name_ar).join("، ")}`);
      return;
    }
    setStep("preview");
  };

  const transformRow = (row: Record<string, unknown>): Record<string, unknown> => {
    const transformed: Record<string, unknown> = {};

    Object.entries(columnMapping).forEach(([excelCol, fieldKey]) => {
      let value = row[excelCol];

      // Sanitize string values
      if (typeof value === "string") {
        value = value.trim().slice(0, 1000); // Limit string length
      }

      // Handle date fields
      if (
        ["date_of_birth", "defense_date", "certificate_date"].includes(fieldKey)
      ) {
        if (typeof value === "number") {
          // Excel serial date
          const date = XLSX.SSF.parse_date_code(value);
          if (date) {
            value = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
          }
        } else if (typeof value === "string") {
          // Try to parse date string
          const parsed = new Date(value);
          if (!isNaN(parsed.getTime())) {
            value = parsed.toISOString().split("T")[0];
          }
        }
      }

      // Handle mention field
      if (fieldKey === "mention") {
        const mentionMap: Record<string, string> = {
          "مشرف جدا": "very_honorable",
          "مشرف جداً": "very_honorable",
          "very honorable": "very_honorable",
          "très honorable": "very_honorable",
          "مشرف": "honorable",
          "honorable": "honorable",
        };
        const normalizedValue = String(value || "").toLowerCase().trim();
        value = mentionMap[normalizedValue] || "honorable";
      }

      transformed[fieldKey] = value;
    });

    return transformed;
  };

  const handleImport = async () => {
    setStep("importing");
    setImportProgress({ current: 0, total: excelData.length });

    const tableName = getCertificateTable(certificateType);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const transformedData = transformRow(row);

      try {
        let error;
        if (tableName === 'phd_lmd_certificates') {
          const result = await supabase.from('phd_lmd_certificates').insert(transformedData as never);
          error = result.error;
        } else if (tableName === 'phd_science_certificates') {
          const result = await supabase.from('phd_science_certificates').insert(transformedData as never);
          error = result.error;
        } else {
          const result = await supabase.from('master_certificates').insert(transformedData as never);
          error = result.error;
        }

        if (error) {
          console.error("Insert error:", error);
          failedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error("Import error:", error);
        failedCount++;
      }

      setImportProgress({ current: i + 1, total: excelData.length });
    }

    setImportResults({ success: successCount, failed: failedCount });

    // Log activity
    await supabase.from("activity_log").insert({
      activity_type: "student_added",
      description: `تم استيراد ${successCount} طالب من ملف Excel`,
      entity_type: "certificate",
    });

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["phd_lmd_certificates"] });
    queryClient.invalidateQueries({ queryKey: ["phd_science_certificates"] });
    queryClient.invalidateQueries({ queryKey: ["master_certificates"] });

    setStep("complete");
  };

  const previewData = excelData.slice(0, 5).map(transformRow);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            استيراد من Excel
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "اختر ملف Excel يحتوي على بيانات الطلاب"}
            {step === "mapping" && "قم بربط أعمدة Excel مع حقول الشهادة"}
            {step === "preview" && "مراجعة البيانات قبل الاستيراد"}
            {step === "importing" && "جاري استيراد البيانات..."}
            {step === "complete" && "اكتمل الاستيراد"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Upload Step */}
          {step === "upload" && (
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">اضغط لاختيار ملف Excel</p>
              <p className="text-sm text-muted-foreground">
                .xlsx أو .xls (حتى {MAX_ROWS} سجل، {MAX_FILE_SIZE / 1024 / 1024}MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Mapping Step */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{excelData.length} سجل</Badge>
                {getUnmappedRequiredFields().length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {getUnmappedRequiredFields().length} حقول مطلوبة غير مربوطة
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">عمود Excel</TableHead>
                      <TableHead className="w-1/2">حقل الشهادة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelColumns.map((col) => (
                      <TableRow key={col}>
                        <TableCell className="font-medium">{col}</TableCell>
                        <TableCell>
                          <Select
                            value={getMappedFieldKey(col)}
                            onValueChange={(v) => handleMappingChange(col, v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الحقل" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">-- تجاهل --</SelectItem>
                              {requiredFields.map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.name_ar}
                                  {field.required && " *"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetDialog}>
                  رجوع
                </Button>
                <Button onClick={handleProceedToPreview}>
                  معاينة البيانات
                </Button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                معاينة أول 5 سجلات من إجمالي {excelData.length}
              </p>

              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.values(columnMapping).map((fieldKey) => {
                        const field = requiredFields.find((f) => f.key === fieldKey);
                        return (
                          <TableHead key={fieldKey}>{field?.name_ar || fieldKey}</TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        {Object.values(columnMapping).map((fieldKey) => (
                          <TableCell key={fieldKey} className="max-w-[200px] truncate">
                            {String(row[fieldKey] || "-")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  رجوع
                </Button>
                <Button onClick={handleImport}>
                  استيراد {excelData.length} سجل
                </Button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium mb-2">جاري الاستيراد...</p>
              <p className="text-muted-foreground">
                {importProgress.current} من {importProgress.total}
              </p>
              <div className="w-full max-w-xs bg-muted rounded-full h-2 mt-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-16 w-16 text-success mb-4" />
              <p className="text-xl font-medium mb-4">اكتمل الاستيراد</p>
              <div className="flex gap-4 mb-6">
                <Badge variant="default" className="text-lg px-4 py-2">
                  {importResults.success} ناجح
                </Badge>
                {importResults.failed > 0 && (
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    {importResults.failed} فشل
                  </Badge>
                )}
              </div>
              <Button onClick={handleClose}>إغلاق</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
