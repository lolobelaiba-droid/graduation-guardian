import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "هندسة الحاسوب", value: 3, color: "hsl(217, 91%, 60%)" },
  { name: "الهندسة المدنية", value: 1, color: "hsl(160, 84%, 39%)" },
  { name: "إدارة الأعمال", value: 1, color: "hsl(38, 92%, 50%)" },
  { name: "الهندسة الكهربائية", value: 1, color: "hsl(262, 83%, 58%)" },
  { name: "الصيدلة", value: 1, color: "hsl(340, 82%, 52%)" },
  { name: "القانون", value: 1, color: "hsl(195, 74%, 45%)" },
  { name: "الطب البشري", value: 1, color: "hsl(142, 71%, 45%)" },
];

export function SpecialtyChart() {
  return (
    <div className="bg-card rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-semibold mb-6">توزيع الطلاب حسب التخصص</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
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
              layout="vertical"
              align="left"
              verticalAlign="middle"
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
