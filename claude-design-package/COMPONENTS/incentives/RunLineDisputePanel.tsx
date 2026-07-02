import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, MessageSquare, Send } from "lucide-react";

interface DisputeMessage {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface DisputeRow {
  dispute_id: string;
  line_item_id: string;
  counselor_id: string;
  counselor_name: string;
  subject: string | null;
  status: string;
  messages: DisputeMessage[];
}

interface Props {
  lineItemId: string;
  counselorId: string;
  counselorName: string;
  disputes: DisputeRow[];
  onReload: () => Promise<void>;
}

export function RunLineDisputePanel({
  lineItemId,
  counselorId,
  counselorName,
  disputes,
  onReload,
}: Props) {
  const { toast } = useToast();
  const { user, isAdmin, hasRole } = useAuth();
  const isStaff = isAdmin || hasRole(["manager", "administrator"]);
  const isOwner = user?.id === counselorId;
  const dispute = disputes.find((d) => d.line_item_id === lineItemId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState({ subject: "", body: "" });
  const [reply, setReply] = useState("");

  useEffect(() => {
    if (dispute?.status === "open") setOpen(true);
  }, [dispute?.status]);

  if (!isOwner && !isStaff && !dispute) return null;

  async function openDispute() {
    if (!openForm.body.trim()) {
      toast({ title: "Describe your query", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("fn_open_run_item_dispute", {
        _line_item_id: lineItemId,
        _body: openForm.body.trim(),
        _subject: openForm.subject.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Dispute opened" });
      setOpenForm({ subject: "", body: "" });
      setOpen(true);
      await onReload();
    } catch (e) {
      toast({
        title: "Could not open dispute",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!dispute || !reply.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("fn_reply_run_item_dispute", {
        _dispute_id: dispute.dispute_id,
        _body: reply.trim(),
      });
      if (error) throw error;
      setReply("");
      await onReload();
    } catch (e) {
      toast({
        title: "Reply failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function resolveDispute() {
    if (!dispute) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("fn_resolve_run_item_dispute", {
        _dispute_id: dispute.dispute_id,
      });
      if (error) throw error;
      toast({ title: "Dispute resolved" });
      await onReload();
    } catch (e) {
      toast({
        title: "Resolve failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1">
      {!dispute && isOwner && (
        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setOpen((v) => !v)}>
          <MessageSquare className="size-3 mr-1" /> Query line
        </Button>
      )}
      {dispute && (
        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setOpen((v) => !v)}>
          <MessageSquare className="size-3 mr-1" />
          {dispute.status === "open" ? "Open dispute" : "Resolved dispute"}
        </Button>
      )}

      {open && (
        <div className="mt-2 border rounded-md p-3 bg-muted/20 space-y-2 max-w-md">
          {!dispute ? (
            <>
              <p className="text-xs text-muted-foreground">
                Ask finance to review this line for {counselorName}.
              </p>
              <Input
                className="h-8 text-xs"
                placeholder="Subject (optional)"
                value={openForm.subject}
                onChange={(e) => setOpenForm({ ...openForm, subject: e.target.value })}
              />
              <Input
                className="h-8 text-xs"
                placeholder="Your question…"
                value={openForm.body}
                onChange={(e) => setOpenForm({ ...openForm, body: e.target.value })}
              />
              <Button size="sm" className="h-8" onClick={openDispute} disabled={busy}>
                Submit query
              </Button>
            </>
          ) : (
            <>
              {dispute.subject && <p className="text-xs font-medium">{dispute.subject}</p>}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {dispute.messages.map((m) => (
                  <div key={m.id} className="text-xs border rounded px-2 py-1.5 bg-background">
                    <span className="font-medium">{m.author_name}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                    <p className="mt-1">{m.body}</p>
                  </div>
                ))}
              </div>
              {dispute.status === "open" && (
                <div className="flex gap-2">
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder="Reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  />
                  <Button size="sm" className="h-8" onClick={sendReply} disabled={busy}>
                    <Send className="size-3" />
                  </Button>
                  {isStaff && (
                    <Button size="sm" variant="outline" className="h-8" onClick={resolveDispute} disabled={busy}>
                      <CheckCircle className="size-3 mr-1" /> Resolve
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
