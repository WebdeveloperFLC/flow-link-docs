import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Video, Phone, MapPin } from "lucide-react";

type Appt = { id: string; title: string; scheduled_at: string; duration_min: number; mode: string; status: string; notes: string|null };

export default function PortalAppointments() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : null}/>;
}
function Inner({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Counseling session");
  const [date, setDate] = useState(""); const [mode, setMode] = useState("video"); const [notes, setNotes] = useState("");
  const load = async () => {
    const { data } = await supabase.from("client_appointments").select("*").eq("client_id", clientId).order("scheduled_at",{ascending:false});
    setAppts((data ?? []) as Appt[]);
  };
  useEffect(() => { load(); }, [clientId]);
  const book = async () => {
    if (!date) { toast.error("Pick a date and time"); return; }
    const { error } = await supabase.from("client_appointments").insert({
      client_id: clientId, title, scheduled_at: new Date(date).toISOString(), mode, notes, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment requested");
    setOpen(false); setTitle("Counseling session"); setDate(""); setMode("video"); setNotes(""); load();
  };
  const ICON: Record<string, typeof Video> = { video: Video, phone: Phone, in_person: MapPin };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Appointments</h1></div>
        <Button onClick={()=>setOpen(true)}><Plus className="size-4 mr-1.5"/>Book Appointment</Button>
      </div>
      <div className="space-y-3">
        {appts.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No appointments yet.</Card>}
        {appts.map((a) => {
          const I = ICON[a.mode] || Video;
          return (
            <Card key={a.id} className="p-4 flex items-center gap-4">
              <I className="size-6 text-primary"/>
              <div className="flex-1">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(a.scheduled_at).toLocaleString()} · {a.duration_min} min · {a.mode.replace("_"," ")}</div>
                {a.notes && <div className="text-xs mt-1">{a.notes}</div>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${a.status==="confirmed"?"bg-emerald-500/15 text-emerald-700":a.status==="cancelled"?"bg-red-500/15 text-red-700":"bg-amber-500/15 text-amber-700"}`}>{a.status}</span>
            </Card>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e)=>setTitle(e.target.value)}/></div>
            <div><Label>Date & time</Label><Input type="datetime-local" value={date} onChange={(e)=>setDate(e.target.value)}/></div>
            <div><Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video call</SelectItem>
                  <SelectItem value="phone">Phone call</SelectItem>
                  <SelectItem value="in_person">In person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={notes} onChange={(e)=>setNotes(e.target.value)}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={book}>Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
