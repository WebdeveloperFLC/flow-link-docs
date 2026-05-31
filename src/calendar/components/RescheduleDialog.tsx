import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUpdateAppointment } from "../hooks/useAppointments";
import { addMinutesToTime, diffMinutes } from "../lib/calendarApi";
import type { CalendarEventWithRelations } from "../lib/calendarTypes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEventWithRelations;
};

export function RescheduleDialog({ open, onOpenChange, event }: Props) {
  const update = useUpdateAppointment();
  const duration = diffMinutes(event.start_time, event.end_time);
  const [date, setDate] = useState(event.event_date);
  const [time, setTime] = useState(event.start_time.slice(0, 5));

  const onSubmit = async () => {
    try {
      await update.mutateAsync({
        id: event.id,
        patch: {
          event_date: date,
          start_time: `${time}:00`,
          end_time: addMinutesToTime(time, duration),
        },
      });
      toast.success("Appointment rescheduled");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Reschedule failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>New date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>New start time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Duration ({duration} minutes) preserved. Availability and conflicts are validated.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={update.isPending}>Reschedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}