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
import { useGroups, useTypes } from "../../stores/coaMasterStore";
import { addAccount, getAccounts, getDescendantIds, updateAccount } from "../../stores/coaStore";
import { useEntities } from "../../stores/accountingEntitiesStore";
import AddGroupInlineDialog from "./AddGroupInlineDialog";
import AddTypeInlineDialog from "./AddTypeInlineDialog";

const CURRENCIES = ["CAD", "USD", "INR", "EUR", "GBP", "AED", "AUD", "SGD", "CZK"];

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
  const entities = useEntities();
  const accounts = getAccounts();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [parentId, setParentId] = useState<string>(NONE);
  const [currency, setCurrency] = useState("CAD");
  const [entityId, setEntityId] = useState<string>(NONE);
  const [taxCode, setTaxCode] = useState("");
  const [openingBalance, setOpeningBalance] = useState<string>("0");
  const [status, setStatus] = useState<CoaAccountStatus>("ACTIVE");
  const [description, setDescription] = useState("");

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCode(initial.code);
      setName(initial.name);
      setGroupCode(initial.groupCode);
      setTypeCode(initial.typeCode);
      setParentId(initial.parentId ?? NONE);
      setCurrency(initial.currency);
      setEntityId(initial.entityId ?? NONE);
      setTaxCode(initial.taxCode ?? "");
      setOpeningBalance(String(initial.openingBalance));
      setStatus(initial.status);
      setDescription(initial.description ?? "");
    } else {
      const parent = forcedParentId ? accounts.find((a) => a.id === forcedParentId) : null;
      setCode("");
      setName("");
      setGroupCode(parent?.groupCode ?? groups[0]?.code ?? "");
      setTypeCode(parent?.typeCode ?? "");
      setParentId(forcedParentId ?? NONE);
      setCurrency(parent?.currency ?? "CAD");
      setEntityId(parent?.entityId ?? NONE);
      setTaxCode("");
      setOpeningBalance("0");
      setStatus("ACTIVE");
      setDescription("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, forcedParentId]);

  const typesForGroup = useMemo(
    () => types.filter((t) => t.groupCode === groupCode),
    [types, groupCode],
  );

  const eligibleParents = useMemo(() => {
    const excluded = initial ? new Set([initial.id, ...getDescendantIds(initial.id)]) : new Set<string>();
    return accounts.filter((a) => a.groupCode === groupCode && !excluded.has(a.id));
  }, [accounts, groupCode, initial]);

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
    }
    setParentId(NONE);
  };

  const handleTypeChange = (v: string) => {
    if (v === ADD_NEW) { setTypeDialogOpen(true); return; }
    setTypeCode(v);
  };

  const submit = () => {
    const input: CoaAccountInput = {
      code: code.trim(),
      name: name.trim(),
      groupCode,
      typeCode,
      parentId: parentId === NONE ? null : parentId,
      currency,
      entityId: entityId === NONE ? null : entityId,
      taxCode: taxCode.trim() || null,
      openingBalance: Number(openingBalance) || 0,
      status,
      description: description.trim() || undefined,
    };
    const result = initial ? updateAccount(initial.id, input) : addAccount(input);
    if (result.ok === false) { toast.error(result.error.message); return; }
    toast.success(initial ? `${input.name} updated` : `${input.name} added`);
    onOpenChange(false);
  };

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
                <Label>Parent account</Label>
                <Select value={parentId} onValueChange={setParentId} disabled={!groupCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None (top-level) —</SelectItem>
                    {eligibleParents.map((a) =>
                      <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                <Input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} placeholder="e.g. HST-13%, GST-18%" />
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
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional notes about how this account is used." />
            </div>
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
    </>
  );
}