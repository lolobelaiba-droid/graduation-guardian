import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { useCertificateTypeDistribution, usePhdTypeDistributionCandidates } from "@/hooks/useDashboardStats";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(160, 84%, 39%)",
];

interface CertificateTypeChartProps {
  dataSource?: "candidates" | "defended";
}

export const CertificateTypeChart = React.forwardRef<HTMLDivElement, CertificateTypeChartProps>(
  function CertificateTypeChart({ dataSource = "defended" }, ref) {
  const candidatesQuery = usePhdTypeDistributionCandidates();
  const defendedQuery = useCertificateTypeDistribution();
  
  const { data: distribution = [], isLoading } = dataSource === "candidates" 
    ? candidatesQuery 
    : defendedQuery;

  const totalCount = distribution.reduce((sum, item) => sum + item.value, 0);
  const title = dataSource === "candidates" ? "نوع الدكتوراه" : "الشهادات حسب النوع";

  return (
    <div ref={ref} className="bg-card rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-semibold mb-6">{title}</h3>
      
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
                          {data.value} {dataSource === "candidates" ? "طالب" : "شهادة"}
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
});
