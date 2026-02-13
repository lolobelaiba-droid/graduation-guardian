import { useMemo } from "react";
import { toWesternNumerals } from "@/lib/numerals";

interface KpiGaugeProps {
  value: number;
  label: string;
  size?: number;
}

export function KpiGauge({ value, label, size = 180 }: KpiGaugeProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  const color = useMemo(() => {
    if (clampedValue > 90) return "hsl(var(--chart-2))"; // green
    if (clampedValue > 75) return "hsl(var(--primary))"; // blue
    if (clampedValue > 50) return "hsl(45, 93%, 47%)"; // yellow
    return "hsl(var(--destructive))"; // red
  }, [clampedValue]);

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {toWesternNumerals(Math.round(clampedValue))}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  );
}
