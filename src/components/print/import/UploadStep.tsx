import { useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MAX_FILE_SIZE, MAX_ROWS } from "./types";

interface UploadStepProps {
  onFileSelect: (file: File) => void;
  error?: string;
}

export function UploadStep({ onFileSelect, error }: UploadStepProps) {
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

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
          <li>تأكد أن الصف الأول يحتوي على عناوين الأعمدة</li>
          <li>سيتم ربط الأعمدة تلقائياً بناءً على التشابه</li>
          <li>يمكنك تعديل الربط يدوياً قبل الاستيراد</li>
          <li>سيتم مراجعة البيانات قبل إضافتها للنظام</li>
        </ul>
      </div>
    </div>
  );
}
