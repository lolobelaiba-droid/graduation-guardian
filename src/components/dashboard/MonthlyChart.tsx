import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "يناير", certificates: 12 },
  { month: "فبراير", certificates: 19 },
  { month: "مارس", certificates: 15 },
  { month: "أبريل", certificates: 25 },
  { month: "مايو", certificates: 32 },
  { month: "يونيو", certificates: 28 },
  { month: "يوليو", certificates: 18 },
  { month: "أغسطس", certificates: 22 },
  { month: "سبتمبر", certificates: 35 },
  { month: "أكتوبر", certificates: 40 },
  { month: "نوفمبر", certificates: 38 },
  { month: "ديسمبر", certificates: 45 },
];

export function MonthlyChart() {
  return (
    <div className="bg-card rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-semibold mb-6">الشهادات المطبوعة شهرياً</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
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
    </div>
  );
}
