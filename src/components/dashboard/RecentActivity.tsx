import { cn } from "@/lib/utils";
import { FileText, UserPlus, Printer, Edit, Trash2 } from "lucide-react";

interface Activity {
  id: string;
  type: "create" | "edit" | "delete" | "print";
  description: string;
  timestamp: string;
  user: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "print",
    description: "تم طباعة شهادة تخرج للطالب أحمد محمد",
    timestamp: "منذ 5 دقائق",
    user: "المدير",
  },
  {
    id: "2",
    type: "create",
    description: "تم إضافة طالب جديد: فاطمة علي",
    timestamp: "منذ 15 دقيقة",
    user: "المدير",
  },
  {
    id: "3",
    type: "edit",
    description: "تم تعديل بيانات الطالب محمود حسن",
    timestamp: "منذ ساعة",
    user: "المدير",
  },
  {
    id: "4",
    type: "print",
    description: "تم طباعة 5 شهادات دفعة واحدة",
    timestamp: "منذ ساعتين",
    user: "المدير",
  },
  {
    id: "5",
    type: "create",
    description: "تم إنشاء قالب شهادة جديد: شهادة التميز",
    timestamp: "منذ 3 ساعات",
    user: "المدير",
  },
];

const typeIcons = {
  create: UserPlus,
  edit: Edit,
  delete: Trash2,
  print: Printer,
};

const typeColors = {
  create: "bg-success/10 text-success",
  edit: "bg-primary/10 text-primary",
  delete: "bg-destructive/10 text-destructive",
  print: "bg-warning/10 text-warning",
};

export function RecentActivity() {
  return (
    <div className="bg-card rounded-2xl shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">آخر الأنشطة</h3>
        <a
          href="/activity"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          عرض الكل
        </a>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = typeIcons[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  typeColors[activity.type]
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {activity.user}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
