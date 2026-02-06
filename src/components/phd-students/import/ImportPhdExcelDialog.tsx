import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload, ArrowLeft, ArrowRight, Check, X, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toWesternNumerals } from "@/lib/numerals";
import type { PhdStudentType } from "@/types/phd-students";
import { phdStudentTypeLabels, studentStatusLabels } from "@/types/phd-students";
import {
  ImportStep,
  ImportMode,
  ColumnMapping,
  ImportProgress,
  ImportResults,
  ExcelRow,
  MAX_FILE_SIZE,
  MAX_ROWS,
  getDbFieldKey,
  getPhdStudentFields,
  getPhdStudentTable,
} from "./types";

interface ImportPhdExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentType: PhdStudentType;
}

export function ImportPhdExcelDialog({
  open,
  onOpenChange,
  studentType,
}: ImportPhdExcelDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [uploadError, setUploadError] = useState<string>("");
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [ignoredRequiredFields, setIgnoredRequiredFields] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<ImportResults>({ success: 0, failed: 0, errors: [] });
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [existingCount, setExistingCount] = useState<number>(0);
  const queryClient = useQueryClient();

  const requiredFields = getPhdStudentFields(studentType);

  useEffect(() => {
    if (open) {
      fetchExistingCount();
    }
  }, [open, studentType]);

  const fetchExistingCount = async () => {
    const tableName = getPhdStudentTable(studentType);
    if (tableName === 'phd_lmd_students') {
      const { count } = await supabase.from('phd_lmd_students').select('*', { count: 'exact', head: true });
      setExistingCount(count || 0);
    } else {
      const { count } = await supabase.from('phd_science_students').select('*', { count: 'exact', head: true });
      setExistingCount(count || 0);
    }
  };

  const resetDialog = useCallback(() => {
    setStep("upload");
    setUploadError("");
    setExcelData([]);
    setExcelColumns([]);
    setColumnMapping({});
    setIgnoredRequiredFields([]);
    setImportProgress({ current: 0, total: 0 });
    setImportResults({ success: 0, failed: 0, errors: [] });
    setImportMode("append");
  }, []);

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadError("");

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const isValidType = validTypes.includes(file.type) || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls');

    if (!isValidType) {
      setUploadError("يرجى اختيار ملف Excel (.xlsx أو .xls)");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("حجم الملف يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      if (jsonData.length === 0) {
        setUploadError("الملف فارغ أو لا يحتوي على بيانات");
        return;
      }

      if (jsonData.length > MAX_ROWS) {
        setUploadError(`الحد الأقصى ${MAX_ROWS} سجل. الملف يحتوي على ${jsonData.length} سجل`);
        return;
      }

      const columns = Object.keys(jsonData[0]);
      setExcelColumns(columns);
      setExcelData(jsonData);

      // Auto-map columns
      const autoMapping: ColumnMapping = {};
      columns.forEach((col) => {
        const normalizedCol = col.toLowerCase().trim();
        const matchedField = requiredFields.find((f) => {
          const nameArMatch = f.name_ar.includes(col) || col.includes(f.name_ar);
          const nameFrMatch = f.name_fr.toLowerCase().includes(normalizedCol) || normalizedCol.includes(f.name_fr.toLowerCase());
          const keyMatch = f.key.includes(normalizedCol) || normalizedCol.includes(f.key);
          return nameArMatch || nameFrMatch || keyMatch;
        });
        if (matchedField) {
          const alreadyMapped = Object.values(autoMapping).includes(matchedField.key);
          if (!alreadyMapped) {
            autoMapping[col] = matchedField.key;
          }
        }
      });
      setColumnMapping(autoMapping);

      if (existingCount > 0) {
        setStep("mode");
      } else {
        setStep("mapping");
      }
      toast.success(`تم تحميل ${toWesternNumerals(jsonData.length)} سجل من الملف`);
    } catch (error) {
      console.error("Error reading Excel:", error);
      setUploadError("فشل في قراءة الملف. تأكد من صحة الملف");
    }
  };

  const handleMappingChange = (excelCol: string, fieldKey: string) => {
    setColumnMapping((prev) => {
      const newMapping = { ...prev };
      if (fieldKey === "_none") {
        delete newMapping[excelCol];
      } else {
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

  const transformRow = useCallback((row: ExcelRow): Record<string, unknown> => {
    const transformed: Record<string, unknown> = {};

    Object.entries(columnMapping).forEach(([excelCol, fieldKey]) => {
      let value = row[excelCol];
      const dbKey = getDbFieldKey(fieldKey);

      if (typeof value === "string") {
        value = value.trim().slice(0, 1000);
      }

      if (["date_of_birth"].includes(dbKey)) {
        if (typeof value === "number") {
          const date = XLSX.SSF.parse_date_code(value);
          if (date) {
            value = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
          }
        } else if (typeof value === "string") {
          const parsed = new Date(value);
          if (!isNaN(parsed.getTime())) {
            value = parsed.toISOString().split("T")[0];
          }
        }
      }

      if (dbKey === "gender") {
        const genderMap: Record<string, string> = {
          "ذكر": "male",
          "male": "male",
          "m": "male",
          "أنثى": "female",
          "female": "female",
          "f": "female",
        };
        const normalizedValue = String(value || "").toLowerCase().trim();
        value = genderMap[normalizedValue] || "male";
      }

      if (dbKey === "status") {
        const statusMap: Record<string, string> = {
          "نشط": "active",
          "active": "active",
          "متخرج": "graduated",
          "graduated": "graduated",
          "مؤجل": "suspended",
          "suspended": "suspended",
          "منسحب": "withdrawn",
          "withdrawn": "withdrawn",
        };
        const normalizedValue = String(value || "").toLowerCase().trim();
        value = statusMap[normalizedValue] || "active";
      }

      transformed[dbKey] = value;
    });

    return transformed;
  }, [columnMapping]);

  const transformedData = excelData.map(transformRow);

  const handleImport = async () => {
    setStep("importing");
    const tableName = getPhdStudentTable(studentType);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    if (importMode === "replace") {
      setImportProgress({ current: 0, total: excelData.length + 1 });
      try {
        if (tableName === 'phd_lmd_students') {
          await supabase.from('phd_lmd_students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } else {
          await supabase.from('phd_science_students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
        toast.success(`تم حذف ${toWesternNumerals(existingCount)} سجل سابق`);
      } catch (error) {
        errors.push("فشل في حذف البيانات السابقة");
      }
    } else {
      setImportProgress({ current: 0, total: excelData.length });
    }

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const transformedDataRow = transformRow(row);

      try {
        let error;
        if (tableName === 'phd_lmd_students') {
          const result = await supabase.from('phd_lmd_students').insert(transformedDataRow as never);
          error = result.error;
        } else {
          const result = await supabase.from('phd_science_students').insert(transformedDataRow as never);
          error = result.error;
        }

        if (error) {
          failedCount++;
          errors.push(`السجل ${toWesternNumerals(i + 1)}: ${error.message}`);
        } else {
          successCount++;
        }
      } catch {
        failedCount++;
        errors.push(`السجل ${toWesternNumerals(i + 1)}: خطأ غير متوقع`);
      }

      setImportProgress({ current: i + 1, total: excelData.length });
    }

    setImportResults({ success: successCount, failed: failedCount, errors });

    await supabase.from("activity_log").insert({
      activity_type: "student_added",
      description: importMode === "replace" 
        ? `تم استبدال قاعدة بيانات طلبة الدكتوراه بـ ${successCount} طالب من ملف Excel`
        : `تم استيراد ${successCount} طالب دكتوراه من ملف Excel`,
      entity_type: "phd_student",
    });

    queryClient.invalidateQueries({ queryKey: ["phd_lmd_students"] });
    queryClient.invalidateQueries({ queryKey: ["phd_science_students"] });

    setStep("complete");
  };

  const handleModeSelect = (mode: ImportMode) => {
    setImportMode(mode);
    setStep("mapping");
  };

  const mappedRequiredFields = requiredFields.filter(f => f.required);
  const unmappedRequired = mappedRequiredFields.filter(
    f => !Object.values(columnMapping).includes(f.key) && !ignoredRequiredFields.includes(f.key)
  );
  const canProceedToPreview = unmappedRequired.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            استيراد بيانات طلبة الدكتوراه من Excel
            <Badge variant="secondary">{phdStudentTypeLabels[studentType].ar}</Badge>
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "اختر ملف Excel يحتوي على بيانات طلبة الدكتوراه"}
            {step === "mode" && "اختر طريقة استيراد البيانات"}
            {step === "mapping" && "قم بربط أعمدة Excel مع حقول قاعدة البيانات"}
            {step === "preview" && "راجع البيانات وتأكد من صحتها قبل الاستيراد"}
            {step === "importing" && "جاري استيراد البيانات..."}
            {step === "complete" && "اكتمل الاستيراد"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {/* Upload Step */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">اختر ملف Excel</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  يجب أن يكون الملف بصيغة .xlsx أو .xls
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button asChild>
                  <span>
                    <Upload className="h-4 w-4 ml-2" />
                    اختيار الملف
                  </span>
                </Button>
              </label>
              {uploadError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* Mode Step */}
          {step === "mode" && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">يوجد {toWesternNumerals(existingCount)} طالب في قاعدة البيانات</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  كيف تريد التعامل مع البيانات الموجودة؟
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => handleModeSelect("append")}
                >
                  <span className="text-lg font-semibold">إضافة</span>
                  <span className="text-xs text-muted-foreground text-center">
                    إضافة {toWesternNumerals(excelData.length)} طالب جديد للبيانات الموجودة
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 border-destructive/50 hover:border-destructive"
                  onClick={() => handleModeSelect("replace")}
                >
                  <span className="text-lg font-semibold text-destructive">استبدال</span>
                  <span className="text-xs text-muted-foreground text-center">
                    حذف الطلاب الحاليين واستبدالهم بـ {toWesternNumerals(excelData.length)} طالب
                  </span>
                </Button>
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" onClick={resetDialog}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  رجوع
                </Button>
              </div>
            </div>
          )}

          {/* Mapping Step */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">عمود Excel</TableHead>
                      <TableHead className="text-right">عينة البيانات</TableHead>
                      <TableHead className="text-right">الحقل المقابل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelColumns.map((col) => (
                      <TableRow key={col}>
                        <TableCell className="font-medium">{col}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {String(excelData[0]?.[col] || '-')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={columnMapping[col] || "_none"}
                            onValueChange={(v) => handleMappingChange(col, v)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="تجاهل" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">تجاهل</SelectItem>
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
              </div>

              {unmappedRequired.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">حقول مطلوبة غير مربوطة:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {unmappedRequired.map((f) => (
                      <Badge
                        key={f.key}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => setIgnoredRequiredFields([...ignoredRequiredFields, f.key])}
                      >
                        {f.name_ar}
                        <X className="h-3 w-3 mr-1" />
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    اضغط على الحقل لتجاهله إن لم يكن متوفراً في الملف
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={existingCount > 0 ? () => setStep("mode") : resetDialog}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  رجوع
                </Button>
                <Button onClick={() => setStep("preview")} disabled={!canProceedToPreview}>
                  معاينة
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      {Object.values(columnMapping).map((fieldKey) => {
                        const field = requiredFields.find(f => f.key === fieldKey);
                        return (
                          <TableHead key={fieldKey} className="text-right">
                            {field?.name_ar || fieldKey}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transformedData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{toWesternNumerals(idx + 1)}</TableCell>
                        {Object.values(columnMapping).map((fieldKey) => (
                          <TableCell key={fieldKey} className="max-w-[150px] truncate">
                            {String(row[getDbFieldKey(fieldKey)] || '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {transformedData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  عرض أول {toWesternNumerals(10)} سجلات من أصل {toWesternNumerals(transformedData.length)}
                </p>
              )}
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep("mapping")}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  رجوع
                </Button>
                <Button onClick={handleImport}>
                  <Check className="h-4 w-4 ml-2" />
                  استيراد {toWesternNumerals(transformedData.length)} طالب
                </Button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">جاري الاستيراد...</h3>
                <p className="text-sm text-muted-foreground">
                  {toWesternNumerals(importProgress.current)} من {toWesternNumerals(importProgress.total)}
                </p>
              </div>
              <Progress value={(importProgress.current / importProgress.total) * 100} className="w-64" />
            </div>
          )}

          {/* Complete Step */}
          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                importResults.failed === 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
              }`}>
                {importResults.failed === 0 ? (
                  <Check className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertTriangle className="h-10 w-10 text-yellow-600" />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">تم الاستيراد</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  تم استيراد {toWesternNumerals(importResults.success)} طالب بنجاح
                  {importResults.failed > 0 && ` (${toWesternNumerals(importResults.failed)} فشل)`}
                </p>
              </div>
              {importResults.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-sm text-destructive">
                  {importResults.errors.slice(0, 5).map((err, idx) => (
                    <p key={idx}>{err}</p>
                  ))}
                </div>
              )}
              <Button onClick={handleClose}>إغلاق</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
