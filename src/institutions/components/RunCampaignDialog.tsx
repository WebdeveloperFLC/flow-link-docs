import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Search, Send, Sparkles } from "lucide-react";

type Promo = { id: string; title: string; promo_type?: string | null };
type Client = { id: string; full_name: string; email: string | null; phone: string | null };
type Member = { id: string; full_name: string | null; email: string | null };

export function RunCampaignDialog({
  open, onOpenChange, institutionId, promotion, onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institutionId: string;
  promotion: Promo | null;
  onSent?: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [senderId, setSenderId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set()); setSearch("");
    (async () => {
      const [c, m, me] = await Promise.all([
        supabase.from("clients").select("id,full_name,email,phone").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id,full_name,email").eq("status", "active").order("full_name"),
        supabase.auth.getUser(),
      ]);
      setClients((c.data ?? []) as Client[]);
      setMembers((m.data ?? []) as Member[]);
      if (me.data?.user) setSenderId(me.data.user.id);
      if (promotion && !subject) setSubject(promotion.title);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, promotion?.id]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.full_name, c.email, c.phone].some((v) => v?.toLowerCase().includes(q))
    );
  }, [search, clients]);

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const generate = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("upi-generate-content", {
      body: {
        institution_id: institutionId,
        channel,
        context_flags: { programs: true, promotions: true, commission: false },
        tone: "warm",
        promotion_title: promotion?.title,
      },
    });
    setGenerating(false);
    if (error) return toast.error(error.message);
    setBody((data as any)?.content ?? "");
  };

  const send = async () => {
    if (selected.size === 0) return toast.error("Pick at least one recipient");
    if (!subject.trim() || !body.trim()) return toast.error("Subject and body required");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("upi-run-campaign", {
      body: {
        institution_id: institutionId,
        promotion_id: promotion?.id ?? null,
        channel,
        subject,
        body_html: body,
        sender_user_id: senderId,
        recipient_client_ids: Array.from(selected),
      },
    });
    setBusy(false);
    if (error) return toast.error(`Campaign failed: ${error.message}`);
    const res = data as { sent?: number; failed?: number };
    if ((res?.failed ?? 0) > 0) {
      toast.warning(`Sent ${res?.sent ?? 0}, failed ${res?.failed ?? 0}`);
    } else {
      toast.success(`Sent to ${res?.sent ?? 0} recipient(s)`);
    }
    onSent?.(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run campaign {promotion ? `— ${promotion.title}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp" disabled>WhatsApp (coming soon)</SelectItem>
                  <SelectItem value="sms" disabled>SMS (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Send as (signature)</Label>
              <Select value={senderId} onValueChange={setSenderId}>
                <SelectTrigger><SelectValue placeholder="Pick teammate" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name || m.email || m.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Message</Label>
              <Button size="sm" variant="outline" onClick={generate} disabled={generating}>
                <Sparkles className="size-3 mr-1" /> {generating ? "Generating…" : "AI generate"}
              </Button>
            </div>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="HTML or plain text. Your signature will be appended automatically." />
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Recipients <Badge variant="secondary" className="ml-1">{selected.size} selected</Badge></Label>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input className="pl-7 h-8" placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="h-56 border rounded">
              <div className="divide-y">
                {filteredClients.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-accent/40 cursor-pointer">
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.email ?? "no email"} · {c.phone ?? "—"}</div>
                    </div>
                  </label>
                ))}
                {filteredClients.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No clients match.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={busy}>
            <Send className="size-4 mr-1" /> {busy ? "Sending…" : `Send to ${selected.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}