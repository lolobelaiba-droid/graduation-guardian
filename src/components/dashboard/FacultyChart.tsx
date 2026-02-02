import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { useFacultyDistribution } from "@/hooks/useDashboardStats";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(340, 82%, 52%)",
  "hsl(195, 74%, 45%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
];

export function FacultyChart() {
  const { data: distribution = [], isLoading } = useFacultyDistribution();

  return (
    <div className="bg-card rounded-2xl shadow-card p-6 h-full">
      <h3 className="text-lg font-semibold mb-4">توزيع الطلاب حسب الكلية</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : distribution.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          لا توجد بيانات
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="45%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {distribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover text-popover-foreground rounded-lg shadow-lg p-3 border border-border">
                        <p className="font-medium text-sm">{data.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {data.value} طالب
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
