import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImportResults } from "./types";

interface CompleteStepProps {
  results: ImportResults;
  onClose: () => void;
}

export function CompleteStep({ results, onClose }: CompleteStepProps) {
  const hasErrors = results.failed > 0;
  const allFailed = results.success === 0 && results.failed > 0;

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {allFailed ? (
        <XCircle className="h-20 w-20 text-destructive mb-4" />
      ) : hasErrors ? (
        <AlertCircle className="h-20 w-20 text-yellow-500 mb-4" />
      ) : (
        <CheckCircle2 className="h-20 w-20 text-green-600 mb-4" />
      )}

      <p className="text-2xl font-bold mb-2">
        {allFailed ? "فشل الاستيراد" : hasErrors ? "اكتمل الاستيراد جزئياً" : "اكتمل الاستيراد بنجاح"}
      </p>

      <div className="flex gap-4 my-6">
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-3 px-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{results.success}</p>
              <p className="text-sm text-muted-foreground">نجح</p>
            </div>
          </CardContent>
        </Card>

        {results.failed > 0 && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-4 pb-3 px-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-destructive">{results.failed}</p>
                <p className="text-sm text-muted-foreground">فشل</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error Details */}
      {results.errors.length > 0 && (
        <Card className="w-full max-w-lg mb-6">
          <CardContent className="pt-4">
            <p className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              تفاصيل الأخطاء:
            </p>
            <ScrollArea className="h-[120px]">
              <ul className="text-sm space-y-1">
                {results.errors.slice(0, 10).map((error, i) => (
                  <li key={i} className="text-muted-foreground">• {error}</li>
                ))}
                {results.errors.length > 10 && (
                  <li className="text-muted-foreground">... و{results.errors.length - 10} أخطاء أخرى</li>
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Button onClick={onClose} size="lg">
        إغلاق
      </Button>
    </div>
  );
}
