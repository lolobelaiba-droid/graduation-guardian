import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  type CertificateType,
  certificateFields,
  getCertificateTable,
} from "@/types/certificates";
import { useQueryClient } from "@tanstack/react-query";

import { UploadStep } from "./UploadStep";
import { MappingStep } from "./MappingStep";
import { PreviewStep } from "./PreviewStep";
import { ImportingStep } from "./ImportingStep";
import { CompleteStep } from "./CompleteStep";
import {
  ImportStep,
  ColumnMapping,
  ImportProgress,
  ImportResults,
  ExcelRow,
  MAX_FILE_SIZE,
  MAX_ROWS,
  getDbFieldKey,
} from "./types";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateType: CertificateType;
}

export function ImportExcelDialog({
  open,
  onOpenChange,
  certificateType,
}: ImportExcelDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [uploadError, setUploadError] = useState<string>("");
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<ImportResults>({ success: 0, failed: 0, errors: [] });
  const queryClient = useQueryClient();

  const requiredFields = certificateFields[certificateType];

  const resetDialog = useCallback(() => {
    setStep("upload");
    setUploadError("");
    setExcelData([]);
    setExcelColumns([]);
    setColumnMapping({});
    setImportProgress({ current: 0, total: 0 });
    setImportResults({ success: 0, failed: 0, errors: [] });
  }, []);

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleFileSelect = async (file: File) => {
    setUploadError("");

    // Validate file type
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

    // Validate file size
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

      // Get column names from first row
      const columns = Object.keys(jsonData[0]);
      setExcelColumns(columns);
      setExcelData(jsonData);

      // Auto-map columns based on similar names
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
          // Avoid duplicate mappings
          const alreadyMapped = Object.values(autoMapping).includes(matchedField.key);
          if (!alreadyMapped) {
            autoMapping[col] = matchedField.key;
          }
        }
      });
      setColumnMapping(autoMapping);

      setStep("mapping");
      toast.success(`تم تحميل ${jsonData.length} سجل من الملف`);
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

  const transformRow = useCallback((row: ExcelRow): Record<string, unknown> => {
    const transformed: Record<string, unknown> = {};

    Object.entries(columnMapping).forEach(([excelCol, fieldKey]) => {
      let value = row[excelCol];
      const dbKey = getDbFieldKey(fieldKey);

      // Sanitize string values
      if (typeof value === "string") {
        value = value.trim().slice(0, 1000);
      }

      // Handle date fields
      if (["date_of_birth", "defense_date", "certificate_date"].includes(dbKey)) {
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
      if (dbKey === "mention") {
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

      transformed[dbKey] = value;
    });

    return transformed;
  }, [columnMapping]);

  const transformedData = excelData.map(transformRow);

  const handleImport = async () => {
    setStep("importing");
    setImportProgress({ current: 0, total: excelData.length });

    const tableName = getCertificateTable(certificateType);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const transformedDataRow = transformRow(row);

      try {
        let error;
        if (tableName === 'phd_lmd_certificates') {
          const result = await supabase.from('phd_lmd_certificates').insert(transformedDataRow as never);
          error = result.error;
        } else if (tableName === 'phd_science_certificates') {
          const result = await supabase.from('phd_science_certificates').insert(transformedDataRow as never);
          error = result.error;
        } else {
          const result = await supabase.from('master_certificates').insert(transformedDataRow as never);
          error = result.error;
        }

        if (error) {
          console.error("Insert error:", error);
          failedCount++;
          errors.push(`السجل ${i + 1}: ${error.message}`);
        } else {
          successCount++;
        }
      } catch (error) {
        console.error("Import error:", error);
        failedCount++;
        errors.push(`السجل ${i + 1}: خطأ غير متوقع`);
      }

      setImportProgress({ current: i + 1, total: excelData.length });
    }

    setImportResults({ success: successCount, failed: failedCount, errors });

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

  const getStepDescription = () => {
    switch (step) {
      case "upload": return "اختر ملف Excel يحتوي على بيانات الطلاب";
      case "mapping": return "قم بربط أعمدة Excel مع حقول قاعدة البيانات";
      case "preview": return "راجع البيانات وتأكد من صحتها قبل الاستيراد";
      case "importing": return "جاري استيراد البيانات...";
      case "complete": return "اكتمل الاستيراد";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            استيراد بيانات الطلاب من Excel
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        {step !== "complete" && step !== "importing" && (
          <div className="flex items-center justify-center gap-2 py-2">
            {["upload", "mapping", "preview"].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s 
                    ? "bg-primary text-primary-foreground" 
                    : (["upload", "mapping", "preview"].indexOf(step) > idx)
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {idx + 1}
                </div>
                {idx < 2 && (
                  <div className={`w-12 h-0.5 mx-1 ${
                    ["upload", "mapping", "preview"].indexOf(step) > idx
                      ? "bg-green-600"
                      : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-1">
          {step === "upload" && (
            <UploadStep 
              onFileSelect={handleFileSelect} 
              error={uploadError}
            />
          )}

          {step === "mapping" && (
            <MappingStep
              excelColumns={excelColumns}
              excelData={excelData}
              columnMapping={columnMapping}
              requiredFields={requiredFields}
              onMappingChange={handleMappingChange}
              onBack={resetDialog}
              onNext={() => setStep("preview")}
            />
          )}

          {step === "preview" && (
            <PreviewStep
              excelData={excelData}
              columnMapping={columnMapping}
              requiredFields={requiredFields}
              transformedData={transformedData}
              onBack={() => setStep("mapping")}
              onConfirm={handleImport}
            />
          )}

          {step === "importing" && (
            <ImportingStep progress={importProgress} />
          )}

          {step === "complete" && (
            <CompleteStep results={importResults} onClose={handleClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
