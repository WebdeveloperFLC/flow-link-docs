import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { notifyUsers, type NotificationSeverity } from "@/lib/appNotifications";
import { toast } from "sonner";
import { Megaphone, Loader2 } from "lucide-react";

const ROLES = ["all", "admin", "counselor", "telecaller", "documentation", "viewer"] as const;
type RoleTarget = (typeof ROLES)[number];

/**
 * Admin-only broadcast composer. Targets all staff or a specific role.
 * Uses the same fire-and-forget `notifyUsers` path — does not touch payments,
 * email, SMTP, RLS, or accounting flows.
 */
export function AdminBroadcastDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [target, setTarget] = useState<RoleTarget>("all");
  const [severity, setSeverity] = useState<NotificationSeverity>("info");
  const [sound, setSound] = useState(false);
  const [sending, setSending] = useState(false);

  const reset = () => {
    setTitle(""); setBody(""); setLink("");
    setTarget("all"); setSeverity("info"); setSound(false);
  };

  const send = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSending(true);
    try {
      let query = supabase.from("user_roles").select("user_id");
      if (target !== "all") {
        query = query.eq("role", target as any);
      }
      const { data, error } = await query;
      if (error) throw error;
      const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean)));
      if (userIds.length === 0) {
        toast.warning("No recipients matched that role");
        return;
      }
      const broadcastId = crypto.randomUUID();
      await notifyUsers({
        userIds,
        category: sound ? "urgent_review_required" : "info",
        severity,
        title: title.trim(),
        body: body.trim() || null,
        link: link.trim() || null,
        entityType: "broadcast",
        dedupeKey: `broadcast:${broadcastId}`,
        metadata: { broadcast: true, target, broadcast_id: broadcastId, play_sound: sound },
      });
      toast.success(`Broadcast sent to ${userIds.length} ${userIds.length === 1 ? "user" : "users"}`);
      console.info("[notif] broadcast_sent", { target, recipients: userIds.length, severity });
      reset();
      setOpen(false);
    } catch (e: any) {
      console.warn("[notif] broadcast_failed", e?.message);
      toast.error("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Megaphone className="size-3.5" /> Broadcast
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-4" /> Send announcement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="bc-title">Title</Label>
            <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Scheduled maintenance tonight" />
          </div>
          <div>
            <Label htmlFor="bc-body">Message</Label>
            <Textarea id="bc-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Optional details…" />
          </div>
          <div>
            <Label htmlFor="bc-link">Deep link (optional)</Label>
            <Input id="bc-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/settings or /clients/abc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Audience</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as RoleTarget)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r === "all" ? "All staff" : r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as NotificationSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={sound} onCheckedChange={(v) => setSound(Boolean(v))} />
            Play notification sound for recipients
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
          <Button onClick={send} disabled={sending || !title.trim()}>
            {sending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Send broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}