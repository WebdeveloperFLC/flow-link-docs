import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccount, BankAccountInput } from "../../types/bankAccounts";
import { addBankAccount, updateBankAccount } from "../../stores/bankAccountsStore";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { useAccounts } from "../../stores/coaStore";
import { MOCK_OWNERS } from "../../data/mockOwners";
import type { OwnerProfile } from "../../types/owners";
import LinkedCoaAccountSelect from "./LinkedCoaAccountSelect";

const COUNTRIES = [
  { code: "CA", label: "Canada" },
  { code: "US", label: "United States" },
  { code: "IN", label: "India" },
  { code: "GB", label: "United Kingdom" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "AU", label: "Australia" },
  { code: "SG", label: "Singapore" },
  { code: "DE", label: "Germany" },
];
const CURRENCIES = ["CAD", "USD", "INR", "EUR", "GBP", "AED", "AUD", "SGD"];
const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: BankAccount | null;
}

export default function BankAccountFormDialog({ open, onOpenChange, initial }: Props) {
  const entities = useEntities();
  const ledgers = useAccounts();

  const [country, setCountry] = useState("CA");
  const [entityId, setEntityId] = useState("");
  const [ownerProfileId, setOwnerProfileId] = useState("");
  const [branchId, setBranchId] = useState<string>(NONE);
  const [coaAccountId, setCoaAccountId] = useState("");
  const [currency, setCurrency] = useState("CAD");

  const [bankName, setBankName] = useState("");
  const [nickname, setNickname] = useState("");
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [transitNumber, setTransitNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");

  const [rmName, setRmName] = useState("");
  const [rmEmail, setRmEmail] = useState("");
  const [rmPhone, setRmPhone] = useState("");

  const [isDefaultPayment, setIsDefaultPayment] = useState(false);
  const [isDefaultPayroll, setIsDefaultPayroll] = useState(false);
  const [isDefaultTax, setIsDefaultTax] = useState(false);
  const [reconciliationEnabled, setReconciliationEnabled] = useState(true);
  const [active, setActive] = useState(true);

  // Top-level entities (companies); branches are nested children of an entity
  const topEntities = entities.filter((e) => !e.parentId);
  const branches = entities.filter((e) => e.parentId === entityId);
  const ownerOptions = MOCK_OWNERS.filter((o) => o.isActive && (!country || o.country === country));

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCountry(initial.country);
      setEntityId(initial.entityId);
      setOwnerProfileId(initial.ownerProfileId ?? "");
      setBranchId(initial.branchId ?? NONE);
      setCoaAccountId(initial.coaAccountId);
      setCurrency(initial.currency);
      setBankName(initial.bankName);
      setNickname(initial.nickname);
      setHolderName(initial.holderName);
      setAccountNumber(initial.accountNumber);
      setIban(initial.iban ?? "");
      setSwift(initial.swift ?? "");
      setIfsc(initial.ifsc ?? "");
      setRoutingNumber(initial.routingNumber ?? "");
      setTransitNumber(initial.transitNumber ?? "");
      setBranchCode(initial.branchCode ?? "");
      setBranchName(initial.branchName ?? "");
      setBranchAddress(initial.branchAddress ?? "");
      setRmName(initial.rmName ?? "");
      setRmEmail(initial.rmEmail ?? "");
      setRmPhone(initial.rmPhone ?? "");
      setIsDefaultPayment(initial.isDefaultPayment);
      setIsDefaultPayroll(initial.isDefaultPayroll);
      setIsDefaultTax(initial.isDefaultTax);
      setReconciliationEnabled(initial.reconciliationEnabled);
      setActive(initial.status === "ACTIVE");
    } else {
      setCountry("CA"); setEntityId(""); setBranchId(NONE);
      setOwnerProfileId("");
      setCoaAccountId(""); setCurrency("CAD");
      setBankName(""); setNickname(""); setHolderName(""); setAccountNumber("");
      setIban(""); setSwift(""); setIfsc(""); setRoutingNumber(""); setTransitNumber("");
      setBranchCode(""); setBranchName(""); setBranchAddress("");
      setRmName(""); setRmEmail(""); setRmPhone("");
      setIsDefaultPayment(false); setIsDefaultPayroll(false); setIsDefaultTax(false);
      setReconciliationEnabled(true); setActive(true);
    }
  }, [open, initial]);

  // When ledger changes, sync currency from the linked COA ledger
  useEffect(() => {
    if (!coaAccountId) return;
    const ledger = ledgers.find((a) => a.id === coaAccountId);
    if (ledger && ledger.currency !== currency) setCurrency(ledger.currency);
  }, [coaAccountId, ledgers, currency]);

  // Reset branch when entity changes
  useEffect(() => { setBranchId(NONE); }, [entityId]);

  const submit = () => {
    const input: BankAccountInput = {
      country, entityId, branchId: branchId === NONE ? null : branchId,
      ownerProfileId,
      coaAccountId, currency,
      bankName: bankName.trim(), nickname: nickname.trim(),
      holderName: holderName.trim(), accountNumber: accountNumber.trim(),
      iban: iban.trim() || undefined,
      swift: swift.trim() || undefined,
      ifsc: ifsc.trim() || undefined,
      routingNumber: routingNumber.trim() || undefined,
      transitNumber: transitNumber.trim() || undefined,
      branchCode: branchCode.trim() || undefined,
      branchName: branchName.trim() || undefined,
      branchAddress: branchAddress.trim() || undefined,
      rmName: rmName.trim() || undefined,
      rmEmail: rmEmail.trim() || undefined,
      rmPhone: rmPhone.trim() || undefined,
      isDefaultPayment, isDefaultPayroll, isDefaultTax,
      reconciliationEnabled,
      status: active ? "ACTIVE" : "INACTIVE",
    };
    const result = initial ? updateBankAccount(initial.id, input) : addBankAccount(input);
    if (result.ok === false) { toast.error(result.error.message); return; }
    toast.success(initial ? `${input.nickname} updated` : `${input.nickname} added`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit bank account" : "New bank account"}</DialogTitle>
          <DialogDescription>
            Bank accounts are kept separate from the Chart of Accounts and link to a single COA ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 max-h-[68vh] overflow-y-auto pr-1">
          {/* Section 1 — Entity & linking */}
          <Section title="Entity & linking" subtitle="Where this account lives in the org and which ledger it posts to.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country">
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Entity / company">
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                  <SelectContent>
                    {topEntities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Owner">
                <Select value={ownerProfileId} onValueChange={setOwnerProfileId}>
                  <SelectTrigger><SelectValue placeholder={ownerOptions.length ? "Select owner" : "No owners for country"} /></SelectTrigger>
                  <SelectContent>
                    {ownerOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{ownerLabel(o)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Branch / sub-branch (optional)">
                <Select value={branchId} onValueChange={setBranchId} disabled={!entityId || branches.length === 0}>
                  <SelectTrigger><SelectValue placeholder={branches.length ? "Select branch" : "No branches"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Linked COA ledger">
                <LinkedCoaAccountSelect value={coaAccountId} onChange={setCoaAccountId} />
              </Field>
              <Field label="Currency">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          {/* Section 2 — Bank details */}
          <Section title="Bank details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank name"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="HDFC Bank" /></Field>
              <Field label="Account nickname"><Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="HDFC Operating" /></Field>
              <Field label="Account holder name"><Input value={holderName} onChange={(e) => setHolderName(e.target.value)} /></Field>
              <Field label="Account number"><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></Field>
              <Field label="IBAN"><Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="GB29 NWBK..." /></Field>
              <Field label="SWIFT / BIC"><Input value={swift} onChange={(e) => setSwift(e.target.value.toUpperCase())} placeholder="HDFCINBB" /></Field>
              <Field label="IFSC code"><Input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="HDFC0000123" /></Field>
              <Field label="Routing number"><Input value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} /></Field>
              <Field label="Transit number"><Input value={transitNumber} onChange={(e) => setTransitNumber(e.target.value)} /></Field>
              <Field label="Branch code"><Input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} /></Field>
              <Field label="Bank branch name"><Input value={branchName} onChange={(e) => setBranchName(e.target.value)} /></Field>
              <Field label="Bank branch address"><Input value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} /></Field>
            </div>
          </Section>

          {/* Section 3 — Contact */}
          <Section title="Relationship manager">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Contact name"><Input value={rmName} onChange={(e) => setRmName(e.target.value)} /></Field>
              <Field label="Email"><Input value={rmEmail} onChange={(e) => setRmEmail(e.target.value)} placeholder="rm@bank.com" /></Field>
              <Field label="Phone"><Input value={rmPhone} onChange={(e) => setRmPhone(e.target.value)} /></Field>
            </div>
          </Section>

          {/* Section 4 — Settings */}
          <Section title="Account settings">
            <div className="grid grid-cols-2 gap-3">
              <SwitchRow label="Default payment account" sub="Used as the default for outgoing payments" checked={isDefaultPayment} onChange={setIsDefaultPayment} />
              <SwitchRow label="Default payroll account" sub="Used as the default for payroll runs" checked={isDefaultPayroll} onChange={setIsDefaultPayroll} />
              <SwitchRow label="Default tax payment account" sub="Used as the default for tax payments" checked={isDefaultTax} onChange={setIsDefaultTax} />
              <SwitchRow label="Reconciliation enabled" sub="Show in the reconciliation module" checked={reconciliationEnabled} onChange={setReconciliationEnabled} />
              <SwitchRow label="Active" sub="Inactive accounts are hidden from posting flows" checked={active} onChange={setActive} />
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={!entityId || !ownerProfileId || !coaAccountId || !bankName.trim() || !nickname.trim() || !holderName.trim() || !accountNumber.trim()}
          >
            {initial ? "Save changes" : "Add bank account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ownerLabel(o: OwnerProfile): string {
  if (o.category === "BUSINESS" || o.category === "FAMILY_OFFICE") {
    return o.brandName ?? o.legalName ?? "Unnamed owner";
  }
  const name = [o.firstName, o.lastName].filter(Boolean).join(" ").trim();
  return name || o.brandName || o.legalName || "Unnamed owner";
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
        {subtitle && <div className="text-[11.5px] text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11.5px]">{label}</Label>
      {children}
    </div>
  );
}

function SwitchRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}