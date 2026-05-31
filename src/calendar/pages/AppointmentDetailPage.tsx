import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Pencil, CalendarClock, X, CheckCircle2, UserX, Mail, Phone, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  useAppointment, useAppointmentAudit, useInternalNotes, useAddInternalNote,
  useUpdateAppointment, useAppointmentReminders,
} from "../hooks/useAppointments";
import { AppointmentDialog } from "../components/AppointmentDialog";
import { RescheduleDialog } from "../components/RescheduleDialog";
import { CancelDialog } from "../components/CancelDialog";
import { STATUS_LABEL, type CalendarEventStatus } from "../lib/calendarTypes";
import { diffMinutes } from "../lib/calendarApi";

const statusVariant: Record<CalendarEventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", scheduled: "default", completed: "outline",
  cancelled: "destructive", declined: "destructive", no_show: "destructive",
};

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useAppointment(id);
  const { data: audit = [] } = useAppointmentAudit(id);
  const { data: notes = [] } = useInternalNotes(id);
  const { data: reminders = [] } = useAppointmentReminders(id);
  const addNote = useAddInternalNote();
  const update = useUpdateAppointment();
  const [noteBody, setNoteBody] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <AppLayout><div className="p-6">Loading…</div></AppLayout>;
  if (!event) return <AppLayout><div className="p-6">Appointment not found.</div></AppLayout>;

  const visitor = event.calendar_participants?.[0];
  const duration = diffMinutes(event.start_time, event.end_time);
  const canEdit = !["completed", "cancelled", "declined", "no_show"].includes(event.status);

  const setStatus = async (status: CalendarEventStatus, msg: string) => {
    try {
      await update.mutateAsync({ id: event.id, patch: { status } });
      toast.success(msg);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  const submitNote = async () => {
    if (!noteBody.trim()) return;
    try {
      await addNote.mutateAsync({ event_id: event.id, body: noteBody.trim() });
      setNoteBody("");
      toast.success("Note added");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-6">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/calendar"><ChevronLeft className="size-4 mr-1" /> Back to calendar</Link>
        </Button>
        <PageHeader
          title={event.event_title || event.calendar_meeting_types?.meeting_name || "Appointment"}
          description={`${event.event_reference ?? ""} · ${event.appointment_type ?? "Appointment"}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant[event.status]}>{STATUS_LABEL[event.status]}</Badge>
              {canEdit && <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><Pencil className="size-4 mr-1" /> Edit</Button>}
              {canEdit && <Button size="sm" variant="outline" onClick={() => setRescheduleOpen(true)}><CalendarClock className="size-4 mr-1" /> Reschedule</Button>}
              {event.status === "scheduled" && (
                <Button size="sm" variant="default" onClick={() => setStatus("completed", "Marked completed")}>
                  <CheckCircle2 className="size-4 mr-1" /> Complete
                </Button>
              )}
              {event.status === "scheduled" && (
                <Button size="sm" variant="outline" onClick={() => setStatus("no_show", "Marked no show")}>
                  <UserX className="size-4 mr-1" /> No show
                </Button>
              )}
              {canEdit && <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}><X className="size-4 mr-1" /> Cancel</Button>}
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {visitor ? (
                <>
                  <div className="font-medium">{visitor.full_name}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="size-3.5" /> {visitor.email}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="size-3.5" /> {visitor.mobile_number}</div>
                  {visitor.company_name && (
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="size-3.5" /> {visitor.company_name}</div>
                  )}
                </>
              ) : <div className="text-muted-foreground">No participant attached.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Appointment</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">Date: </span>{format(parseISO(event.event_date), "EEE, MMM d, yyyy")}</div>
              <div><span className="text-muted-foreground">Time: </span>{event.start_time.slice(0, 5)} – {event.end_time.slice(0, 5)} ({duration}m)</div>
              <div><span className="text-muted-foreground">Type: </span>{event.appointment_type ?? "—"}</div>
              <div><span className="text-muted-foreground">Meeting: </span>{event.calendar_meeting_types?.meeting_name}</div>
              <div><span className="text-muted-foreground">Timezone: </span>{event.host_timezone}</div>
              {event.cancellation_reason && (
                <div className="pt-2 text-destructive"><span className="font-medium">Cancellation:</span> {event.cancellation_reason}</div>
              )}
              {event.notes && (
                <div className="pt-2"><span className="text-muted-foreground">Notes: </span>{event.notes}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Reminders</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {reminders.length === 0 && <div className="text-muted-foreground">No reminders yet.</div>}
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <div>{r.channel}</div>
                  <Badge variant={r.status === "sent" ? "outline" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Internal notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <Textarea rows={2} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a private note for staff…" />
              <div className="flex justify-end">
                <Button size="sm" onClick={submitNote} disabled={addNote.isPending || !noteBody.trim()}>Add note</Button>
              </div>
            </div>
            <div className="space-y-2">
              {notes.length === 0 && <div className="text-sm text-muted-foreground">No internal notes yet.</div>}
              {notes.map((n) => (
                <div key={n.id} className="rounded-md border p-2 text-sm">
                  <div className="whitespace-pre-wrap">{n.body}</div>
                  <div className="text-xs text-muted-foreground mt-1">{format(parseISO(n.created_at), "MMM d, yyyy · HH:mm")}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Activity timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {audit.length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
              {audit.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <span className="text-muted-foreground">{a.from_status ? `${STATUS_LABEL[a.from_status]} → ` : ""}</span>
                    <span className="font-medium">{STATUS_LABEL[a.to_status]}</span>
                    <span className="text-xs text-muted-foreground ml-2">by {a.actor_kind}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{format(parseISO(a.at), "MMM d, yyyy · HH:mm")}</div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <AppointmentDialog open={editOpen} onOpenChange={setEditOpen} edit={event} />
        <RescheduleDialog open={rescheduleOpen} onOpenChange={setRescheduleOpen} event={event} />
        <CancelDialog open={cancelOpen} onOpenChange={setCancelOpen} event={event} />
      </div>
    </AppLayout>
  );
}