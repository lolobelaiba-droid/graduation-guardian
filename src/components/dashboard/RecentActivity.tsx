import { cn } from "@/lib/utils";
import { UserPlus, Edit, Trash2, Printer, Loader2 } from "lucide-react";
import { useActivityLog, activityTypeIcons, ActivityType } from "@/hooks/useActivityLog";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toWesternNumerals } from "@/lib/numerals";

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
  const { data: activities = [], isLoading } = useActivityLog(5);

  const formatTimestamp = (date: string) => {
    const formatted = formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
    return toWesternNumerals(formatted);
  };

  return (
    <div className="bg-card rounded-2xl shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">آخر الأنشطة</h3>
        <Link
          to="/activity"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          عرض الكل
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          لا توجد أنشطة حتى الآن
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const iconType = activityTypeIcons[activity.activity_type as ActivityType] || "edit";
            const Icon = typeIcons[iconType];
            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    typeColors[iconType]
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
                      {formatTimestamp(activity.created_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {activity.created_by}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
