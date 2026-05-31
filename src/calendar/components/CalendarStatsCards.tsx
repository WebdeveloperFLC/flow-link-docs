import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertCircle, XCircle } from "lucide-react";
import { useEventStats } from "../hooks/useCalendarData";

export function CalendarStatsCards() {
  const { data } = useEventStats();
  const items = [
    { label: "Total Bookings", value: data?.total ?? 0, icon: Calendar, color: "text-primary" },
    { label: "Upcoming Meetings", value: data?.upcoming ?? 0, icon: Clock, color: "text-emerald-500" },
    { label: "Pending Requests", value: data?.pending ?? 0, icon: AlertCircle, color: "text-amber-500" },
    { label: "Cancelled (30d)", value: data?.cancelled ?? 0, icon: XCircle, color: "text-destructive" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{it.label}</CardTitle>
            <it.icon className={`size-4 ${it.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}