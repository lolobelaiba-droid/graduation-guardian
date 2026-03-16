import { useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MAX_FILE_SIZE, MAX_ROWS, getDbFieldKey } from "./types";
import { type CertificateType, certificateFields, certificateTypeLabels } from "@/types/certificates";

interface UploadStepProps {
  onFileSelect: (file: File) => void;
  error?: string;
  certificateType: CertificateType;
}

export function UploadStep({ onFileSelect, error, certificateType }: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDownloadTemplate = useCallback(() => {
    const fields = certificateFields[certificateType];
    const seen = new Set<string>();
    const headers: string[] = [];
    const statusRow: string[] = [];
    
    for (const f of fields) {
      const dbKey = getDbFieldKey(f.key);
      if (!seen.has(dbKey)) {
        seen.add(dbKey);
        headers.push(f.required ? `${f.name_ar} *` : f.name_ar);
        statusRow.push(f.required ? 'إجباري' : 'اختياري');
      }
    }

    const extraFields = [
      { key: 'supervisor_ar', name: 'المشرف' },
      { key: 'gender', name: 'الجنس' },
      { key: 'first_registration_year', name: 'سنة أول تسجيل' },
      { key: 'research_lab_ar', name: 'مخبر البحث' },
    ];
    for (const ef of extraFields) {
      if (!seen.has(ef.key)) {
        seen.add(ef.key);
        headers.push(ef.name);
        statusRow.push('اختياري');
      }
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, statusRow]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب');
    
    const typeLabel = certificateTypeLabels[certificateType].ar;
    XLSX.writeFile(wb, `قالب_استيراد_${typeLabel}.xlsx`);
  }, [certificateType]);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Download Template Section */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm mb-1">تحميل قالب الاستيراد</h4>
          <p className="text-xs text-muted-foreground">
            حمّل قالب Excel فارغ يحتوي على جميع الأعمدة المطلوبة ({certificateTypeLabels[certificateType].ar})، ثم قم بملئه ورفعه
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          className="gap-2 mr-4 shrink-0"
        >
          <Download className="h-4 w-4" />
          تحميل القالب
        </Button>
      </div>

      <div
        className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Upload className="h-10 w-10 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium mb-1">اسحب الملف هنا أو اضغط للاختيار</p>
            <p className="text-sm text-muted-foreground">
              ملف Excel (.xlsx أو .xls)
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="h-3 w-3" />
              حتى {MAX_ROWS} سجل
            </span>
            <span>•</span>
            <span>حتى {MAX_FILE_SIZE / 1024 / 1024} ميجابايت</span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2 text-sm">تعليمات الاستيراد:</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>حمّل القالب أعلاه واملأه بالبيانات القديمة</li>
          <li>تأكد أن الصف الأول يحتوي على عناوين الأعمدة</li>
          <li>سيتم ربط الأعمدة تلقائياً بناءً على التشابه</li>
          <li>يمكنك تعديل الربط يدوياً قبل الاستيراد</li>
        </ul>
      </div>
    </div>
  );
}
