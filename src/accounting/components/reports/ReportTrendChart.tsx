import { Card } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatAccounting } from "../../lib/format";

interface Props {
  title: string;
  data: { month: string; revenue: number }[];
}

export default function ReportTrendChart({ title, data }: Props) {
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold mb-3">{title}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatAccounting(v, "CAD", { compact: true })} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => formatAccounting(v)}
            />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}