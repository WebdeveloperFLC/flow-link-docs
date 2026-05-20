import { useEffect, useState } from "react";
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
import { COUNSELORS, type CustomerInvoice } from "../../data/mockAR";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";
import { useClients } from "../../stores/clientsStore";
import { addArInvoice } from "../../stores/arInvoicesStore";
import { useAccounts } from "../../stores/coaStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { useMaster, masterLabel } from "../../stores/accountingMastersStore";
import { matchesRevenueCategory } from "../../lib/coaCategoryMap";

const TAG_SUGGESTIONS = ["urgent", "vip", "scholarship", "installment", "referral"];

const fullSchema = z.object({
  client: z.string().min(2), invoiceNumber: z.string().min(2), entity: z.string().min(2),
  currency: z.string().min(1), invoiceDate: z.string().min(1), dueDate: z.string().min(1),
  subtotal: z.number().positive(), description: z.string().min(5),
});

export default function AccountingNewInvoicePage() {
  const navigate = useNavigate();
  const clients = useClients();
  const entities = useScopedEntities();
  const taxCodes = useMaster("tax_codes");
  const accounts = useAccounts();

  const [client, setClient] = useState(""); const [clientEmail, setClientEmail] = useState(""); const [clientPhone, setClientPhone] = useState("");
  const [counselor, setCounselor] = useState(""); const [serviceType, setServiceType] = useState("");
  const [destinationCountry, setDestinationCountry] = useState(""); const [universityName, setUniversityName] = useState(""); const [intakeMonth, setIntakeMonth] = useState("");
  const [entityId, setEntityId] = useState(""); const [branchId, setBranchId] = useState(""); const [currency, setCurrency] = useState("CAD");
  const [invoiceNumber, setInvoiceNumber] = useState(""); const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10)); const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState<number>(0); const [taxCode, setTaxCode] = useState(""); const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [description, setDescription] = useState(""); const [notes, setNotes] = useState("");
  const [revenueCoaId, setRevenueCoaId] = useState(""); const [arCoaId, setArCoaId] = useState("");
  const [bankId, setBankId] = useState(""); const [payMethod, setPayMethod] = useState("");
  const [installmentPlan, setInstallmentPlan] = useState(false); const [totalInstallments, setTotalInstallments] = useState<number>(1);
  const [tags, setTags] = useState<string[]>([]); const [tagInput, setTagInput] = useState("");

  const total = +(subtotal + taxAmount).toFixed(2);
  const topEntities = entities.filter((e) => !e.parentId);
  const branches = entities.filter((e) => e.parentId === entityId);
  const entityName = entities.find((e) => e.id === entityId)?.name ?? "";
  const branchName = entities.find((e) => e.id === branchId)?.name ?? "";

  const clientOptions = clients.map((c) => c.name);

  const coaScope = (a: typeof accounts[number]) =>
    a.status === "ACTIVE" && a.isPostable &&
    (a.entityId === entityId || a.entityId === null) &&
    a.currency === currency;

  const eligibleRevenueAccounts = accounts.filter(
    (a) => coaScope(a) && a.groupCode === "REVENUE" && matchesRevenueCategory(a, serviceType),
  );
  const eligibleArAccounts = accounts.filter(
    (a) => coaScope(a) && a.groupCode === "ASSET" && a.typeCode === "AR",
  );

  useEffect(() => {
    if (revenueCoaId && !eligibleRevenueAccounts.some((a) => a.id === revenueCoaId)) {
      setRevenueCoaId("");
    }
  }, [entityId, currency, revenueCoaId, eligibleRevenueAccounts]);

  useEffect(() => {
    if (!entityId) { setArCoaId(""); return; }
    if (arCoaId && eligibleArAccounts.some((a) => a.id === arCoaId)) return;
    setArCoaId(eligibleArAccounts[0]?.id ?? "");
  }, [entityId, currency, arCoaId, eligibleArAccounts]);

  function applyTax(code: string) {
    setTaxCode(code);
    const label = taxCodes.find((t) => t.code === code)?.label ?? code;
    const m = label.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) setTaxAmount(+(subtotal * (parseFloat(m[1]) / 100)).toFixed(2));
  }

  function buildPayload(status: CustomerInvoice["status"]): Omit<CustomerInvoice, "id"> {
    const cc = (["CA","US","IN","AE"] as const).includes((entities.find((e) => e.id === entityId)?.country ?? "OTHER") as never)
      ? ((entities.find((e) => e.id === entityId)?.country ?? "OTHER") as CustomerInvoice["branchCountry"])
      : "OTHER";
    const cur = (["CAD","USD","INR","AED","GBP","AUD","EUR"] as const).includes(currency as never) ? (currency as CustomerInvoice["currency"]) : "CAD";
    const pm = (["BANK_TRANSFER","CASH","CHEQUE","UPI","CARD","WIRE","OTHER"] as const).includes(payMethod as never) ? (payMethod as CustomerInvoice["paymentMethod"]) : undefined;
    return {
      invoiceNumber, client, clientEmail, clientPhone: clientPhone || undefined,
      counselor: counselor || "—",
      entity: entityName || "—", branch: branchName || entityName || "—", branchCountry: cc,
      serviceType: "OTHER" as CustomerInvoice["serviceType"],
      destinationCountry: (destinationCountry as CustomerInvoice["destinationCountry"]) || undefined,
      universityName: universityName || undefined, intakeMonth: intakeMonth || undefined,
      programName: serviceType || undefined,
      description: description || "—",
      invoiceDate, dueDate, currency: cur, subtotal,
      taxCode: masterLabel("tax_codes", taxCode) || taxCode || "NONE",
      taxAmount, totalAmount: total,
      receivedAmount: 0, outstandingBalance: total, status,
      linkedCOACode: accounts.find((a) => a.id === arCoaId)?.code ?? "1200",
      linkedRevenueCOACode: accounts.find((a) => a.id === revenueCoaId)?.code,
      linkedBankAccountId: bankId || undefined,
      paymentMethod: pm,
      notes: notes || (paymentTerms ? `Payment terms: ${masterLabel("payment_terms", paymentTerms)}` : undefined),
      installmentPlan: installmentPlan || undefined,
      totalInstallments: installmentPlan ? totalInstallments : undefined,
      installmentsPaid: installmentPlan ? 0 : undefined,
      tags: tags.length ? tags : undefined,
    };
  }

  function save(asDraft: boolean) {
    if (asDraft) {
      if (!client || !invoiceNumber || !entityId) { toast.error("Client, invoice number and entity are required to save a draft"); return; }
      addArInvoice(buildPayload("DRAFT"));
      toast.success("Draft saved"); navigate("/accounting/ar"); return;
    }
    const r = fullSchema.safeParse({ client, invoiceNumber, entity: entityName, currency, invoiceDate, dueDate, subtotal, description });
    if (!r.success) { toast.error(r.error.errors[0]?.message ?? "Please complete required fields"); return; }
    if (dueDate < invoiceDate) { toast.error("Due date must be on or after invoice date"); return; }
    if (!revenueCoaId) { toast.error("Pick a revenue account from the chart of accounts"); return; }
    if (!arCoaId) { toast.error("No AR control account available for this entity / currency — add one in Chart of accounts"); return; }
    addArInvoice(buildPayload("SENT"));
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
          <Field label="Service type"><DynamicSelect listKey="client_categories" value={serviceType} onValueChange={setServiceType} placeholder="Select service type" /></Field>
          <Field label="Destination country"><DynamicSelect listKey="countries" value={destinationCountry} onValueChange={setDestinationCountry} /></Field>
          <Field label="University / institution"><Input value={universityName} onChange={(e) => setUniversityName(e.target.value)} /></Field>
          <Field label="Intake month"><Input value={intakeMonth} onChange={(e) => setIntakeMonth(e.target.value)} placeholder="e.g. September 2025" /></Field>
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
          <Field label="Currency *"><DynamicSelect listKey="currencies" value={currency} onValueChange={setCurrency} /></Field>
          <Field label="Payment terms"><DynamicSelect listKey="payment_terms" value={paymentTerms} onValueChange={setPaymentTerms} /></Field>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Invoice details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Invoice number *"><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2024-001" /></Field>
          <Field label="Invoice date *"><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></Field>
          <Field label="Due date *"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Subtotal *"><Input type="number" min={0} step={0.01} value={subtotal || ""} onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Tax code"><DynamicSelect listKey="tax_codes" value={taxCode} onValueChange={applyTax} /></Field>
          <Field label="Tax amount"><Input type="number" min={0} step={0.01} value={taxAmount || ""} onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Total"><Input value={total.toFixed(2)} readOnly className="bg-muted" /></Field>
          <div className="col-span-2"><Field label="Description *"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the service…" /></Field></div>
          <div className="col-span-2"><Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Payment & accounting</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
          <Field label="Revenue account (Cr) *">
            <Select value={revenueCoaId || "__none__"} onValueChange={(v) => setRevenueCoaId(v === "__none__" ? "" : v)} disabled={!entityId || !serviceType}>
              <SelectTrigger><SelectValue placeholder={!entityId ? "Select an entity first" : !serviceType ? "Select a service type first" : "Select revenue account…"} /></SelectTrigger>
              <SelectContent>
                {!entityId ? (
                  <SelectItem value="__none__" disabled>Select an entity first</SelectItem>
                ) : !serviceType ? (
                  <SelectItem value="__none__" disabled>Select a service type first</SelectItem>
                ) : eligibleRevenueAccounts.length === 0 ? (
                  <SelectItem value="__none__" disabled>No COA account mapped for this category — add one in Chart of Accounts.</SelectItem>
                ) : (
                  eligibleRevenueAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="AR control account (Dr)">
            <Select value={arCoaId || "__none__"} onValueChange={(v) => setArCoaId(v === "__none__" ? "" : v)} disabled={!entityId}>
              <SelectTrigger><SelectValue placeholder={entityId ? "Auto-selected" : "Select an entity first"} /></SelectTrigger>
              <SelectContent>
                {!entityId ? (
                  <SelectItem value="__none__" disabled>Select an entity first</SelectItem>
                ) : eligibleArAccounts.length === 0 ? (
                  <SelectItem value="__none__" disabled>No {currency} AR account for this entity — add one in Chart of accounts</SelectItem>
                ) : (
                  eligibleArAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Linked bank account">
            <Select value={bankId || "__none__"} onValueChange={(v) => setBankId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select bank…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {SEED_BANK_ACCOUNTS.filter((b) => b.currency === currency).map((b) => <SelectItem key={b.id} value={b.id}>{b.nickname} · ••••{b.accountNumber.slice(-4)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Preferred payment method"><DynamicSelect listKey="payment_methods" value={payMethod} onValueChange={setPayMethod} /></Field>
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
