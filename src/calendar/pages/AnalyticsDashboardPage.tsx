import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAnalyticsMetrics, useMeetingTypeBreakdown } from "../hooks/useAnalytics";
import { useCalendarScope } from "../lib/permissions";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

const RANGES = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

export default function AnalyticsDashboardPage() {
  const [days, setDays] = useState(30);
  const scope = useCalendarScope();
  const { data: metrics } = useAnalyticsMetrics(days);
  const { data: breakdown = [] } = useMeetingTypeBreakdown(days);

  const cards = [
    { label: "Total", value: metrics?.total ?? 0 },
    { label: "Upcoming", value: metrics?.upcoming ?? 0 },
    { label: "Completed", value: metrics?.completed ?? 0 },
    { label: "Cancelled", value: metrics?.cancelled ?? 0 },
    { label: "Declined", value: metrics?.declined ?? 0 },
    { label: "No-show", value: metrics?.no_show ?? 0 },
    { label: "Pending", value: metrics?.pending ?? 0 },
  ];

  const completed = metrics?.completed ?? 0;
  const total = metrics?.total ?? 0;
  const approvalRate = total ? Math.round(((total - (metrics?.declined ?? 0)) / total) * 100) : 0;
  const cancellationRate = total ? Math.round(((metrics?.cancelled ?? 0) / total) * 100) : 0;
  const noShowRate = total ? Math.round(((metrics?.no_show ?? 0) / total) * 100) : 0;

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316"];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Appointment Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Scope: <Badge variant="outline" className="ml-1">{scope}</Badge>
            </p>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Approval rate</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{approvalRate}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Cancellation rate</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{cancellationRate}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">No-show rate</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{noShowRate}%</div></CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Appointments by meeting type</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={breakdown}>
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Meeting mix</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={breakdown} dataKey="count" nameKey="name" outerRadius={100} label>
                    {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}