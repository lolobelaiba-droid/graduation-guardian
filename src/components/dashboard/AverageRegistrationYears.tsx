import { Loader2, Calendar, TrendingUp } from "lucide-react";
import { useAverageRegistrationYears } from "@/hooks/useDashboardStats";
import { toWesternNumerals } from "@/lib/numerals";

export function AverageRegistrationYears() {
  const { data, isLoading } = useAverageRegistrationYears();

  return (
    <div className="bg-card rounded-2xl shadow-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">متوسط سنوات التسجيل في الدكتوراه</h3>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[120px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PhD LMD Average */}
          <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">دكتوراه ل م د</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {data?.phdLmdAverage !== null ? toWesternNumerals(data.phdLmdAverage.toFixed(1)) : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground">سنة</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  من أصل {toWesternNumerals(data?.phdLmdCount || 0)} طالب
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* PhD Science Average */}
          <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">دكتوراه علوم</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {data?.phdScienceAverage !== null ? toWesternNumerals(data.phdScienceAverage.toFixed(1)) : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground">سنة</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  من أصل {toWesternNumerals(data?.phdScienceCount || 0)} طالب
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Overall Average */}
          <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">المتوسط العام</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {data?.overallAverage !== null ? toWesternNumerals(data.overallAverage.toFixed(1)) : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground">سنة</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  إجمالي {toWesternNumerals(data?.totalCount || 0)} طالب دكتوراه
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        يُحسب المتوسط من الفرق بين سنة أول تسجيل وسنة المناقشة
      </p>
    </div>
  );
}
