import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { useFacultyDistribution, useFacultyDistributionCandidates } from "@/hooks/useDashboardStats";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toWesternNumerals } from "@/lib/numerals";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(340, 82%, 52%)",
  "hsl(195, 74%, 45%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 70%, 50%)",
  "hsl(15, 85%, 55%)",
];

interface FacultyChartProps {
  dataSource?: "candidates" | "defended";
}

export function FacultyChart({ dataSource = "defended" }: FacultyChartProps) {
  const candidatesQuery = useFacultyDistributionCandidates();
  const defendedQuery = useFacultyDistribution();
  
  const { data: distribution = [], isLoading } = dataSource === "candidates" 
    ? candidatesQuery 
    : defendedQuery;

  const totalStudents = distribution.reduce((sum, item) => sum + item.value, 0);
  const title = dataSource === "candidates" 
    ? "توزيع طلبة الدكتوراه حسب الكلية" 
    : "توزيع المناقشين حسب الكلية";

  return (
    <div className="bg-card rounded-2xl shadow-card p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : distribution.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          لا توجد بيانات
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Chart */}
          <div className="h-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
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
                      const percentage = totalStudents > 0 
                        ? ((data.value / totalStudents) * 100).toFixed(1) 
                        : 0;
                      return (
                        <div className="bg-popover text-popover-foreground rounded-lg shadow-lg p-3 border border-border">
                          <p className="font-medium text-sm">{data.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {toWesternNumerals(data.value)} طالب ({toWesternNumerals(percentage)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Custom Legend with Scroll */}
          <ScrollArea className="flex-1 max-h-[100px]">
            <div className="space-y-1.5 px-1">
              {distribution.map((item, index) => {
                const percentage = totalStudents > 0 
                  ? ((item.value / totalStudents) * 100).toFixed(0) 
                  : 0;
                return (
                  <div 
                    key={item.name} 
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-foreground truncate">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground flex-shrink-0">
                      {toWesternNumerals(percentage)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
