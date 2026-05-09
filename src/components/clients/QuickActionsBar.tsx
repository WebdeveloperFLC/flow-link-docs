import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, MessageCircle, Mail, StickyNote, ListTodo, ArrowRightLeft, Upload, Flame, Snowflake, Thermometer } from "lucide-react";
import { CallClientButton } from "./CallClientButton";
import { HandoffDialog } from "./HandoffDialog";
import { AddRemarkDialog } from "./AddRemarkDialog";
import { AddTaskDialog } from "./AddTaskDialog";
import { useAuth } from "@/contexts/AuthContext";
import { applyContactMask } from "@/lib/masking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuickActionsBar({ clientId, clientName, phone, email, onUpload }: {
  clientId: string;
  clientName?: string;
  phone?: string | null;
  email?: string | null;
  onUpload?: () => void;
}) {
  const { hasRole } = useAuth();
  const isTelecaller = hasRole("telecaller") && !hasRole(["admin","counselor","documentation"]);
  const masked = applyContactMask({ phone, email, mask: isTelecaller });
  const cleanPhone = (phone ?? "").replace(/\D/g, "");

  const [handoff, setHandoff] = useState(false);
  const [remark, setRemark] = useState(false);
  const [task, setTask] = useState(false);

  const setLeadStatus = async (status: "hot" | "warm" | "cold") => {
    const { data: queue } = await supabase
      .from("call_queue_items")
      .select("id")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (queue?.id) {
      const { error } = await supabase.from("call_queue_items").update({ lead_status: status } as never).eq("id", queue.id);
      if (error) { toast.error(error.message); return; }
    }
    await supabase.from("client_timeline").insert({
      client_id: clientId,
      event_type: "note",
      summary: `Lead marked ${status}`,
      metadata: { lead_status: status } as never,
    });
    toast.success(`Marked ${status}`);
  };

  return (
    <Card className="p-3 flex flex-wrap items-center gap-2 sticky top-2 z-10 shadow-elev-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">Quick actions</div>
      <CallClientButton clientId={clientId} />
      {!isTelecaller && phone && (
        <Button asChild size="sm" variant="outline">
          <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer"><MessageCircle className="size-3.5 mr-1" /> WhatsApp</a>
        </Button>
      )}
      {!isTelecaller && email && (
        <Button asChild size="sm" variant="outline">
          <a href={`mailto:${email}`}><Mail className="size-3.5 mr-1" /> Email</a>
        </Button>
      )}
      {isTelecaller && (
        <span className="text-[11px] text-muted-foreground border rounded px-2 py-1">
          {masked.phone || "—"}{masked.email ? ` · ${masked.email}` : ""}
        </span>
      )}
      <Button size="sm" variant="outline" onClick={() => setRemark(true)}><StickyNote className="size-3.5 mr-1" /> Note</Button>
      <Button size="sm" variant="outline" onClick={() => setTask(true)}><ListTodo className="size-3.5 mr-1" /> Task</Button>
      <Button size="sm" variant="outline" onClick={() => setHandoff(true)}><ArrowRightLeft className="size-3.5 mr-1" /> Hand off</Button>
      {onUpload && (
        <Button size="sm" variant="outline" onClick={onUpload}><Upload className="size-3.5 mr-1" /> Upload</Button>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="ghost" className={cn("text-destructive hover:bg-destructive/10")} onClick={() => setLeadStatus("hot")}><Flame className="size-3.5 mr-1" /> Hot</Button>
        <Button size="sm" variant="ghost" className="text-amber-600 hover:bg-amber-500/10" onClick={() => setLeadStatus("warm")}><Thermometer className="size-3.5 mr-1" /> Warm</Button>
        <Button size="sm" variant="ghost" className="text-sky-600 hover:bg-sky-500/10" onClick={() => setLeadStatus("cold")}><Snowflake className="size-3.5 mr-1" /> Cold</Button>
      </div>
      <HandoffDialog open={handoff} onOpenChange={setHandoff} clientId={clientId} clientName={clientName} />
      <AddRemarkDialog open={remark} onOpenChange={setRemark} clientId={clientId} />
      <AddTaskDialog open={task} onOpenChange={setTask} clientId={clientId} />
    </Card>
  );
}
