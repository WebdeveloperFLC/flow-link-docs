import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { CoaAccount, CoaAccountInput, CoaAccountStatus } from "../../types/coa";
import { useGroups, useTypes, useSubTypes, HIDDEN_TYPE_CODES } from "../../stores/coaMasterStore";
import { addAccount, getAccounts, getDescendantIds, updateAccount } from "../../stores/coaStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { getExpenseCategories, getRevenueCategories, setAccountCategories } from "../../stores/coaCategoriesStore";
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "../../data/mockAP";
import { REVENUE_CATEGORY_LABELS, type RevenueCategory } from "../../data/mockAR";
import AddGroupInlineDialog from "./AddGroupInlineDialog";
import AddTypeInlineDialog from "./AddTypeInlineDialog";
import AddSubTypeInlineDialog from "./AddSubTypeInlineDialog";
import DynamicSelect from "../shared/DynamicSelect";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CoaAccount | null;
  forcedParentId?: string | null; // for "Add child"
}

const ADD_NEW = "__add_new__";
const NONE = "__none__";

export default function AccountFormDialog({ open, onOpenChange, initial, forcedParentId }: Props) {
  const groups = useGroups();
  const types = useTypes();
  const subTypes = useSubTypes();
  const entities = useScopedEntities();
  const accounts = getAccounts();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [subTypeCode, setSubTypeCode] = useState<string>(NONE);
  const [parentId, setParentId] = useState<string>(NONE);
  const [currency, setCurrency] = useState("CAD");
  const [entityId, setEntityId] = useState<string>(NONE);
  const [taxCode, setTaxCode] = useState("NONE");
  const [normalBalance, setNormalBalance] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [openingBalance, setOpeningBalance] = useState<string>("0");
  const [status, setStatus] = useState<CoaAccountStatus>("ACTIVE");
  const [isPostable, setIsPostable] = useState<boolean>(true);
  const [description, setDescription] = useState("");
  const [expenseCategories, setExpenseCategoriesState] = useState<ExpenseCategory[]>([]);
  const [revenueCategories, setRevenueCategoriesState] = useState<RevenueCategory[]>([]);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [subTypeDialogOpen, setSubTypeDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCode(initial.code);
      setName(initial.name);
      setGroupCode(initial.groupCode);
      setTypeCode(initial.typeCode);
      setSubTypeCode(initial.subTypeCode ?? NONE);
      setParentId(initial.parentId ?? NONE);
      setCurrency(initial.currency);
      setEntityId(initial.entityId ?? NONE);
      setTaxCode(initial.taxCode ?? "NONE");
      setNormalBalance(initial.normalBalance ?? (groups.find((g) => g.code === initial.groupCode)?.nature ?? "DEBIT"));
      setOpeningBalance(String(initial.openingBalance));
      setStatus(initial.status);
      setIsPostable(initial.isPostable !== false);
      setDescription(initial.description ?? "");
      setExpenseCategoriesState(getExpenseCategories(initial.code) as ExpenseCategory[]);
      setRevenueCategoriesState(getRevenueCategories(initial.code) as RevenueCategory[]);
    } else {
      const parent = forcedParentId ? accounts.find((a) => a.id === forcedParentId) : null;
      setCode("");
      setName("");
      setGroupCode(parent?.groupCode ?? groups[0]?.code ?? "");
      setTypeCode(parent?.typeCode ?? "");
      setSubTypeCode(parent?.subTypeCode ?? NONE);
      setParentId(forcedParentId ?? NONE);
      setCurrency(parent?.currency ?? "CAD");
      setEntityId(parent?.entityId ?? NONE);
      setTaxCode("NONE");
      setNormalBalance(groups.find((g) => g.code === (parent?.groupCode ?? groups[0]?.code))?.nature ?? "DEBIT");
      setOpeningBalance("0");
      setStatus("ACTIVE");
      setIsPostable(true);
      setDescription("");
      setExpenseCategoriesState([]);
      setRevenueCategoriesState([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, forcedParentId]);

  // Account groups + types available for selection (hide BANK type — Banks module owns those).
  const selectableTypes = useMemo(
    () => types.filter((t) => !HIDDEN_TYPE_CODES.has(t.code)),
    [types],
  );

  const typesForGroup = useMemo(
    () => selectableTypes.filter((t) => t.groupCode === groupCode),
    [selectableTypes, groupCode],
  );
  const subTypesForType = useMemo(
    () => subTypes.filter((s) => s.typeCode === typeCode),
    [subTypes, typeCode],
  );

  const eligibleParents = useMemo(() => {
    const excluded = initial ? new Set([initial.id, ...getDescendantIds(initial.id)]) : new Set<string>();
    const matches = accounts.filter((a) => {
      if (a.groupCode !== groupCode) return false;
      if (excluded.has(a.id)) return false;
      if (currency && a.currency !== currency) return false;
      if (entityId === NONE) {
        return a.entityId === null;
      }
      return a.entityId === entityId || a.entityId === null;
    });
    return matches.slice().sort((a, b) => {
      const ap = a.isPostable === false ? 0 : 1;
      const bp = b.isPostable === false ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.code.localeCompare(b.code);
    });
  }, [accounts, groupCode, initial, entityId, currency]);

  // Reset parent if it no longer matches the current entity filter
  useEffect(() => {
    if (parentId === NONE) return;
    if (!eligibleParents.some((a) => a.id === parentId)) {
      setParentId(NONE);
    }
  }, [eligibleParents, parentId]);

  const codeError = useMemo(() => {
    if (!code.trim()) return null;
    const dup = accounts.find((a) => a.code === code.trim() && a.id !== initial?.id);
    return dup ? `Code "${code}" is already used by ${dup.name}` : null;
  }, [code, accounts, initial]);

  const handleGroupChange = (v: string) => {
    if (v === ADD_NEW) { setGroupDialogOpen(true); return; }
    setGroupCode(v);
    // Reset type if no longer matches
    if (!types.some((t) => t.code === typeCode && t.groupCode === v)) {
      setTypeCode("");
      setSubTypeCode(NONE);
    }
    const grp = groups.find((g) => g.code === v);
    if (grp) setNormalBalance(grp.nature);
    setParentId(NONE);
  };

  const handleTypeChange = (v: string) => {
    if (v === ADD_NEW) { setTypeDialogOpen(true); return; }
    setTypeCode(v);
    setSubTypeCode(NONE);
  };

  const handleSubTypeChange = (v: string) => {
    if (v === ADD_NEW) { setSubTypeDialogOpen(true); return; }
    setSubTypeCode(v);
  };

  const submit = () => {
    const input: CoaAccountInput = {
      code: code.trim(),
      name: name.trim(),
      groupCode,
      typeCode,
      subTypeCode: subTypeCode === NONE ? null : subTypeCode,
      parentId: parentId === NONE ? null : parentId,
      currency,
      entityId: entityId === NONE ? null : entityId,
      taxCode: taxCode && taxCode !== "NONE" ? taxCode : null,
      normalBalance,
      openingBalance: Number(openingBalance) || 0,
      status,
      isPostable,
      description: description.trim() || undefined,
    };
    const result = initial ? updateAccount(initial.id, input) : addAccount(input);
    if (result.ok === false) { toast.error(result.error.message); return; }
    // Persist category links keyed by the (possibly new) account code.
    setAccountCategories(input.code, {
      expense: input.groupCode === "EXPENSE" || input.groupCode === "ASSET" ? expenseCategories : [],
      revenue: input.groupCode === "REVENUE" ? revenueCategories : [],
    });
    toast.success(initial ? `${input.name} updated` : `${input.name} added`);
    onOpenChange(false);
  };

  const showExpenseCats = groupCode === "EXPENSE" || groupCode === "ASSET";
  const showRevenueCats = groupCode === "REVENUE";
  const toggleExpenseCat = (c: ExpenseCategory) =>
    setExpenseCategoriesState((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  const toggleRevenueCat = (c: RevenueCategory) =>
    setRevenueCategoriesState((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{initial ? "Edit account" : "New account"}</DialogTitle>
            <DialogDescription>
              Configure the account so it appears in journals, reports, and reconciliation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-[160px_1fr] gap-3">
              <div className="grid gap-2">
                <Label>Account code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="1010" />
                {codeError && <span className="text-[11px] text-destructive">{codeError}</span>}
              </div>
              <div className="grid gap-2">
                <Label>Account name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bank — RBC Operating" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Account group</Label>
                <Select value={groupCode} onValueChange={handleGroupChange}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g.code} value={g.code}>{g.label}</SelectItem>)}
                    <SelectSeparator />
                    <SelectItem value={ADD_NEW}>
                      <span className="flex items-center gap-1.5 text-primary"><Plus className="size-3.5" /> Add new group</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Account type</Label>
                <Select value={typeCode} onValueChange={handleTypeChange} disabled={!groupCode}>
                  <SelectTrigger><SelectValue placeholder={groupCode ? "Select type" : "Pick group first"} /></SelectTrigger>
                  <SelectContent>
                    {typesForGroup.length === 0 && (
                      <div className="px-2 py-1.5 text-[12px] text-muted-foreground">No types yet</div>
                    )}
                    {typesForGroup.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                    <SelectSeparator />
                    <SelectItem value={ADD_NEW}>
                      <span className="flex items-center gap-1.5 text-primary"><Plus className="size-3.5" /> Add new type</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Sub-type</Label>
                <Select value={subTypeCode} onValueChange={handleSubTypeChange} disabled={!typeCode}>
                  <SelectTrigger><SelectValue placeholder={typeCode ? "Optional" : "Pick type first"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {subTypesForType.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
                    <SelectSeparator />
                    <SelectItem value={ADD_NEW}>
                      <span className="flex items-center gap-1.5 text-primary"><Plus className="size-3.5" /> Add new sub-type</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Parent account</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None (top-level) —</SelectItem>
                    {eligibleParents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} · {p.name}{p.isPostable === false ? "  (Header)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">
                  Filtered to {entityId === NONE ? "all-entity" : "this entity's"} {currency} accounts. Headers listed first.
                </span>
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <DynamicSelect listKey="currencies" value={currency} onValueChange={setCurrency} addLabel="currency" />
              </div>

              <div className="grid gap-2">
                <Label>Entity / branch scope</Label>
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All entities</SelectItem>
                    {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tax mapping</Label>
                <DynamicSelect listKey="tax_codes" value={taxCode} onValueChange={setTaxCode} addLabel="tax code" />
              </div>

              <div className="grid gap-2">
                <Label>Normal balance</Label>
                <Select value={normalBalance} onValueChange={(v) => setNormalBalance(v as "DEBIT" | "CREDIT")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Opening balance</Label>
                <Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input">
                  <Switch checked={status === "ACTIVE"} onCheckedChange={(v) => setStatus(v ? "ACTIVE" : "INACTIVE")} />
                  <span className="text-sm">{status === "ACTIVE" ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <div className="grid gap-2 col-span-2">
                <Label>Postable account</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input">
                  <Switch checked={isPostable} onCheckedChange={setIsPostable} />
                  <span className="text-sm">{isPostable ? "Postable" : "Header / group only"}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Turn off for header/group accounts that should not receive journal entries directly.
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional notes about how this account is used." />
            </div>

            {(showExpenseCats || showRevenueCats) && (
              <div className="grid gap-2 rounded-md border border-input p-3">
                <Label className="text-sm">Categories</Label>
                <p className="text-[11px] text-muted-foreground -mt-1">
                  Controls which {showRevenueCats ? "AR service types" : "AP expense categories"} show this account in their dropdown. Leave blank to fall back to auto-matching by account name.
                </p>
                {showExpenseCats && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([code, label]) => {
                      const on = expenseCategories.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => toggleExpenseCat(code)}
                          className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {showRevenueCats && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(Object.entries(REVENUE_CATEGORY_LABELS) as [RevenueCategory, string][]).map(([code, label]) => {
                      const on = revenueCategories.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => toggleRevenueCat(code)}
                          className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!!codeError || !code.trim() || !name.trim() || !groupCode || !typeCode}>
              {initial ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddGroupInlineDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onCreated={(c) => { setGroupCode(c); setTypeCode(""); }}
      />
      <AddTypeInlineDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        defaultGroupCode={groupCode}
        onCreated={(c) => setTypeCode(c)}
      />
      <AddSubTypeInlineDialog
        open={subTypeDialogOpen}
        onOpenChange={setSubTypeDialogOpen}
        defaultTypeCode={typeCode}
        onCreated={(c) => setSubTypeCode(c)}
      />
    </>
  );
}