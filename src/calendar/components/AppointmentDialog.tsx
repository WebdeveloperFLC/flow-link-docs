import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useMeetingTypes, useCalendarProfile } from "../hooks/useCalendarData";
import { useCreateAppointment, useUpdateAppointment } from "../hooks/useAppointments";
import { addMinutesToTime } from "../lib/calendarApi";
import { APPOINTMENT_TYPES, type CalendarEventWithRelations } from "../lib/calendarTypes";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  event_title: z.string().trim().min(1, "Subject is required").max(200),
  appointment_type: z.string().trim().min(1, "Type is required").max(80),
  meeting_type_id: z.string().uuid("Pick a meeting type"),
  event_date: z.string().min(1, "Date required"),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Time required"),
  full_name: z.string().trim().min(1, "Name required").max(120),
  email: z.string().trim().email("Valid email required").max(255),
  mobile_number: z.string().trim().min(4, "Mobile required").max(40),
  company_name: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  edit?: CalendarEventWithRelations | null;
};

export function AppointmentDialog({ open, onOpenChange, initialDate, edit }: Props) {
  const { data: profile } = useCalendarProfile();
  const { data: meetingTypes } = useMeetingTypes();
  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const visitor = edit?.calendar_participants?.[0];

  const [form, setForm] = useState({
    event_title: "",
    appointment_type: "Consultation",
    meeting_type_id: "",
    event_date: initialDate ?? new Date().toISOString().slice(0, 10),
    start_time: "10:00",
    full_name: "",
    email: "",
    mobile_number: "",
    company_name: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setForm({
        event_title: edit.event_title ?? "",
        appointment_type: edit.appointment_type ?? "Consultation",
        meeting_type_id: edit.meeting_type_id,
        event_date: edit.event_date,
        start_time: edit.start_time.slice(0, 5),
        full_name: visitor?.full_name ?? "",
        email: visitor?.email ?? "",
        mobile_number: visitor?.mobile_number ?? "",
        company_name: visitor?.company_name ?? "",
        notes: edit.notes ?? "",
      });
    } else {
      setForm((f) => ({
        ...f,
        event_date: initialDate ?? new Date().toISOString().slice(0, 10),
        meeting_type_id: meetingTypes?.[0]?.id ?? "",
      }));
    }
  }, [open, edit, initialDate, meetingTypes]);

  const onSubmit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return toast.error(first ?? "Please review the form");
    }
    const mt = meetingTypes?.find((m) => m.id === form.meeting_type_id);
    if (!mt) return toast.error("Meeting type not found");
    const start = `${form.start_time}:00`;
    const end = addMinutesToTime(form.start_time, mt.slot_duration_minutes);
    try {
      if (edit) {
        await update.mutateAsync({
          id: edit.id,
          patch: {
            event_title: form.event_title,
            appointment_type: form.appointment_type,
            meeting_type_id: form.meeting_type_id,
            event_date: form.event_date,
            start_time: start,
            end_time: end,
            notes: form.notes || null,
          },
        });
        // Upsert participant
        if (visitor) {
          await (supabase as any).from("calendar_participants").update({
            full_name: form.full_name,
            email: form.email,
            mobile_number: form.mobile_number,
            company_name: form.company_name || null,
          }).eq("id", visitor.id);
        } else {
          await (supabase as any).from("calendar_participants").insert({
            event_id: edit.id,
            full_name: form.full_name,
            email: form.email,
            mobile_number: form.mobile_number,
            company_name: form.company_name || null,
          });
        }
        toast.success("Appointment updated");
      } else {
        await create.mutateAsync({
          meeting_type_id: form.meeting_type_id,
          event_title: form.event_title,
          appointment_type: form.appointment_type,
          event_date: form.event_date,
          start_time: start,
          end_time: end,
          host_timezone: profile?.timezone ?? "UTC",
          notes: form.notes || null,
          participant: {
            full_name: form.full_name,
            email: form.email,
            mobile_number: form.mobile_number,
            company_name: form.company_name || null,
          },
        });
        toast.success("Appointment created");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{edit ? "Edit appointment" : "New appointment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Subject *</Label>
              <Input value={form.event_title} onChange={(e) => setForm({ ...form, event_title: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.appointment_type} onValueChange={(v) => setForm({ ...form, appointment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meeting type *</Label>
              <Select value={form.meeting_type_id} onValueChange={(v) => setForm({ ...form, meeting_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
                <SelectContent>
                  {(meetingTypes ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.meeting_name} ({m.slot_duration_minutes}m)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div>
              <Label>Start time *</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">Attendee</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Full name *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Mobile *</Label>
                <Input value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={pending}>{pending ? "Saving…" : edit ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}