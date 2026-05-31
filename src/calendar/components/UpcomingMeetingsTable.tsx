import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUpcomingEvents } from "../hooks/useCalendarData";
import { transitionEvent } from "../lib/calendarApi";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  scheduled: "default",
  completed: "outline",
  cancelled: "destructive",
  declined: "destructive",
};

export function UpcomingMeetingsTable() {
  const { data: events, isLoading } = useUpcomingEvents();
  const qc = useQueryClient();

  const act = async (id: string, action: "confirm" | "decline" | "cancel" | "complete") => {
    try {
      await transitionEvent(id, action);
      toast.success(`Event ${action}ed`);
      qc.invalidateQueries({ queryKey: ["calendar_events_upcoming"] });
      qc.invalidateQueries({ queryKey: ["calendar_event_stats"] });
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming meetings</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !events || events.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No upcoming meetings.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-3">Meeting</th>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Attendee</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const visitor = e.calendar_participants?.[0];
                  const mt = e.calendar_meeting_types;
                  return (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{mt?.meeting_name ?? e.event_title ?? "Meeting"}</div>
                        <div className="text-xs text-muted-foreground">{e.event_reference}</div>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {format(new Date(e.event_date), "MMM d, yyyy")} · {e.start_time.slice(0, 5)}
                      </td>
                      <td className="py-2 pr-3">
                        <div>{visitor?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{visitor?.email}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">
                        {e.status === "pending" && (
                          <>
                            <Button size="sm" variant="default" className="mr-1" onClick={() => act(e.id, "confirm")}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => act(e.id, "decline")}>
                              Decline
                            </Button>
                          </>
                        )}
                        {e.status === "scheduled" && (
                          <>
                            <Button size="sm" variant="default" className="mr-1" onClick={() => act(e.id, "complete")}>
                              Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => act(e.id, "cancel")}>
                              Cancel
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}