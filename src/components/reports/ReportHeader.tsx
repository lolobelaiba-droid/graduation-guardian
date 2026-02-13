import { useUniversitySettings } from "@/hooks/useUniversitySettings";

interface ReportHeaderProps {
  facultyName?: string;
}

export function ReportHeader({ facultyName }: ReportHeaderProps) {
  const { data: settings } = useUniversitySettings();
  const universityName = settings?.universityName || "جامعة العربي بن مهيدي- أم البواقي-";

  return (
    <div className="text-center space-y-1 pb-4">
      <p className="text-sm text-muted-foreground font-medium">الجمهورية الجزائرية الديمقراطية الشعبية</p>
      <p className="text-sm text-muted-foreground">وزارة التعليم العالي والبحث العلمي</p>
      <h2 className="text-base font-bold text-foreground mt-1">{universityName}</h2>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto">
        نيابة المديرية للتكوين العالي في الطور الثالث والتأهيل الجامعي والبحث العلمي والتكوين العالي فيما بعد التدرج
      </p>

      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-primary">تقرير الأداء في التكوين الدكتورالي</h1>
      </div>

      {facultyName ? (
        <p className="text-sm font-semibold text-muted-foreground text-right">كلية/معهد: {facultyName}</p>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground text-right">التقرير العام للجامعة</p>
      )}
    </div>
  );
}
