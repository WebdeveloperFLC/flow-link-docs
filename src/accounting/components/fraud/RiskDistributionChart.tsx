import { Card } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { RiskDistributionPoint } from "../../types/fraud";

interface Props {
  data: RiskDistributionPoint[];
}

export default function RiskDistributionChart({ data }: Props) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-semibold">Risk score distribution</div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Last 30 days</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(v: string) => v.slice(5)}
              interval={3}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="info" stackId="a" fill="hsl(var(--muted-foreground) / 0.5)" name="Info" />
            <Bar dataKey="warning" stackId="a" fill="hsl(38 92% 50%)" name="Warning" />
            <Bar dataKey="critical" stackId="a" fill="hsl(var(--destructive))" name="Critical" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}