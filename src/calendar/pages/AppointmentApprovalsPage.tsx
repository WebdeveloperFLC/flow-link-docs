import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { usePendingApprovals, useApproveAppointment, useDeclineAppointment, useApproveReschedule } from "../hooks/useApprovals";
import { format } from "date-fns";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending approval",
  awaiting_requester: "Awaiting requester",
  reschedule_requested: "Reschedule requested",
  rescheduled_awaiting: "Awaiting requester (rescheduled)",
  confirmed: "Confirmed by requester",
  declined_by_requester: "Declined by requester",
  declined: "Declined by host",
};

export default function AppointmentApprovalsPage() {
  const { data: pending = [], isLoading } = usePendingApprovals();
  const approve = useApproveAppointment();
  const decline = useDeclineAppointment();
  const reschedule = useApproveReschedule();

  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [approveFor, setApproveFor] = useState<any | null>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [approveRemarks, setApproveRemarks] = useState("");
  const [reschedFor, setReschedFor] = useState<any | null>(null);
  const [rDate, setRDate] = useState(""); const [rStart, setRStart] = useState(""); const [rEnd, setREnd] = useState("");

  const doApprove = async () => {
    if (!approveFor) return;
    if (!/^https?:\/\//i.test(meetingLink)) { toast.error("Enter a valid meeting URL (https://…)"); return; }
    try {
      await approve.mutateAsync({ eventId: approveFor.id, meetingLink, remarks: approveRemarks || undefined });
      toast.success("Approved — confirmation email sent to requester");
      setApproveFor(null); setMeetingLink(""); setApproveRemarks("");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const doDecline = async () => {
    if (!declineFor) return;
    try {
      await decline.mutateAsync({ eventId: declineFor, reason: reason || "Declined by host" });
      toast.success("Appointment declined");
      setDeclineFor(null); setReason("");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const doResched = async () => {
    if (!reschedFor || !rDate || !rStart || !rEnd) { toast.error("Pick a date and start/end time"); return; }
    try {
      await reschedule.mutateAsync({ eventId: reschedFor.id, eventDate: rDate, startTime: rStart, endTime: rEnd, meetingLink: reschedFor.meeting_link ?? undefined });
      toast.success("New time proposed — email sent to requester");
      setReschedFor(null); setRDate(""); setRStart(""); setREnd("");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-sm text-muted-foreground">Review pending requests and track requester confirmations.</p>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6">Loading…</CardContent></Card>
        ) : pending.length === 0 ? (
          <Card><CardContent className="p-6 text-muted-foreground">No pending approvals.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pending.map((ev: any) => {
              const visitor = ev.calendar_participants?.[0];
              const isPending = ev.status === "pending";
              const isResched = ev.status === "reschedule_requested";
              return (
                <Card key={ev.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          {ev.calendar_meeting_types?.meeting_name ?? "Meeting"} ·{" "}
                          <span className="text-xs font-mono text-muted-foreground">{ev.event_reference}</span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(`${ev.event_date}T${ev.start_time}`), "EEE, dd MMM yyyy · HH:mm")} – {ev.end_time?.slice(0, 5)}
                        </p>
                      </div>
                      <Badge variant="outline">{STATUS_LABEL[ev.status] ?? ev.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visitor && (
                      <div className="text-sm">
                        <span className="font-medium">{visitor.full_name}</span>{" "}
                        <span className="text-muted-foreground">· {visitor.email} · {visitor.mobile_number}</span>
                      </div>
                    )}
                    {ev.notes && <p className="text-sm">{ev.notes}</p>}
                    {ev.reschedule_reason && (
                      <p className="text-sm text-muted-foreground"><b>Reschedule note:</b> {ev.reschedule_reason}</p>
                    )}
                    {ev.meeting_link && (
                      <p className="text-xs"><b>Meeting link:</b> <a href={ev.meeting_link} target="_blank" rel="noreferrer" className="text-primary underline break-all">{ev.meeting_link}</a></p>
                    )}
                    <div className="flex justify-end gap-2">
                      {isPending && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setDeclineFor(ev.id)}>
                            <X className="h-4 w-4 mr-1" /> Decline
                          </Button>
                          <Button size="sm" onClick={() => { setApproveFor(ev); setMeetingLink(""); setApproveRemarks(""); }}>
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                        </>
                      )}
                      {isResched && (
                        <Button size="sm" onClick={() => { setReschedFor(ev); setRDate(ev.event_date); setRStart(ev.start_time?.slice(0,5)); setREnd(ev.end_time?.slice(0,5)); }}>
                          <CalendarClock className="h-4 w-4 mr-1" /> Propose new time
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!approveFor} onOpenChange={(o) => !o && setApproveFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Approve appointment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Meeting link *</Label>
                <Input placeholder="https://meet.google.com/… or Zoom/Teams URL" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
              </div>
              <div>
                <Label>Remarks (optional)</Label>
                <Textarea rows={3} value={approveRemarks} onChange={(e) => setApproveRemarks(e.target.value)} placeholder="Anything the requester should know before the meeting" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveFor(null)}>Cancel</Button>
              <Button onClick={doApprove}>Approve & email requester</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!reschedFor} onOpenChange={(o) => !o && setReschedFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Propose new time</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Date</Label><Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="time" value={rStart} onChange={(e) => setRStart(e.target.value)} /></div>
                <div><Label>End</Label><Input type="time" value={rEnd} onChange={(e) => setREnd(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReschedFor(null)}>Cancel</Button>
              <Button onClick={doResched}>Send to requester</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!declineFor} onOpenChange={(o) => !o && setDeclineFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline appointment</DialogTitle>
            </DialogHeader>
            <Textarea
              placeholder="Optional reason for visitor"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclineFor(null)}>Cancel</Button>
              <Button variant="destructive" onClick={doDecline}>Decline</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}