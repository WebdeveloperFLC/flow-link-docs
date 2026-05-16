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
import DynamicSelect from "../../components/shared/DynamicSelect";
import { EXPENSE_CATEGORY_LABELS, type VendorBill } from "../../data/mockAP";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";
import { useVendors } from "../../stores/vendorsStore";
import { addApBill } from "../../stores/apBillsStore";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { useMaster, masterLabel } from "../../stores/accountingMastersStore";

const DEPARTMENTS = ["Operations", "Marketing", "Academics", "Visa & Immigration", "Finance & Accounts", "HR & Admin", "Technology", "Management"];
const TAG_SUGGESTIONS = ["urgent", "recurring", "reimbursable", "petty-cash", "capex"];

const fullSchema = z.object({
  vendor: z.string().min(2), billNumber: z.string().min(2), entity: z.string().min(2), currency: z.string().min(1),
  billDate: z.string().min(1), dueDate: z.string().min(1), subtotal: z.number().positive(), description: z.string().min(5),
});

export default function AccountingNewBillPage() {
  const navigate = useNavigate();
  const vendors = useVendors();
  const entities = useEntities();
  const taxCodes = useMaster("tax_codes");

  const [vendor, setVendor] = useState(""); const [vendorEmail, setVendorEmail] = useState(""); const [vendorPhone, setVendorPhone] = useState("");
  const [category, setCategory] = useState(""); const [department, setDepartment] = useState("");
  const [entityId, setEntityId] = useState(""); const [branchId, setBranchId] = useState("");
  const [country, setCountry] = useState("CA"); const [currency, setCurrency] = useState("CAD");
  const [billNumber, setBillNumber] = useState(""); const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10)); const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState<number>(0); const [taxCode, setTaxCode] = useState(""); const [taxAmount, setTaxAmount] = useState<number>(0);
  const [description, setDescription] = useState(""); const [notes, setNotes] = useState("");
  const [coa, setCoa] = useState("2000 — Accounts payable"); const [bankId, setBankId] = useState(""); const [payMethod, setPayMethod] = useState("");
  const [tags, setTags] = useState<string[]>([]); const [tagInput, setTagInput] = useState("");
  const [filename, setFilename] = useState("");

  const total = +(subtotal + taxAmount).toFixed(2);
  const topEntities = entities.filter((e) => !e.parentId);
  const branches = entities.filter((e) => e.parentId === entityId);
  const entityName = entities.find((e) => e.id === entityId)?.name ?? "";
  const branchName = entities.find((e) => e.id === branchId)?.name ?? "";

  function applyTax(code: string) {
    setTaxCode(code);
    const label = taxCodes.find((t) => t.code === code)?.label ?? code;
    const m = label.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) setTaxAmount(+(subtotal * (parseFloat(m[1]) / 100)).toFixed(2));
  }

  function buildPayload(status: VendorBill["status"]): Omit<VendorBill, "id"> {
    const cc = (["CA","US","IN","AE"] as const).includes(country as never) ? (country as VendorBill["branchCountry"]) : "OTHER";
    const cur = (["CAD","USD","INR","AED","GBP","AUD","EUR"] as const).includes(currency as never) ? (currency as VendorBill["currency"]) : "CAD";
    const pm = (["BANK_TRANSFER","CHEQUE","CASH","CREDIT_CARD","UPI","WIRE","OTHER"] as const).includes(payMethod as never) ? (payMethod as VendorBill["paymentMethod"]) : undefined;
    return {
      billNumber, vendor, vendorEmail: vendorEmail || undefined, vendorPhone: vendorPhone || undefined,
      vendorCategory: "OTHER" as VendorBill["vendorCategory"],
      entity: entityName || "—", branch: branchName || entityName || "—", branchCountry: cc,
      department: department || undefined, description: description || "—",
      billDate, dueDate, currency: cur, subtotal,
      taxCode: masterLabel("tax_codes", taxCode) || taxCode || "NONE",
      taxAmount, totalAmount: total,
      status, linkedCOACode: "2000", linkedBankAccountId: bankId || undefined,
      paymentMethod: pm, notes: notes || undefined,
      createdBy: "Current user", tags: tags.length ? tags : undefined,
    };
  }

  function save(asDraft: boolean) {
    if (asDraft) {
      if (!vendor || !billNumber || !entityId) { toast.error("Vendor, bill number and entity are required to save a draft"); return; }
      addApBill(buildPayload("DRAFT"));
      toast.success("Draft saved"); navigate("/accounting/ap"); return;
    }
    const r = fullSchema.safeParse({ vendor, billNumber, entity: entityName, currency, billDate, dueDate, subtotal, description });
    if (!r.success) { toast.error(r.error.errors[0]?.message ?? "Please complete required fields"); return; }
    if (dueDate < billDate) { toast.error("Due date must be on or after bill date"); return; }
    addApBill(buildPayload("PENDING_REVIEW"));
    toast.success("Bill submitted for review"); navigate("/accounting/ap");
  }

  const vendorOptions = vendors.map((v) => v.name);

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
          <Field label="Entity *">
            <Select value={entityId} onValueChange={(v) => { setEntityId(v); setBranchId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
              <SelectContent>{topEntities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Branch">
            <Select value={branchId || "__none__"} onValueChange={(v) => setBranchId(v === "__none__" ? "" : v)} disabled={!entityId || branches.length === 0}>
              <SelectTrigger><SelectValue placeholder={branches.length ? "Select branch" : "No branches"} /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">—</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Branch country"><DynamicSelect listKey="countries" value={country} onValueChange={setCountry} /></Field>
          <Field label="Currency *"><DynamicSelect listKey="currencies" value={currency} onValueChange={setCurrency} /></Field>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Bill details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Bill number *"><Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="BILL-2024-001" /></Field>
          <Field label="Bill date *"><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></Field>
          <Field label="Due date *"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Subtotal *"><Input type="number" min={0} step={0.01} value={subtotal || ""} onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Tax code"><DynamicSelect listKey="tax_codes" value={taxCode} onValueChange={applyTax} /></Field>
          <Field label="Tax amount"><Input type="number" min={0} step={0.01} value={taxAmount || ""} onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Total"><Input value={total.toFixed(2)} readOnly className="bg-muted" /></Field>
          <div className="col-span-2"><Field label="Description *"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this bill is for…" /></Field></div>
          <div className="col-span-2"><Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Payment & accounting</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Linked COA account"><Input value={coa} onChange={(e) => setCoa(e.target.value)} /></Field>
          <Field label="Linked bank account">
            <Select value={bankId || "__none__"} onValueChange={(v) => setBankId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select bank…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {SEED_BANK_ACCOUNTS.filter((b) => b.currency === currency).map((b) => <SelectItem key={b.id} value={b.id}>{b.nickname} · ••••{b.accountNumber.slice(-4)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Payment method"><DynamicSelect listKey="payment_methods" value={payMethod} onValueChange={setPayMethod} /></Field>
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
