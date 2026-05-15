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
import { EXPENSE_CATEGORY_LABELS, MOCK_BILLS } from "../../data/mockAP";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";

const ENTITIES = ["Future Link Canada HQ", "Future Link USA Corp", "Future Link India Pvt Ltd", "Future Link Academy", "Future Link UAE"];
const BRANCHES = ["Head Office", "Mumbai Office", "Delhi Office", "Bangalore Office", "Toronto Office", "Vancouver Office", "Dubai Office"];
const DEPARTMENTS = ["Operations", "Marketing", "Academics", "Visa & Immigration", "Finance & Accounts", "HR & Admin", "Technology", "Management"];
const TAX_CODES = ["GST-5%", "HST-13%", "IGST-18%", "CGST-9%", "SGST-9%", "TDS-10%", "TCS-1%", "VAT-5%", "VAT-15%", "ZERO-RATED", "EXEMPT"];
const PAY_METHODS = ["Bank Transfer", "Cheque", "Cash", "Credit Card", "UPI", "Wire Transfer", "NEFT", "RTGS", "IMPS"];
const COUNTRIES = ["India", "Canada", "USA", "UAE", "UK", "Australia", "Germany", "Other"];
const CURRENCIES = ["CAD", "USD", "INR", "AED", "GBP", "AUD", "EUR"];
const TAG_SUGGESTIONS = ["urgent", "recurring", "reimbursable", "petty-cash", "capex"];

const fullSchema = z.object({
  vendor: z.string().min(2), billNumber: z.string().min(2), entity: z.string().min(2), currency: z.string().min(1),
  billDate: z.string().min(1), dueDate: z.string().min(1), subtotal: z.number().positive(), description: z.string().min(5),
});

export default function AccountingNewBillPage() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(""); const [vendorEmail, setVendorEmail] = useState(""); const [vendorPhone, setVendorPhone] = useState("");
  const [category, setCategory] = useState(""); const [department, setDepartment] = useState("");
  const [entity, setEntity] = useState(""); const [branch, setBranch] = useState(""); const [country, setCountry] = useState("Canada"); const [currency, setCurrency] = useState("CAD");
  const [billNumber, setBillNumber] = useState(""); const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10)); const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState<number>(0); const [taxCode, setTaxCode] = useState(""); const [taxAmount, setTaxAmount] = useState<number>(0);
  const [description, setDescription] = useState(""); const [notes, setNotes] = useState("");
  const [coa, setCoa] = useState("2000 — Accounts payable"); const [bankId, setBankId] = useState(""); const [payMethod, setPayMethod] = useState("");
  const [tags, setTags] = useState<string[]>([]); const [tagInput, setTagInput] = useState("");
  const [filename, setFilename] = useState("");

  const total = +(subtotal + taxAmount).toFixed(2);
  const vendorOptions = Array.from(new Set(MOCK_BILLS.map((b) => b.vendor)));

  function applyTax(code: string) {
    setTaxCode(code);
    const m = code.match(/(\d+(?:\.\d+)?)%/);
    if (m) setTaxAmount(+(subtotal * (parseFloat(m[1]) / 100)).toFixed(2));
  }

  function save(asDraft: boolean) {
    if (asDraft) {
      if (!vendor || !billNumber || !entity) { toast.error("Vendor, bill number and entity are required to save a draft"); return; }
      toast.success("Draft saved"); navigate("/accounting/ap"); return;
    }
    const r = fullSchema.safeParse({ vendor, billNumber, entity, currency, billDate, dueDate, subtotal, description });
    if (!r.success) { toast.error(r.error.errors[0]?.message ?? "Please complete required fields"); return; }
    if (dueDate < billDate) { toast.error("Due date must be on or after bill date"); return; }
    toast.success("Bill submitted for review"); navigate("/accounting/ap");
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="sticky top-0 bg-background z-10 -mx-6 px-6 py-3 border-b border-border">
          <AccountingPageHeader title="New bill" subtitle="AP — Bills / New bill"
            actions={<>
              <Button variant="ghost" onClick={() => navigate("/accounting/ap")}>Discard</Button>
              <Button variant="outline" onClick={() => save(true)}>Save draft</Button>
              <Button onClick={() => save(false)}>Submit for review</Button>
            </>} />
        </div>

        <Card><CardHeader><CardTitle className="text-sm">Vendor details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Vendor name *"><FreeCombobox value={vendor} onChange={setVendor} options={vendorOptions} placeholder="Select or type vendor" /></Field>
          <Field label="Vendor email"><Input type="email" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} /></Field>
          <Field label="Vendor phone"><Input value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} /></Field>
          <Field label="Expense category"><FreeCombobox value={category} onChange={setCategory} options={[...Object.values(EXPENSE_CATEGORY_LABELS), "Other — type your own"]} /></Field>
          <Field label="Department"><FreeCombobox value={department} onChange={setDepartment} options={[...DEPARTMENTS, "Other — type your own"]} /></Field>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Entity & branch</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Entity *"><FreeCombobox value={entity} onChange={setEntity} options={[...ENTITIES, "Other — type your own"]} /></Field>
          <Field label="Branch"><FreeCombobox value={branch} onChange={setBranch} options={[...BRANCHES, "Other — type your own"]} /></Field>
          <Field label="Branch country"><PlainSelect value={country} onChange={setCountry} options={COUNTRIES} /></Field>
          <Field label="Currency *"><PlainSelect value={currency} onChange={setCurrency} options={CURRENCIES} /></Field>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Bill details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Bill number *"><Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="BILL-2024-001" /></Field>
          <Field label="Bill date *"><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></Field>
          <Field label="Due date *"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Subtotal *"><Input type="number" min={0} step={0.01} value={subtotal || ""} onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Tax code"><FreeCombobox value={taxCode} onChange={applyTax} options={[...TAX_CODES, "Other — type your own"]} /></Field>
          <Field label="Tax amount"><Input type="number" min={0} step={0.01} value={taxAmount || ""} onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Total"><Input value={total.toFixed(2)} readOnly className="bg-muted" /></Field>
          <div className="col-span-2"><Field label="Description *"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this bill is for…" /></Field></div>
          <div className="col-span-2"><Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Payment & accounting</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Linked COA account"><Input value={coa} onChange={(e) => setCoa(e.target.value)} /></Field>
          <Field label="Linked bank account">
            <PlainSelect value={bankId} onChange={setBankId} options={SEED_BANK_ACCOUNTS.filter((b) => b.currency === currency).map((b) => b.nickname)} />
          </Field>
          <Field label="Payment method"><FreeCombobox value={payMethod} onChange={setPayMethod} options={[...PAY_METHODS, "Other — type your own"]} /></Field>
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5 items-center min-h-9 px-2 py-1 border border-input rounded-md">
              {tags.map((t) => <span key={t} className="bg-accent text-xs px-2 py-0.5 rounded inline-flex items-center gap-1">{t}<button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>×</button></span>)}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} list="ap-tags"
                onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); setTags([...tags, tagInput.trim()]); setTagInput(""); } }}
                className="flex-1 min-w-[80px] outline-none bg-transparent text-sm" placeholder="Type and press Enter" />
              <datalist id="ap-tags">{TAG_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          </Field>
          <div className="col-span-2"><Field label="Attach document">
            <Input type="file" onChange={(e) => setFilename(e.target.files?.[0]?.name ?? "")} />
            {filename && <div className="text-xs text-muted-foreground mt-1">{filename}</div>}
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
