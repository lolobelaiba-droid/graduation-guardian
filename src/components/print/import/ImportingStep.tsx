import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ImportProgress } from "./types";

interface ImportingStepProps {
  progress: ImportProgress;
}

export function ImportingStep({ progress }: ImportingStepProps) {
  const percentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{percentage}%</span>
        </div>
      </div>
      
      <p className="text-xl font-medium mt-6 mb-2">جاري استيراد البيانات...</p>
      <p className="text-muted-foreground mb-6">
        {progress.current} من {progress.total} سجل
      </p>
      
      <div className="w-full max-w-md">
        <Progress value={percentage} className="h-3" />
      </div>
      
      <p className="text-sm text-muted-foreground mt-4">
        يرجى عدم إغلاق هذه النافذة
      </p>
    </div>
  );
}
