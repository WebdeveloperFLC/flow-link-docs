import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserPlus, Play, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { listCountries, listPathways, countryNameFor, type Country, type Pathway } from "@/lib/settleAbroad";

type Client = { id: string; full_name: string; email: string | null; phone: string | null; country: string | null };

export function StartAssessmentDialog({
  open, onOpenChange, onStarted,
}: { open: boolean; onOpenChange: (b: boolean) => void; onStarted?: (sessionId: string) => void }) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [countryCode, setCountryCode] = useState("CA");
  const [goal, setGoal] = useState("permanent_residence");
  const [countries, setCountries] = useState<Country[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [busy, setBusy] = useState(false);

  // existing
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  // new
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("India");

  useEffect(() => {
    if (!open) return;
    supabase.from("clients").select("id, full_name, email, phone, country").order("created_at", { ascending: false }).limit(100)
      .then((r) => setClients((r.data ?? []) as Client[]));
    listCountries().then((c) => setCountries(c.filter((x) => x.status === "active")));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listPathways(countryCode).then((p) => {
      setPathways(p);
      if (p.length && !p.find((x) => x.pathway_code === goal)) setGoal(p[0].pathway_code);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) => `${c.full_name} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(t));
  }, [clients, q]);

  const start = async () => {
    setBusy(true);
    try {
      const body: any = { goal, country: countryNameFor(countryCode) };
      if (tab === "existing") {
        if (!picked) { toast.error("Pick a client"); setBusy(false); return; }
        body.clientId = picked;
      } else {
        if (!name.trim()) { toast.error("Client name is required"); setBusy(false); return; }
        body.newClient = { full_name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, country: country.trim() || "India", application_type: `${countryNameFor(countryCode)} — assessment` };
      }
      const { data, error } = await supabase.functions.invoke("assessment-session-create", { body });
      if (error || (data as any)?.error) {
        toast.error(error?.message ?? (data as any)?.error ?? "Failed");
        setBusy(false); return;
      }
      const sessionId = (data as any).sessionId as string;
      toast.success("Assessment started");
      onOpenChange(false);
      onStarted?.(sessionId);
      window.open(`/assessment/run/${sessionId}`, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start new Settle Abroad assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Destination country</Label>
              <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-full h-9 mt-1 rounded-md border bg-background px-2 text-sm">
                {countries.map((c) => <option key={c.code} value={c.code}>{c.flag_emoji ?? ""} {c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Pathway</Label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full h-9 mt-1 rounded-md border bg-background px-2 text-sm">
                {pathways.map((p) => <option key={p.pathway_code} value={p.pathway_code}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="existing"><Users className="size-3.5 mr-1.5" />Existing client</TabsTrigger>
              <TabsTrigger value="new"><UserPlus className="size-3.5 mr-1.5" />New client</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-2 pt-3">
              <div className="relative">
                <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, or phone" className="pl-9" />
              </div>
              <div className="border rounded-md max-h-72 overflow-auto">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No clients match.</div>
                ) : filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setPicked(c.id)}
                    className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/50 ${picked === c.id ? "bg-primary/10" : ""}`}
                  >
                    <div className="font-medium text-sm">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">{[c.email, c.phone, c.country].filter(Boolean).join(" · ") || "—"}</div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-3 pt-3">
              <div className="space-y-1.5"><Label>Full name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
              <p className="text-xs text-muted-foreground">Email is optional — you can run the assessment manually without sending an invite.</p>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={start} disabled={busy}>
              {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Play className="size-4 mr-1.5" />}
              Start assessment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}