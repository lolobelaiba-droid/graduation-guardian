import { ArrowLeft, CheckCircle2, AlertCircle, Link2, Link2Off, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ColumnMapping, FieldDefinition, ExcelRow } from "./types";

interface MappingStepProps {
  excelColumns: string[];
  excelData: ExcelRow[];
  columnMapping: ColumnMapping;
  requiredFields: FieldDefinition[];
  ignoredRequiredFields: string[];
  onMappingChange: (excelCol: string, fieldKey: string) => void;
  onIgnoreFieldToggle: (fieldKey: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function MappingStep({
  excelColumns,
  excelData,
  columnMapping,
  requiredFields,
  ignoredRequiredFields,
  onMappingChange,
  onIgnoreFieldToggle,
  onBack,
  onNext,
}: MappingStepProps) {
  const getMappedFieldKey = (excelCol: string) => {
    return columnMapping[excelCol] || "_none";
  };

  const getUnmappedRequiredFields = () => {
    const mappedKeys = Object.values(columnMapping);
    return requiredFields.filter(
      (f) => f.required && !mappedKeys.includes(f.key) && !ignoredRequiredFields.includes(f.key)
    );
  };

  const getMappedRequiredFields = () => {
    const mappedKeys = Object.values(columnMapping);
    return requiredFields.filter((f) => f.required && mappedKeys.includes(f.key));
  };

  const getSampleValue = (excelCol: string): string => {
    if (excelData.length === 0) return "-";
    const value = excelData[0][excelCol];
    if (value === null || value === undefined) return "-";
    const strValue = String(value);
    return strValue.length > 30 ? strValue.slice(0, 30) + "..." : strValue;
  };

  const unmappedRequired = getUnmappedRequiredFields();
  const mappedRequired = getMappedRequiredFields();
  const totalRequired = requiredFields.filter(f => f.required).length;
  const activeRequired = totalRequired - ignoredRequiredFields.length;
  const isValid = unmappedRequired.length === 0;

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-muted">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">سجلات للاستيراد</span>
              <Badge variant="secondary">{excelData.length}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className={isValid ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الحقول المطلوبة</span>
              <Badge variant={isValid ? "default" : "outline"} className={isValid ? "bg-green-600" : ""}>
                {mappedRequired.length}/{activeRequired}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">أعمدة مربوطة</span>
              <Badge variant="outline">{Object.keys(columnMapping).length}/{excelColumns.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unmapped Required Warning with ignore option */}
      {unmappedRequired.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive mb-2">حقول مطلوبة غير مربوطة:</p>
              <div className="space-y-2">
                {unmappedRequired.map((f) => (
                  <div key={f.key} className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                    <span className="text-sm">{f.name_ar}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => onIgnoreFieldToggle(f.key)}
                    >
                      <EyeOff className="h-3 w-3" />
                      تجاهل هذا الحقل
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ignored fields notice */}
      {ignoredRequiredFields.length > 0 && (
        <div className="bg-muted/50 border rounded-lg p-3">
          <div className="flex items-start gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-2">حقول متجاهلة (سيتم استيرادها فارغة):</p>
              <div className="flex flex-wrap gap-2">
                {ignoredRequiredFields.map((key) => {
                  const field = requiredFields.find(f => f.key === key);
                  return (
                    <Badge 
                      key={key} 
                      variant="outline" 
                      className="text-xs cursor-pointer hover:bg-destructive/10"
                      onClick={() => onIgnoreFieldToggle(key)}
                    >
                      {field?.name_ar || key}
                      <span className="mr-1 text-destructive">×</span>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            ربط الأعمدة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-sm font-medium sticky top-0">
                <div className="col-span-4">عمود Excel</div>
                <div className="col-span-3">مثال</div>
                <div className="col-span-1 text-center">←</div>
                <div className="col-span-4">حقل قاعدة البيانات</div>
              </div>
              
              {/* Rows */}
              {excelColumns.map((col) => {
                const mappedKey = getMappedFieldKey(col);
                const isMapped = mappedKey !== "_none";
                const mappedField = requiredFields.find(f => f.key === mappedKey);
                const isRequiredMapped = mappedField?.required;
                
                return (
                  <div 
                    key={col} 
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors ${
                      isMapped 
                        ? isRequiredMapped 
                          ? "bg-green-50/50 dark:bg-green-950/20" 
                          : "bg-blue-50/50 dark:bg-blue-950/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        {isMapped ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Link2Off className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-medium truncate" title={col}>{col}</span>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm text-muted-foreground truncate block" title={getSampleValue(col)}>
                        {getSampleValue(col)}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <ArrowLeft className={`h-4 w-4 mx-auto ${isMapped ? "text-green-600" : "text-muted-foreground/30"}`} />
                    </div>
                    <div className="col-span-4">
                      <Select
                        value={mappedKey}
                        onValueChange={(v) => onMappingChange(col, v)}
                      >
                        <SelectTrigger className={`h-9 ${isMapped ? "border-green-500/50" : ""}`}>
                          <SelectValue placeholder="اختر الحقل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">
                            <span className="text-muted-foreground">-- تجاهل هذا العمود --</span>
                          </SelectItem>
                          <Separator className="my-1" />
                          {requiredFields.filter(f => f.required).length > 0 && (
                            <>
                              <div className="px-2 py-1 text-xs text-muted-foreground font-medium">الحقول المطلوبة</div>
                              {requiredFields.filter(f => f.required).map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  <span className="flex items-center gap-2">
                                    {field.name_ar}
                                    <span className="text-xs text-muted-foreground">({field.name_fr})</span>
                                  </span>
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                            </>
                          )}
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium">الحقول الاختيارية</div>
                          {requiredFields.filter(f => !f.required).map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              <span className="flex items-center gap-2">
                                {field.name_ar}
                                <span className="text-xs text-muted-foreground">({field.name_fr})</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          رجوع
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          معاينة البيانات ({excelData.length} سجل)
        </Button>
      </div>
    </div>
  );
}
