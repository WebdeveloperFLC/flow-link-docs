import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUpdateAppointment } from "../hooks/useAppointments";
import type { CalendarEventWithRelations } from "../lib/calendarTypes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEventWithRelations;
};

export function CancelDialog({ open, onOpenChange, event }: Props) {
  const update = useUpdateAppointment();
  const [reason, setReason] = useState("");

  const onSubmit = async () => {
    if (!reason.trim()) return toast.error("Please provide a reason");
    try {
      await update.mutateAsync({ id: event.id, patch: { status: "cancelled", cancellation_reason: reason.trim() } });
      toast.success("Appointment cancelled");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Cancel failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Cancellation reason *</Label>
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being cancelled?" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep appointment</Button>
          <Button variant="destructive" onClick={onSubmit} disabled={update.isPending}>Cancel appointment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}