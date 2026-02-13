import { useUniversitySettings } from "@/hooks/useUniversitySettings";

interface ReportHeaderProps {
  facultyName?: string;
}

export function ReportHeader({ facultyName }: ReportHeaderProps) {
  const { data: settings } = useUniversitySettings();
  const universityName = settings?.universityName || "جامعة العربي بن مهيدي أم البواقي";

  return (
    <div className="text-center space-y-2 pb-4 border-b border-border">
      <p className="text-sm text-muted-foreground font-medium">الجمهورية الجزائرية الديمقراطية الشعبية</p>
      <p className="text-sm text-muted-foreground">وزارة التعليم العالي والبحث العلمي</p>
      <div className="flex items-center justify-center gap-3 py-2">
        {settings?.universityLogo ? (
          <img src={settings.universityLogo} alt="شعار الجامعة" className="h-14 w-14 object-contain" />
        ) : (
          <img src="/favicon.ico" alt="شعار" className="h-10 w-10" />
        )}
      </div>
      <h2 className="text-lg font-bold text-primary">{universityName}</h2>
      {facultyName && (
        <p className="text-sm font-semibold text-muted-foreground">{facultyName}</p>
      )}
      <h1 className="text-xl font-bold text-foreground mt-2">تقرير الأداء في التكوين</h1>
    </div>
  );
}
