import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useMonthlyPrintStats } from "@/hooks/useDashboardStats";

export function MonthlyChart() {
  const { data: monthlyData = [], isLoading } = useMonthlyPrintStats();

  return (
    <div className="bg-card rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-semibold mb-6">الشهادات المطبوعة شهرياً</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis
                dataKey="month"
                type="category"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={60}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover text-popover-foreground rounded-lg shadow-lg p-3 border border-border">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          {payload[0].value} شهادة
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="certificates"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
