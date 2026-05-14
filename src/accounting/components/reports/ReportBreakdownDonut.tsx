import { Card } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatAccounting } from "../../lib/format";

const COLORS = ["hsl(var(--primary))", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#64748b"];

interface Props {
  title: string;
  data: { name: string; value: number }[];
}

export default function ReportBreakdownDonut({ title, data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold mb-3">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatAccounting(v)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-xs">
          {data.map((d, i) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <li key={d.name} className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 truncate text-foreground">{d.name}</span>
                <span className="tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}