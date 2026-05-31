import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useUpdateAppointment } from "../../hooks/useAppointments";
import { addMinutesToTime, diffMinutes } from "../../lib/calendarApi";
import { STATUS_LABEL, type CalendarEventWithRelations } from "../../lib/calendarTypes";
import { toast } from "sonner";

type Props = {
  date: string;
  events: CalendarEventWithRelations[];
};

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 56; // px per hour

function minutesFromStart(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR) * 60 + m;
}

export function DayView({ date, events }: Props) {
  const navigate = useNavigate();
  const update = useUpdateAppointment();
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const dayEvents = events.filter((e) => e.event_date === date);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/event-id");
    const orig = events.find((x) => x.id === id);
    if (!id || !orig) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = Math.max(0, Math.round(y / HOUR_HEIGHT * 60 / 15) * 15);
    const hh = String(START_HOUR + Math.floor(totalMin / 60)).padStart(2, "0");
    const mm = String(totalMin % 60).padStart(2, "0");
    const newStart = `${hh}:${mm}`;
    const duration = diffMinutes(orig.start_time, orig.end_time);
    try {
      await update.mutateAsync({
        id,
        patch: { event_date: date, start_time: `${newStart}:00`, end_time: addMinutesToTime(newStart, duration) },
      });
      toast.success("Moved");
    } catch (err: any) {
      toast.error(err.message || "Move failed");
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <div className="px-3 py-2 text-sm font-medium border-b">{format(new Date(date), "EEEE, MMM d, yyyy")}</div>
      <div className="flex">
        <div className="w-14 shrink-0 border-r">
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-muted-foreground px-1 pt-0.5 border-b">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div
          className="relative flex-1"
          style={{ height: HOUR_HEIGHT * (END_HOUR - START_HOUR + 1) }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b" />
          ))}
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
                className="absolute left-1 right-1 rounded-md p-1.5 text-xs text-white cursor-pointer shadow-sm hover:opacity-90"
                style={{ top, height: Math.max(height, 24), background: color }}
              >
                <div className="font-medium truncate">{e.event_title || e.calendar_meeting_types?.meeting_name}</div>
                <div className="opacity-90 truncate">{e.start_time.slice(0, 5)} · {STATUS_LABEL[e.status]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}