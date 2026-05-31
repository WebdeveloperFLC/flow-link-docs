import { format, parseISO } from "date-fns";
import { AppointmentCard } from "../AppointmentCard";
import type { CalendarEventWithRelations } from "../../lib/calendarTypes";

type Props = { events: CalendarEventWithRelations[] };

export function AgendaView({ events }: Props) {
  if (!events.length) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No appointments in this range.</div>;
  }
  const byDay = new Map<string, CalendarEventWithRelations[]>();
  events.forEach((e) => {
    const arr = byDay.get(e.event_date) ?? [];
    arr.push(e);
    byDay.set(e.event_date, arr);
  });
  const days = Array.from(byDay.keys()).sort();
  return (
    <div className="space-y-4">
      {days.map((d) => (
        <div key={d}>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {format(parseISO(d), "EEEE, MMM d, yyyy")}
          </div>
          <div className="space-y-2">
            {byDay.get(d)!.map((e) => <AppointmentCard key={e.id} event={e} />)}
          </div>
        </div>
      ))}
    </div>
  );
}