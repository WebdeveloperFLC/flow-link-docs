import { useState } from "react";
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
import {
  MOCK_STAFF, SERVICE_PACKAGES, VISA_CATEGORIES, INTAKES, LEAD_SOURCES,
} from "../../data/mockStaff";
import { addClient } from "../../stores/clientsStore";
import type { Client, ClientType } from "../../types/clients";
import DynamicSelect from "../shared/DynamicSelect";

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

  const [counselorId, setCounselorId] = useState<string>(MOCK_STAFF[0].id);
  const [servicePackage, setServicePackage] = useState<string>(SERVICE_PACKAGES[0]);
  const [visaCategory, setVisaCategory] = useState<string>(VISA_CATEGORIES[0]);
  const [intake, setIntake] = useState<string>(INTAKES[2]);
  const [leadSource, setLeadSource] = useState<string>(LEAD_SOURCES[0]);
  const [paymentTerms, setPaymentTerms] = useState<string>("DUE_ON_RECEIPT");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!name.trim()) { toast.error("Client name is required"); return; }
    const counselor = MOCK_STAFF.find(s => s.id === counselorId);
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
                  <Select value={clientType} onValueChange={(v) => setClientType(v as ClientType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CLIENT_TYPE_LABEL).map(([k, v]) =>
                        <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["CA","US","IN","GB","DE","AU"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                <Select value={counselorId} onValueChange={setCounselorId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOCK_STAFF.map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Service package</Label>
                <Select value={servicePackage} onValueChange={setServicePackage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_PACKAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Visa category</Label>
                <Select value={visaCategory} onValueChange={setVisaCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISA_CATEGORIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Intake / session</Label>
                <Select value={intake} onValueChange={setIntake}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTAKES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Lead source</Label>
                <Select value={leadSource} onValueChange={setLeadSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Payment terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Due on receipt","Installments","Net 7","Net 14","Net 30","Net 45","Net 60"].map(p =>
                      <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
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