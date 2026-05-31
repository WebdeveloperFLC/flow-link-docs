import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useActivityFeed } from "../hooks/useActivityFeed";
import { STATUS_LABEL, type CalendarEventStatus } from "../lib/calendarTypes";
import { formatDistanceToNow } from "date-fns";

const STATUSES: (CalendarEventStatus | "all")[] = ["all", "pending", "scheduled", "completed", "cancelled", "declined", "no_show"];

export default function ActivityFeedPage() {
  const [search, setSearch] = useState("");
  const [toStatus, setToStatus] = useState<string>("all");
  const [days, setDays] = useState(30);
  const { data: feed = [], isLoading } = useActivityFeed({
    search: search || undefined,
    toStatus: toStatus === "all" ? undefined : toStatus,
    days,
  });

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Activity feed</h1>
          <p className="text-sm text-muted-foreground">Searchable, filterable history of appointment changes.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Search reference / visitor / email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={toStatus} onValueChange={setToStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : STATUS_LABEL[s as CalendarEventStatus]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6">Loading…</CardContent></Card>
        ) : feed.length === 0 ? (
          <Card><CardContent className="p-6 text-muted-foreground">No activity in this range.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {feed.map((row: any) => (
              <Card key={row.id}>
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{row.event_reference}</span>{" "}
                      <span className="font-medium">{row.visitor_name ?? "Visitor"}</span>{" "}
                      <span className="text-muted-foreground">→</span>{" "}
                      <span className="font-medium">{STATUS_LABEL[row.to_status as CalendarEventStatus]}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {row.event_title ?? "Meeting"} · {row.event_date} {row.start_time?.slice(0, 5)} · {row.visitor_email}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">{row.actor_kind}</Badge>
                    <div className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(row.at))} ago</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}