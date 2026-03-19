import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload, ArrowLeft, ArrowRight, Check, X, AlertTriangle, Loader2, Download } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toWesternNumerals } from "@/lib/numerals";
import type { CertificateType } from "@/types/certificates";
import { certificateTypeLabels } from "@/types/certificates";
import {
  ImportStep, ImportMode, ColumnMapping, ImportProgress, ImportResults, ExcelRow,
  MAX_FILE_SIZE, MAX_ROWS, getDbFieldKey, getCertificateFields, getCertificateTable,
  COLUMN_ALIASES,
} from "./types";

interface ImportCertificateExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateType: CertificateType;
}

export function ImportCertificateExcelDialog({ open, onOpenChange, certificateType }: ImportCertificateExcelDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [uploadError, setUploadError] = useState("");
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [ignoredRequiredFields, setIgnoredRequiredFields] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<ImportResults>({ success: 0, failed: 0, errors: [] });
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [existingCount, setExistingCount] = useState(0);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const queryClient = useQueryClient();

  const requiredFields = getCertificateFields(certificateType);

  useEffect(() => {
    if (open) fetchExistingCount();
  }, [open, certificateType]);

  const fetchExistingCount = async () => {
    const tableName = getCertificateTable(certificateType);
    if (isElectron()) {
      const db = getDbClient();
      if (!db) return;
      const result = await db.getAll(tableName);
      setExistingCount(result.success ? (result.data?.length || 0) : 0);
      return;
    }
    const { count } = await supabase.from(tableName as any).select('*', { count: 'exact', head: true });
    setExistingCount(count || 0);
  };

  const resetDialog = useCallback(() => {
    setStep("upload"); setUploadError(""); setExcelData([]); setExcelColumns([]);
    setColumnMapping({}); setIgnoredRequiredFields([]);
    setImportProgress({ current: 0, total: 0 });
    setImportResults({ success: 0, failed: 0, errors: [] });
    setImportMode("append");
  }, []);

  const handleClose = () => { resetDialog(); onOpenChange(false); };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    const isValidType = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"].includes(file.type)
      || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!isValidType) { setUploadError("يرجى اختيار ملف Excel (.xlsx أو .xls)"); return; }
    if (file.size > MAX_FILE_SIZE) { setUploadError("حجم الملف يجب أن يكون أقل من 5 ميجابايت"); return; }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      if (jsonData.length === 0) { setUploadError("الملف فارغ أو لا يحتوي على بيانات"); return; }
      if (jsonData.length > MAX_ROWS) { setUploadError(`الحد الأقصى ${MAX_ROWS} سجل. الملف يحتوي على ${jsonData.length} سجل`); return; }

      const columns = Object.keys(jsonData[0]);
      setExcelColumns(columns);
      setExcelData(jsonData);

      // Auto-map
      const autoMapping: ColumnMapping = {};
      columns.forEach((col) => {
        const normalizedCol = col.toLowerCase().trim();
        const matched = requiredFields.find((f) => {
          return f.name_ar.includes(col) || col.includes(f.name_ar)
            || f.name_fr.toLowerCase().includes(normalizedCol) || normalizedCol.includes(f.name_fr.toLowerCase())
            || f.key.includes(normalizedCol) || normalizedCol.includes(f.key);
        });
        if (matched && !Object.values(autoMapping).includes(matched.key)) {
          autoMapping[col] = matched.key;
        }
      });
      setColumnMapping(autoMapping);
      setStep(existingCount > 0 ? "mode" : "mapping");
      toast.success(`تم تحميل ${toWesternNumerals(jsonData.length)} سجل من الملف`);
    } catch {
      setUploadError("فشل في قراءة الملف. تأكد من صحة الملف");
    }
  };

  const handleMappingChange = (excelCol: string, fieldKey: string) => {
    setColumnMapping((prev) => {
      const newMapping = { ...prev };
      if (fieldKey === "_none") { delete newMapping[excelCol]; }
      else {
        Object.keys(newMapping).forEach((key) => { if (newMapping[key] === fieldKey) delete newMapping[key]; });
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

      if (typeof value === "string") value = value.trim().slice(0, 1000);

      // Date fields
      if (["date_of_birth", "defense_date", "scientific_council_date", "certificate_date"].includes(dbKey)) {
        if (typeof value === "number") {
          const date = XLSX.SSF.parse_date_code(value);
          if (date) value = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
        } else if (typeof value === "string") {
          const parsed = new Date(value);
          if (!isNaN(parsed.getTime())) value = parsed.toISOString().split("T")[0];
        }
      }

      if (dbKey === "gender") {
        const genderMap: Record<string, string> = { "ذكر": "male", "male": "male", "m": "male", "أنثى": "female", "female": "female", "f": "female" };
        value = genderMap[String(value || "").toLowerCase().trim()] || "male";
      }

      if (dbKey === "mention") {
        const mentionMap: Record<string, string> = {
          "مشرف": "honorable", "مشرف جدا": "very_honorable", "مشرف جداً": "very_honorable",
          "honorable": "honorable", "very_honorable": "very_honorable",
          "très honorable": "very_honorable", "tres honorable": "very_honorable",
        };
        value = mentionMap[String(value || "").toLowerCase().trim()] || "honorable";
      }

      transformed[dbKey] = value;
    });

    // Default NOT NULL fields to empty string if not mapped
    const notNullDefaults: Record<string, string> = {
      'jury_president_ar': '',
      'jury_members_ar': '',
      'supervisor_ar': '',
      'thesis_title_ar': '',
    };
    for (const [key, defaultVal] of Object.entries(notNullDefaults)) {
      if (transformed[key] === undefined || transformed[key] === null) {
        transformed[key] = defaultVal;
      }
    }

    return transformed;
  }, [columnMapping]);

  const transformedData = excelData.map(transformRow);

  const handleDownloadTemplate = async () => {
    setIsGeneratingTemplate(true);
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('قالب');
      const fields = getCertificateFields(certificateType).filter(f => f.required);

      // Fetch dropdown options
      const dropdownFieldMap: Record<string, string> = { 'faculty_ar': 'faculty', 'field_ar': 'field_ar', 'supervisor_university': 'university', 'co_supervisor_university': 'university' };
      const staticOptions: Record<string, string[]> = { 'gender': ['ذكر', 'أنثى'], 'mention': ['مشرف', 'مشرف جدا'] };
      const dynamicOptions: Record<string, string[]> = {};
      const fetchedOptionTypes = new Set<string>();
      for (const [fieldKey, optionType] of Object.entries(dropdownFieldMap)) {
        if (!fetchedOptionTypes.has(optionType)) {
          fetchedOptionTypes.add(optionType);
          if (isElectron()) {
            const db = getDbClient();
            if (db) {
              const result = await db.getDropdownOptionsByType(optionType);
              if (result.success && result.data) {
                const values = result.data.map((o: any) => o.option_value);
                for (const [fk, ot] of Object.entries(dropdownFieldMap)) {
                  if (ot === optionType) dynamicOptions[fk] = values;
                }
              }
            }
          } else {
            const { data } = await supabase.from('dropdown_options').select('option_value').eq('option_type', optionType).order('display_order');
            if (data) {
              const values = data.map(o => o.option_value);
              for (const [fk, ot] of Object.entries(dropdownFieldMap)) {
                if (ot === optionType) dynamicOptions[fk] = values;
              }
            }
          }
        }
      }
      const allOptions = { ...staticOptions, ...dynamicOptions };

      // Add header row with styling
      const headerRow = ws.addRow(fields.map(f => f.name_ar));
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 12 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FF4472C4' } },
        };
      });
      fields.forEach((_, idx) => { ws.getColumn(idx + 1).width = 24; });

      // Put dropdown options in a hidden sheet and reference them
      const optionsSheet = workbook.addWorksheet('_options', { state: 'hidden' });
      let optColIdx = 1;
      const optRangeMap: Record<string, string> = {};

      for (const [key, opts] of Object.entries(allOptions)) {
        if (opts.length === 0) continue;
        // Write header
        optionsSheet.getCell(1, optColIdx).value = key;
        // Write values
        opts.forEach((val, ri) => {
          optionsSheet.getCell(ri + 2, optColIdx).value = val;
        });
        // Build range reference like _options!$A$2:$A$10
        const colLetter = String.fromCharCode(64 + optColIdx);
        optRangeMap[key] = `'_options'!$${colLetter}$2:$${colLetter}$${opts.length + 1}`;
        optColIdx++;
      }

      // Apply data validation for dropdown fields using sheet references
      fields.forEach((field, idx) => {
        const colIdx = idx + 1;
        const optKey = Object.keys(optRangeMap).find(k => field.key === k);
        if (optKey) {
          for (let row = 2; row <= 501; row++) {
            ws.getCell(row, colIdx).dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: [optRangeMap[optKey]],
            };
          }
        }
      });

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `قالب_استيراد_${certificateTypeLabels[certificateType].ar}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تحميل القالب بنجاح');
    } catch (e) {
      console.error('Template download error:', e);
      toast.error('حدث خطأ أثناء توليد القالب');
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const handleImport = async () => {
    setStep("importing");
    const tableName = getCertificateTable(certificateType);
    let successCount = 0, failedCount = 0;
    const errors: string[] = [];
    const useLocal = isElectron();
    const db = useLocal ? getDbClient() : null;

    if (importMode === "replace") {
      setImportProgress({ current: 0, total: excelData.length + 1 });
      try {
        if (useLocal && db) {
          await db.deleteAll(tableName);
        } else {
          await supabase.from(tableName as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
        toast.success(`تم حذف ${toWesternNumerals(existingCount)} سجل سابق`);
      } catch { errors.push("فشل في حذف البيانات السابقة"); }
    } else {
      setImportProgress({ current: 0, total: excelData.length });
    }

    const { checkDuplicateStudent } = await import("@/lib/duplicate-student-checker");

    for (let i = 0; i < excelData.length; i++) {
      const transformedDataRow = transformRow(excelData[i]);
      try {
        // التحقق من التكرار عبر الجداول الأخرى (طور المناقشة)
        if (importMode !== "replace" && transformedDataRow.full_name_ar && transformedDataRow.date_of_birth) {
          const dupCheck = await checkDuplicateStudent(
            transformedDataRow.full_name_ar as string,
            transformedDataRow.date_of_birth as string,
            'certificate'
          );
          if (dupCheck.isDuplicate) {
            failedCount++;
            errors.push(`السجل ${toWesternNumerals(i + 1)}: الطالب "${transformedDataRow.full_name_ar}" موجود في ${dupCheck.foundIn}`);
            setImportProgress({ current: i + 1, total: excelData.length });
            continue;
          }
        }

        if (useLocal && db) {
          const result = await db.insert(tableName, transformedDataRow);
          if (!result.success) { failedCount++; errors.push(`السجل ${toWesternNumerals(i + 1)}: ${result.error}`); }
          else successCount++;
        } else {
          const { error } = await supabase.from(tableName as any).insert(transformedDataRow as never);
          if (error) { failedCount++; errors.push(`السجل ${toWesternNumerals(i + 1)}: ${error.message}`); }
          else successCount++;
        }
      } catch { failedCount++; errors.push(`السجل ${toWesternNumerals(i + 1)}: خطأ غير متوقع`); }
      setImportProgress({ current: i + 1, total: excelData.length });
    }

    setImportResults({ success: successCount, failed: failedCount, errors });

    const activityDesc = importMode === "replace"
      ? `تم استبدال بيانات الطلبة المناقشين بـ ${successCount} سجل من ملف Excel`
      : `تم استيراد ${successCount} سجل مناقشة قديمة من ملف Excel`;

    if (useLocal && db) {
      await db.insert('activity_log', {
        activity_type: 'student_added',
        description: activityDesc,
        entity_type: certificateType,
      });
    } else {
      await supabase.from("activity_log").insert({
        activity_type: "student_added",
        description: activityDesc,
        entity_type: certificateType,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["phd_lmd_certificates"] });
    queryClient.invalidateQueries({ queryKey: ["phd_science_certificates"] });
    queryClient.invalidateQueries({ queryKey: ["master_certificates"] });
    queryClient.invalidateQueries({ queryKey: ["activity-log"] });
    setStep("complete");
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
            استيراد بيانات مناقشة قديمة من Excel
            <Badge variant="secondary">{certificateTypeLabels[certificateType].ar}</Badge>
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "اختر ملف Excel يحتوي على بيانات المناقشات القديمة"}
            {step === "mode" && "اختر طريقة استيراد البيانات"}
            {step === "mapping" && "قم بربط أعمدة Excel مع حقول قاعدة البيانات"}
            {step === "preview" && "راجع البيانات وتأكد من صحتها قبل الاستيراد"}
            {step === "importing" && "جاري استيراد البيانات..."}
            {step === "complete" && "اكتمل الاستيراد"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {/* Upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              {/* Download Template Section */}
              <div className="w-full bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">تحميل قالب الاستيراد</h4>
                  <p className="text-xs text-muted-foreground">
                    حمّل قالب Excel يحتوي على الأعمدة الإجبارية مع قوائم منسدلة جاهزة ({certificateTypeLabels[certificateType].ar})
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={isGeneratingTemplate}
                  className="gap-2 mr-4 shrink-0"
                >
                  {isGeneratingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isGeneratingTemplate ? 'جاري التحميل...' : 'تحميل القالب'}
                </Button>
              </div>

              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">اختر ملف Excel</h3>
                <p className="text-sm text-muted-foreground mt-1">يجب أن يكون الملف بصيغة .xlsx أو .xls</p>
                <p className="text-xs text-muted-foreground mt-1">هذا الاستيراد مخصص لإدراج بيانات مناقشات قديمة لم تمر عبر البرنامج</p>
              </div>
              <label className="cursor-pointer">
                <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                <Button asChild><span><Upload className="h-4 w-4 ml-2" />اختيار الملف</span></Button>
              </label>
              {uploadError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />{uploadError}
                </div>
              )}
            </div>
          )}

          {/* Mode */}
          {step === "mode" && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">يوجد {toWesternNumerals(existingCount)} سجل في قاعدة البيانات</h3>
                <p className="text-sm text-muted-foreground mt-1">كيف تريد التعامل مع البيانات الموجودة؟</p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => { setImportMode("append"); setStep("mapping"); }}>
                  <span className="text-lg font-semibold">إضافة</span>
                  <span className="text-xs text-muted-foreground text-center">إضافة {toWesternNumerals(excelData.length)} سجل جديد للبيانات الموجودة</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 border-destructive/50 hover:border-destructive" onClick={() => { setImportMode("replace"); setStep("mapping"); }}>
                  <span className="text-lg font-semibold text-destructive">استبدال</span>
                  <span className="text-xs text-muted-foreground text-center">حذف السجلات الحالية واستبدالها بـ {toWesternNumerals(excelData.length)} سجل</span>
                </Button>
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" onClick={resetDialog}><ArrowRight className="h-4 w-4 ml-2" />رجوع</Button>
              </div>
            </div>
          )}

          {/* Mapping */}
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
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{String(excelData[0]?.[col] || '-')}</TableCell>
                        <TableCell>
                          <Select value={columnMapping[col] || "_none"} onValueChange={(v) => handleMappingChange(col, v)}>
                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="تجاهل" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">تجاهل</SelectItem>
                              {requiredFields.map((field) => (
                                <SelectItem key={field.key} value={field.key}>{field.name_ar}{field.required && " *"}</SelectItem>
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
                      <Badge key={f.key} variant="outline" className="cursor-pointer hover:bg-muted"
                        onClick={() => setIgnoredRequiredFields([...ignoredRequiredFields, f.key])}>
                        {f.name_ar}<X className="h-3 w-3 mr-1" />
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">اضغط على الحقل لتجاهله إن لم يكن متوفراً في الملف</p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={existingCount > 0 ? () => setStep("mode") : resetDialog}>
                  <ArrowRight className="h-4 w-4 ml-2" />رجوع
                </Button>
                <Button onClick={() => setStep("preview")} disabled={!canProceedToPreview}>
                  معاينة<ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      {Object.values(columnMapping).map((fieldKey) => {
                        const field = requiredFields.find(f => f.key === fieldKey);
                        return <TableHead key={fieldKey} className="text-right">{field?.name_ar || fieldKey}</TableHead>;
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transformedData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{toWesternNumerals(idx + 1)}</TableCell>
                        {Object.values(columnMapping).map((fieldKey) => (
                          <TableCell key={fieldKey} className="max-w-[150px] truncate">{String(row[getDbFieldKey(fieldKey)] || '-')}</TableCell>
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
                <Button variant="ghost" onClick={() => setStep("mapping")}><ArrowRight className="h-4 w-4 ml-2" />رجوع</Button>
                <Button onClick={handleImport}><Check className="h-4 w-4 ml-2" />استيراد {toWesternNumerals(transformedData.length)} سجل</Button>
              </div>
            </div>
          )}

          {/* Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">جاري الاستيراد...</h3>
                <p className="text-sm text-muted-foreground">{toWesternNumerals(importProgress.current)} من {toWesternNumerals(importProgress.total)}</p>
              </div>
              <Progress value={(importProgress.current / importProgress.total) * 100} className="w-64" />
            </div>
          )}

          {/* Complete */}
          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${importResults.failed === 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                {importResults.failed === 0 ? <Check className="h-10 w-10 text-green-600" /> : <AlertTriangle className="h-10 w-10 text-yellow-600" />}
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">تم الاستيراد</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  تم استيراد {toWesternNumerals(importResults.success)} سجل بنجاح
                  {importResults.failed > 0 && ` (${toWesternNumerals(importResults.failed)} فشل)`}
                </p>
              </div>
              {importResults.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-sm text-destructive">
                  {importResults.errors.slice(0, 5).map((err, idx) => <p key={idx}>{err}</p>)}
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
