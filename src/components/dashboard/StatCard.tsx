import React from "react";
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

const variantInlineStyles: Record<string, React.CSSProperties> = {
  blue:   { background: "linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 50%) 100%)" },
  green:  { background: "linear-gradient(135deg, hsl(160, 84%, 39%) 0%, hsl(160, 84%, 30%) 100%)" },
  orange: { background: "linear-gradient(135deg, hsl(38,  92%, 50%) 0%, hsl(38,  92%, 40%) 100%)" },
  purple: { background: "linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(262, 83%, 48%) 100%)" },
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
  const gradientStyle = variantInlineStyles[variant];

  if (compact) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl p-4 text-white shadow-card transition-transform duration-300 hover:scale-[1.02]",
          className
        )}
        style={gradientStyle}
      >
        <div className="relative z-10 flex flex-col items-center text-center gap-2">
          <p className="text-xs font-medium opacity-90 leading-tight">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{typeof value === 'number' ? toWesternNumerals(value) : value}</p>
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {subtitle && (
            <p className="text-xs opacity-75">{subtitle}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 text-white shadow-elevated transition-transform duration-300 hover:scale-[1.02]",
        className
      )}
      style={gradientStyle}
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
