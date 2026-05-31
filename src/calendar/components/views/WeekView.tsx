import { useNavigate } from "react-router-dom";
import { addDays, format, startOfWeek } from "date-fns";
import { useUpdateAppointment } from "../../hooks/useAppointments";
import { addMinutesToTime, diffMinutes } from "../../lib/calendarApi";
import type { CalendarEventWithRelations } from "../../lib/calendarTypes";
import { toast } from "sonner";

type Props = {
  anchorDate: string;
  events: CalendarEventWithRelations[];
};

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 48;

function minutesFromStart(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR) * 60 + m;
}

export function WeekView({ anchorDate, events }: Props) {
  const navigate = useNavigate();
  const update = useUpdateAppointment();
  const start = startOfWeek(new Date(anchorDate), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const onDrop = async (e: React.DragEvent, dayStr: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/event-id");
    const orig = events.find((x) => x.id === id);
    if (!id || !orig) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = Math.max(0, Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15);
    const hh = String(START_HOUR + Math.floor(totalMin / 60)).padStart(2, "0");
    const mm = String(totalMin % 60).padStart(2, "0");
    const newStart = `${hh}:${mm}`;
    const duration = diffMinutes(orig.start_time, orig.end_time);
    try {
      await update.mutateAsync({
        id,
        patch: { event_date: dayStr, start_time: `${newStart}:00`, end_time: addMinutesToTime(newStart, duration) },
      });
      toast.success("Moved");
    } catch (err: any) {
      toast.error(err.message || "Move failed");
    }
  };

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(110px,1fr))] border-b text-xs">
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="px-2 py-2 border-l text-center">
            <div className="font-medium">{format(d, "EEE")}</div>
            <div className="text-muted-foreground">{format(d, "MMM d")}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(110px,1fr))]">
        <div>
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-muted-foreground px-1 pt-0.5 border-b">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {days.map((d) => {
          const dayStr = format(d, "yyyy-MM-dd");
          const dayEvents = events.filter((e) => e.event_date === dayStr);
          return (
            <div
              key={dayStr}
              className="relative border-l"
              style={{ height: HOUR_HEIGHT * (END_HOUR - START_HOUR + 1) }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, dayStr)}
            >
              {hours.map((h) => <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b" />)}
              {dayEvents.map((e) => {
                const top = (minutesFromStart(e.start_time) / 60) * HOUR_HEIGHT;
                const height = (diffMinutes(e.start_time, e.end_time) / 60) * HOUR_HEIGHT;
                const color = e.calendar_meeting_types?.color_code || "hsl(var(--primary))";
                return (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={(ev) => ev.dataTransfer.setData("text/event-id", e.id)}
                    onClick={() => navigate(`/calendar/appointments/${e.id}`)}
                    className="absolute left-0.5 right-0.5 rounded p-1 text-[10px] text-white cursor-pointer shadow-sm hover:opacity-90 overflow-hidden"
                    style={{ top, height: Math.max(height, 20), background: color }}
                  >
                    <div className="font-medium truncate">{e.event_title || e.calendar_meeting_types?.meeting_name}</div>
                    <div className="opacity-90 truncate">{e.start_time.slice(0, 5)}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}