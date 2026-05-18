import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { addClient } from "../../stores/clientsStore";
import type { Client, ClientType } from "../../types/clients";
import DynamicSelect from "../shared/DynamicSelect";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (c: Client) => void;
}

export default function AddClientDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [clientType, setClientType] = useState<string>("STUDENT");
  const [country, setCountry] = useState("CA");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");

  const [counselorId, setCounselorId] = useState<string>("");
  const [counselors, setCounselors] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [counselorsLoading, setCounselorsLoading] = useState(true);
  const [servicePackage, setServicePackage] = useState<string>("");
  const [visaCategory, setVisaCategory] = useState<string>("");
  const [intake, setIntake] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("DUE_ON_RECEIPT");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setCounselorsLoading(true);
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["counselor", "admin"] as any);
      const ids = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
      if (ids.length === 0) {
        if (!cancelled) { setCounselors([]); setCounselorsLoading(false); }
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const roleByUser = new Map<string, string>();
      (roleRows ?? []).forEach((r: any) => {
        // prefer "counselor" label if user has both
        if (!roleByUser.has(r.user_id) || r.role === "counselor") roleByUser.set(r.user_id, r.role);
      });
      const list = (profiles ?? []).map((p: any) => ({
        id: p.id,
        name: p.full_name || p.email || "(unnamed)",
        role: roleByUser.get(p.id) ?? "user",
      }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      if (!cancelled) {
        setCounselors(list);
        setCounselorsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handleSave = () => {
    if (!name.trim()) { toast.error("Client name is required"); return; }
    const counselor = counselors.find(s => s.id === counselorId);
    const created: Client = {
      id: `c-${Date.now()}`,
      name, legalName: name,
      segment: clientType === "CORPORATE" ? "ENTERPRISE" : "INDIVIDUAL",
      clientType: clientType as ClientType,
      country, taxId: taxId || "—",
      paymentTerms,
      currency: country === "CA" ? "CAD" : country === "US" ? "USD" : "INR",
      status: "ACTIVE",
      outstandingReceivable: 0, ytdRevenue: 0,
      lastTxnDate: new Date().toISOString().slice(0, 10),
      email, phone, address: "",
      accountManager: counselor?.name ?? "",
      counselorId, counselorName: counselor?.name,
      servicePackage, visaCategory, intake, leadSource, notes,
    };
    const persisted = addClient(created);
    onCreated?.(persisted);
    toast.success(`Client "${name}" created`);
    onOpenChange(false);
    setName(""); setEmail(""); setPhone(""); setTaxId(""); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add new client</DialogTitle>
          <DialogDescription>Create an accounting client record. Use "Link CRM client" if they already exist in the CRM.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Basic</div>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cname">Full name</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anita Ramachandran" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Client type</Label>
                  <DynamicSelect listKey="client_categories" value={clientType} onValueChange={setClientType} addLabel="client type" />
                </div>
                <div className="grid gap-2">
                  <Label>Country</Label>
                  <DynamicSelect listKey="countries" value={country} onValueChange={setCountry} addLabel="country" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cemail">Email</Label>
                  <Input id="cemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cphone">Phone</Label>
                  <Input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="ctax">Tax ID (optional)</Label>
                  <Input id="ctax" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Business</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Assigned counselor</Label>
                <Select value={counselorId} onValueChange={setCounselorId} disabled={counselorsLoading || counselors.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      counselorsLoading ? "Loading…"
                      : counselors.length === 0 ? "No counselors found — add users first"
                      : "Select a counselor"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {counselors.map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Service package <span className="text-xs text-muted-foreground font-normal">(type to add new)</span></Label>
                <DynamicSelect listKey="service_packages" value={servicePackage} onValueChange={setServicePackage} addLabel="service package" />
              </div>
              <div className="grid gap-2">
                <Label>Visa category <span className="text-xs text-muted-foreground font-normal">(type to add new)</span></Label>
                <DynamicSelect listKey="visa_categories" value={visaCategory} onValueChange={setVisaCategory} addLabel="visa category" />
              </div>
              <div className="grid gap-2">
                <Label>Intake / session <span className="text-xs text-muted-foreground font-normal">(type to add new)</span></Label>
                <DynamicSelect listKey="intakes" value={intake} onValueChange={setIntake} addLabel="intake" />
              </div>
              <div className="grid gap-2">
                <Label>Lead source <span className="text-xs text-muted-foreground font-normal">(type to add new)</span></Label>
                <DynamicSelect listKey="lead_sources" value={leadSource} onValueChange={setLeadSource} addLabel="lead source" />
              </div>
              <div className="grid gap-2">
                <Label>Payment terms</Label>
                <DynamicSelect listKey="payment_terms" value={paymentTerms} onValueChange={setPaymentTerms} addLabel="payment term" />
              </div>
            </div>
          </section>

          <section>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Notes</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this client…" rows={3} />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Create client</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}