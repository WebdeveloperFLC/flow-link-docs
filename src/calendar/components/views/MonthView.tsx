import { useNavigate } from "react-router-dom";
import {
  addDays, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, startOfMonth, startOfWeek,
} from "date-fns";
import type { CalendarEventWithRelations } from "../../lib/calendarTypes";

type Props = {
  anchorDate: string;
  events: CalendarEventWithRelations[];
  onDayClick?: (date: string) => void;
};

export function MonthView({ anchorDate, events, onDayClick }: Props) {
  const navigate = useNavigate();
  const anchor = new Date(anchorDate);
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const byDay = new Map<string, CalendarEventWithRelations[]>();
  events.forEach((e) => {
    const arr = byDay.get(e.event_date) ?? [];
    arr.push(e);
    byDay.set(e.event_date, arr);
  });

  return (
    <div className="rounded-md border bg-card">
      <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dayStr = format(d, "yyyy-MM-dd");
          const dayEvents = byDay.get(dayStr) ?? [];
          const inMonth = isSameMonth(d, anchor);
          return (
            <div
              key={dayStr}
              className={`min-h-[96px] border-b border-r p-1 cursor-pointer hover:bg-accent/30 ${!inMonth ? "bg-muted/40" : ""}`}
              onClick={() => onDayClick?.(dayStr)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${!inMonth ? "text-muted-foreground" : "font-medium"}`}>{format(d, "d")}</span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] bg-primary text-primary-foreground rounded-full h-4 min-w-[16px] px-1 inline-flex items-center justify-center">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); navigate(`/calendar/appointments/${e.id}`); }}
                    className="truncate rounded px-1 text-[10px] text-white"
                    style={{ background: e.calendar_meeting_types?.color_code || "hsl(var(--primary))" }}
                  >
                    {e.start_time.slice(0, 5)} {e.event_title || e.calendar_meeting_types?.meeting_name}
                  </div>
                ))}
                {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}