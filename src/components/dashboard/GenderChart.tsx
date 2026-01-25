import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { useGenderDistribution } from "@/hooks/useDashboardStats";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(340, 82%, 52%)",
];

export function GenderChart() {
  const { data: distribution = [], isLoading } = useGenderDistribution();

  const totalCount = distribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-semibold mb-6">توزيع الطلاب حسب الجنس</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[250px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : totalCount === 0 ? (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
          لا توجد بيانات
        </div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
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
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
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
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
