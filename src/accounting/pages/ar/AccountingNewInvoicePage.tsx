import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import FreeCombobox from "../../components/ap-ar/FreeCombobox";
import { SERVICE_TYPE_LABELS, MOCK_INVOICES, COUNSELORS } from "../../data/mockAR";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";

const ENTITIES = ["Future Link Canada HQ", "Future Link USA Corp", "Future Link India Pvt Ltd", "Future Link Academy", "Future Link UAE"];
const BRANCHES = ["Head Office", "India — Mumbai", "India — Delhi", "India — Bangalore", "Canada — Toronto", "Canada — Vancouver", "UAE — Dubai", "USA — New York"];
const TAX_CODES = ["GST-5%", "HST-13%", "IGST-18%", "CGST-9%", "SGST-9%", "VAT-5%", "VAT-15%", "ZERO-RATED", "EXEMPT"];
const PAY_METHODS = ["Bank Transfer", "Cheque", "Cash", "Credit Card", "UPI", "Wire Transfer", "NEFT", "RTGS", "IMPS"];
const COUNTRIES = ["Canada", "United Kingdom", "Australia", "United States", "Germany", "Ireland", "France", "UAE", "Other"];
const CURRENCIES = ["CAD", "USD", "INR", "AED", "GBP", "AUD", "EUR"];
const TAG_SUGGESTIONS = ["urgent", "vip", "scholarship", "installment", "referral"];

const fullSchema = z.object({
  client: z.string().min(2), invoiceNumber: z.string().min(2), entity: z.string().min(2),
  currency: z.string().min(1), invoiceDate: z.string().min(1), dueDate: z.string().min(1),
  subtotal: z.number().positive(), description: z.string().min(5),
});

export default function AccountingNewInvoicePage() {
  const navigate = useNavigate();
  const [client, setClient] = useState(""); const [clientEmail, setClientEmail] = useState(""); const [clientPhone, setClientPhone] = useState("");
  const [counselor, setCounselor] = useState(""); const [serviceType, setServiceType] = useState("");
  const [destinationCountry, setDestinationCountry] = useState(""); const [universityName, setUniversityName] = useState(""); const [intakeMonth, setIntakeMonth] = useState("");
  const [entity, setEntity] = useState(""); const [branch, setBranch] = useState(""); const [currency, setCurrency] = useState("CAD");
  const [invoiceNumber, setInvoiceNumber] = useState(""); const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10)); const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState<number>(0); const [taxCode, setTaxCode] = useState(""); const [taxAmount, setTaxAmount] = useState<number>(0);
  const [description, setDescription] = useState(""); const [notes, setNotes] = useState("");
  const [coa, setCoa] = useState("1200 — Accounts receivable"); const [bankId, setBankId] = useState(""); const [payMethod, setPayMethod] = useState("");
  const [installmentPlan, setInstallmentPlan] = useState(false); const [totalInstallments, setTotalInstallments] = useState<number>(1);
  const [tags, setTags] = useState<string[]>([]); const [tagInput, setTagInput] = useState("");

  const total = +(subtotal + taxAmount).toFixed(2);
  const clientOptions = Array.from(new Set(MOCK_INVOICES.map((i) => i.client)));

  function applyTax(code: string) {
    setTaxCode(code);
    const m = code.match(/(\d+(?:\.\d+)?)%/);
    if (m) setTaxAmount(+(subtotal * (parseFloat(m[1]) / 100)).toFixed(2));
  }

  function save(asDraft: boolean) {
    if (asDraft) {
      if (!client || !invoiceNumber || !entity) { toast.error("Client, invoice number and entity are required to save a draft"); return; }
      toast.success("Draft saved"); navigate("/accounting/ar"); return;
    }
    const r = fullSchema.safeParse({ client, invoiceNumber, entity, currency, invoiceDate, dueDate, subtotal, description });
    if (!r.success) { toast.error(r.error.errors[0]?.message ?? "Please complete required fields"); return; }
    if (dueDate < invoiceDate) { toast.error("Due date must be on or after invoice date"); return; }
    toast.success("Invoice created and ready to send"); navigate("/accounting/ar");
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="sticky top-0 bg-background z-10 -mx-6 px-6 py-3 border-b border-border">
          <AccountingPageHeader title="New invoice" subtitle="AR — Invoices / New invoice"
            actions={<>
              <Button variant="ghost" onClick={() => navigate("/accounting/ar")}>Discard</Button>
              <Button variant="outline" onClick={() => save(true)}>Save draft</Button>
              <Button onClick={() => save(false)}>Create & send</Button>
            </>} />
        </div>

        <Card><CardHeader><CardTitle className="text-sm">Client details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Client name *"><FreeCombobox value={client} onChange={setClient} options={clientOptions} placeholder="Select or type client" /></Field>
          <Field label="Client email"><Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} /></Field>
          <Field label="Client phone"><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></Field>
          <Field label="Counselor"><FreeCombobox value={counselor} onChange={setCounselor} options={[...COUNSELORS, "Other — type your own"]} /></Field>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Service details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Service type"><FreeCombobox value={serviceType} onChange={setServiceType} options={[...Object.values(SERVICE_TYPE_LABELS), "Other — type your own"]} /></Field>
          <Field label="Destination country"><FreeCombobox value={destinationCountry} onChange={setDestinationCountry} options={COUNTRIES} /></Field>
          <Field label="University / institution"><Input value={universityName} onChange={(e) => setUniversityName(e.target.value)} /></Field>
          <Field label="Intake month"><Input value={intakeMonth} onChange={(e) => setIntakeMonth(e.target.value)} placeholder="e.g. September 2025" /></Field>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Entity & branch</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Entity *"><FreeCombobox value={entity} onChange={setEntity} options={[...ENTITIES, "Other — type your own"]} /></Field>
          <Field label="Branch"><FreeCombobox value={branch} onChange={setBranch} options={[...BRANCHES, "Other — type your own"]} /></Field>
          <Field label="Currency *"><PlainSelect value={currency} onChange={setCurrency} options={CURRENCIES} /></Field>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Invoice details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Invoice number *"><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2024-001" /></Field>
          <Field label="Invoice date *"><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></Field>
          <Field label="Due date *"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Subtotal *"><Input type="number" min={0} step={0.01} value={subtotal || ""} onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Tax code"><FreeCombobox value={taxCode} onChange={applyTax} options={[...TAX_CODES, "Other — type your own"]} /></Field>
          <Field label="Tax amount"><Input type="number" min={0} step={0.01} value={taxAmount || ""} onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Total"><Input value={total.toFixed(2)} readOnly className="bg-muted" /></Field>
          <div className="col-span-2"><Field label="Description *"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the service…" /></Field></div>
          <div className="col-span-2"><Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Payment & accounting</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Linked COA account"><Input value={coa} onChange={(e) => setCoa(e.target.value)} /></Field>
          <Field label="Linked bank account">
            <PlainSelect value={bankId} onChange={setBankId} options={SEED_BANK_ACCOUNTS.filter((b) => b.currency === currency).map((b) => b.nickname)} />
          </Field>
          <Field label="Preferred payment method"><FreeCombobox value={payMethod} onChange={setPayMethod} options={[...PAY_METHODS, "Other — type your own"]} /></Field>
          <Field label="Installment plan">
            <div className="flex items-center gap-3">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={installmentPlan} onChange={(e) => setInstallmentPlan(e.target.checked)} /> Enable
              </label>
              {installmentPlan && (
                <Input type="number" min={1} max={24} value={totalInstallments} onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 1)} className="w-24" />
              )}
            </div>
          </Field>
          <div className="col-span-2"><Field label="Tags">
            <div className="flex flex-wrap gap-1.5 items-center min-h-9 px-2 py-1 border border-input rounded-md">
              {tags.map((t) => <span key={t} className="bg-accent text-xs px-2 py-0.5 rounded inline-flex items-center gap-1">{t}<button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>×</button></span>)}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} list="ar-tags"
                onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); setTags([...tags, tagInput.trim()]); setTagInput(""); } }}
                className="flex-1 min-w-[80px] outline-none bg-transparent text-sm" placeholder="Type and press Enter" />
              <datalist id="ar-tags">{TAG_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          </Field></div>
        </CardContent></Card>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function PlainSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}