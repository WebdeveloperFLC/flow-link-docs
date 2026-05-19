import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BankAccount, BankAccountInput } from "../../types/bankAccounts";
import { addBankAccount, updateBankAccount } from "../../stores/bankAccountsStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { useAccounts } from "../../stores/coaStore";
import { useOwners } from "../../stores/ownersStore";
import type { OwnerProfile } from "../../types/owners";
import LinkedCoaAccountSelect from "./LinkedCoaAccountSelect";
import DynamicSelect from "../shared/DynamicSelect";

const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: BankAccount | null;
}

export default function BankAccountFormDialog({ open, onOpenChange, initial }: Props) {
  const entities = useScopedEntities();
  const ledgers = useAccounts();

  const [country, setCountry] = useState("CA");
  const [entityId, setEntityId] = useState("");
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
  const [signatoryIds, setSignatoryIds] = useState<string[]>([]);
  const [sigOpen, setSigOpen] = useState(false);

  // Top-level entities (companies); branches are nested children of an entity
  const topEntities = entities.filter((e) => !e.parentId);
  const branches = entities.filter((e) => e.parentId === entityId);
  const ownersList = useOwners();
  const signatoryOptions = ownersList.filter(
    (o) => o.isActive && o.category === "PERSONAL",
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCountry(initial.country);
      setEntityId(initial.entityId);
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
      setSignatoryIds(initial.authorisedSignatoryIds ?? []);
    } else {
      setCountry("CA"); setEntityId(""); setBranchId(NONE);
      setCoaAccountId(""); setCurrency("CAD");
      setBankName(""); setNickname(""); setHolderName(""); setAccountNumber("");
      setIban(""); setSwift(""); setIfsc(""); setRoutingNumber(""); setTransitNumber("");
      setBranchCode(""); setBranchName(""); setBranchAddress("");
      setRmName(""); setRmEmail(""); setRmPhone("");
      setIsDefaultPayment(false); setIsDefaultPayroll(false); setIsDefaultTax(false);
      setReconciliationEnabled(true); setActive(true);
      setSignatoryIds([]);
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

  // Reset linked COA ledger when entity changes (filtered by entity)
  useEffect(() => {
    if (!entityId) return;
    setCoaAccountId((prev) => {
      if (!prev) return prev;
      const ledger = ledgers.find((a) => a.id === prev);
      if (!ledger) return "";
      if (ledger.entityId && ledger.entityId !== entityId) return "";
      return prev;
    });
  }, [entityId, ledgers]);

  const submit = () => {
    const input: BankAccountInput = {
      country, entityId, branchId: branchId === NONE ? null : branchId,
      ownerProfileId: initial?.ownerProfileId ?? "",
      coaAccountId, currency,
      authorisedSignatoryIds: signatoryIds,
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
                <DynamicSelect listKey="countries" value={country} onValueChange={setCountry} addLabel="country" />
              </Field>
              <Field label="Entity / company" hint="The company that owns this account on the books.">
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                  <SelectContent>
                    {topEntities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Sub-entity / division (optional)"
                hint={
                  entityId && branches.length === 0
                    ? "No sub-entities for this company. Add one in Settings → Entities (set Parent = this company)."
                    : "Internal org branch (e.g. regional office). Leave blank if the company has no sub-entities."
                }
              >
                <Select value={branchId} onValueChange={setBranchId} disabled={!entityId || branches.length === 0}>
                  <SelectTrigger><SelectValue placeholder={branches.length ? "Select sub-entity" : "No sub-entities — add in Settings → Entities"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Linked COA ledger">
                <LinkedCoaAccountSelect value={coaAccountId} onChange={setCoaAccountId} entityId={entityId || undefined} />
              </Field>
              <Field label="Currency">
                <DynamicSelect listKey="currencies" value={currency} onValueChange={setCurrency} addLabel="currency" />
              </Field>
            </div>
          </Section>

          {/* Section 2 — Bank details */}
          <Section title="Bank details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank name"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="HDFC Bank" /></Field>
              <Field label="Nickname">
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="HDFC Operating"
                />
              </Field>
              <Field
                label="Account holder name"
                hint="Legal name as printed on the bank's records. Usually the company's legal name, but can differ for joint, escrow, DBA, or trust accounts."
              >
                <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} />
              </Field>
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
            <div className="mt-3">
              <Field
                label="Authorised signatories (optional)"
                hint="Individuals with signing authority on this account (e.g. directors with joint signing). Sourced from personal owner profiles."
              >
                <SignatoriesMultiSelect
                  options={signatoryOptions}
                  value={signatoryIds}
                  onChange={setSignatoryIds}
                  open={sigOpen}
                  onOpenChange={setSigOpen}
                />
              </Field>
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
            disabled={!entityId || !coaAccountId || !bankName.trim() || !nickname.trim() || !holderName.trim() || !accountNumber.trim()}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11.5px]">{label}</Label>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground leading-snug">{hint}</div>}
    </div>
  );
}

function SignatoriesMultiSelect({
  options, value, onChange, open, onOpenChange,
}: {
  options: OwnerProfile[];
  value: string[];
  onChange: (v: string[]) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const selected = options.filter((o) => value.includes(o.id));
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="text-muted-foreground">
              {selected.length ? `${selected.length} selected` : options.length ? "Select signatories" : "No personal owner profiles available"}
            </span>
            <ChevronsUpDown className="ml-2 size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-muted-foreground">
                Add directors as PERSONAL owner profiles first.
              </div>
            ) : (
              options.map((o) => {
                const checked = value.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-accent"
                  >
                    <Check className={cn("size-4", checked ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{ownerLabel(o)}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((o) => (
            <Badge key={o.id} variant="secondary" className="gap-1 pr-1">
              <span>{ownerLabel(o)}</span>
              <button
                type="button"
                onClick={() => toggle(o.id)}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20"
                aria-label={`Remove ${ownerLabel(o)}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
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