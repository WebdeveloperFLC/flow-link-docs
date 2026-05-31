import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { STATUS_LABEL, type CalendarEventStatus, type CalendarEventWithRelations } from "../lib/calendarTypes";
import { diffMinutes } from "../lib/calendarApi";
import { Clock, User } from "lucide-react";

const statusVariant: Record<CalendarEventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  scheduled: "default",
  completed: "outline",
  cancelled: "destructive",
  declined: "destructive",
  no_show: "destructive",
};

type Props = {
  event: CalendarEventWithRelations;
  compact?: boolean;
  asLink?: boolean;
};

export function AppointmentCard({ event, compact, asLink = true }: Props) {
  const visitor = event.calendar_participants?.[0];
  const title = event.event_title || event.calendar_meeting_types?.meeting_name || "Meeting";
  const duration = diffMinutes(event.start_time, event.end_time);
  const inner = (
    <div
      className={`rounded-md border bg-card hover:bg-accent/40 transition-colors ${compact ? "p-1.5 text-xs" : "p-2 text-sm"}`}
      style={event.calendar_meeting_types?.color_code ? { borderLeft: `3px solid ${event.calendar_meeting_types.color_code}` } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium truncate">{title}</div>
        {!compact && <Badge variant={statusVariant[event.status]} className="shrink-0 text-[10px]">{STATUS_LABEL[event.status]}</Badge>}
      </div>
      <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
        <Clock className="size-3" />
        <span>{event.start_time.slice(0, 5)} · {duration}m</span>
      </div>
      {!compact && visitor && (
        <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
          <User className="size-3" /> <span className="truncate">{visitor.full_name}</span>
        </div>
      )}
    </div>
  );
  if (!asLink) return inner;
  return <Link to={`/calendar/appointments/${event.id}`} className="block">{inner}</Link>;
}