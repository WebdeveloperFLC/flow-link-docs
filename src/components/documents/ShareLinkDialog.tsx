import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

type Target = { type: "document" | "binder"; id: string; label: string };

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "24", label: "1 day" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" },
];

const randomToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, "").slice(0, 32);
};

export const ShareLinkDialog = ({
  open, onOpenChange, target,
}: { open: boolean; onOpenChange: (o: boolean) => void; target: Target | null }) => {
  const [hours, setHours] = useState("24");
  const [maxViews, setMaxViews] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const token = randomToken();
      const expires_at = new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("share_links").insert({
        target_type: target.type,
        target_id: target.id,
        token,
        expires_at,
        max_views: maxViews ? Number(maxViews) : null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      const url = `${window.location.origin}/share/${token}`;
      setLink(url);
      await logActivity("share.created", target.type, target.id, { expires_at, max_views: maxViews || null });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to create link");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const reset = () => { setLink(null); setHours("24"); setMaxViews(""); };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="size-4" />Create shareable link</DialogTitle>
        </DialogHeader>
        {!link ? (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Sharing: <b className="text-foreground">{target?.label}</b>
            </div>
            <div className="space-y-1.5">
              <Label>Expires after</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPIRY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Max views <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="number" min={1} value={maxViews} onChange={(e) => setMaxViews(e.target.value)} placeholder="Unlimited" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={create} disabled={busy} className="gradient-brand text-primary-foreground">
                {busy ? "Creating…" : "Create link"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-success font-medium">Link ready · expires in {EXPIRY_OPTIONS.find(o => o.value === hours)?.label}</div>
            <div className="flex gap-2">
              <Input value={link} readOnly className="text-xs font-mono" onFocus={(e) => e.target.select()} />
              <Button onClick={copy} variant="outline" size="icon">
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Anyone with this link can view the file until it expires{maxViews ? ` or after ${maxViews} views` : ""}. You can revoke it from the activity log.</p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};