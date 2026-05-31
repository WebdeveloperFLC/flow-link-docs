import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { usePendingApprovals, useApproveAppointment, useDeclineAppointment } from "../hooks/useApprovals";
import { format } from "date-fns";

export default function AppointmentApprovalsPage() {
  const { data: pending = [], isLoading } = usePendingApprovals();
  const approve = useApproveAppointment();
  const decline = useDeclineAppointment();

  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const doApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast.success("Appointment confirmed");
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

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pending approvals</h1>
          <p className="text-sm text-muted-foreground">Review booking requests awaiting confirmation.</p>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6">Loading…</CardContent></Card>
        ) : pending.length === 0 ? (
          <Card><CardContent className="p-6 text-muted-foreground">No pending approvals.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pending.map((ev: any) => {
              const visitor = ev.calendar_participants?.[0];
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
                      <Badge variant="outline">Pending</Badge>
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
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDeclineFor(ev.id)}>
                        <X className="h-4 w-4 mr-1" /> Decline
                      </Button>
                      <Button size="sm" onClick={() => doApprove(ev.id)}>
                        <Check className="h-4 w-4 mr-1" /> Confirm
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

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