import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { toWesternNumerals } from "@/lib/numerals";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "blue" | "green" | "orange" | "purple";
  className?: string;
  compact?: boolean;
}

const variantStyles = {
  blue: "stat-gradient-blue",
  green: "stat-gradient-green",
  orange: "stat-gradient-orange",
  purple: "stat-gradient-purple",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "blue",
  className,
  compact = false,
}: StatCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl p-4 text-white shadow-card transition-transform duration-300 hover:scale-[1.02]",
          variantStyles[variant],
          className
        )}
      >
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium opacity-90 truncate">{title}</p>
            <p className="text-2xl font-bold">{typeof value === 'number' ? toWesternNumerals(value) : value}</p>
            {subtitle && (
              <p className="text-xs opacity-75">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 text-white shadow-elevated transition-transform duration-300 hover:scale-[1.02]",
        variantStyles[variant],
        className
      )}
    >
      {/* Background Pattern */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="80" cy="20" r="40" fill="white" />
          <circle cx="20" cy="80" r="30" fill="white" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">{title}</p>
            <p className="text-4xl font-bold mt-2">{typeof value === 'number' ? toWesternNumerals(value) : value}</p>
            {subtitle && (
              <p className="text-sm opacity-75 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Icon className="h-6 w-6" />
          </div>
        </div>

        {trend && (
          <div className="mt-4 flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium px-2 py-1 rounded-full",
                trend.isPositive ? "bg-white/20" : "bg-white/10"
              )}
            >
              {trend.isPositive ? "+" : ""}{toWesternNumerals(trend.value)}%
            </span>
            <span className="text-sm opacity-75">من الشهر الماضي</span>
          </div>
        )}
      </div>
    </div>
  );
}