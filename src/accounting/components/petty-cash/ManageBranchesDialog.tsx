import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePettyCash } from "../../stores/pettyCashStore";
import { ExtensibleSelect } from "./ExtensibleSelect";
import { AddOptionDialog } from "./AddOptionDialog";
import { PettyPersonRole } from "../../types/pettyCash";
import { formatCurrency } from "../../lib/format";
import { displayBranchApprover, displayBranchCustodian } from "../../lib/pettyCashEntityBranches";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When set, opens the editor for this entity branch id. */
  initialBranchId?: string | null;
}

export function ManageBranchesDialog({ open, onOpenChange, initialBranchId }: Props) {
  const { branches, people, updateBranch, addPerson } = usePettyCash();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    custodianName: "",
    secondaryApproverName: "",
    openingFloat: "10000",
  });
  const [addPersonRole, setAddPersonRole] = useState<PettyPersonRole | null>(null);
  const [activeFor, setActiveFor] = useState<"custodian" | "approver" | null>(null);

  const custodians = people.filter(p => p.role === "custodian");
  const approvers = people.filter(p => p.role === "approver");

  const startEdit = (id: string) => {
    const b = branches.find(x => x.id === id);
    if (!b) return;
    setEditingId(id);
    const custodian =
      b.custodianName === "Branch custodian" || !b.custodianName.trim() ? "" : b.custodianName;
    setDraft({
      custodianName: custodian,
      secondaryApproverName: b.secondaryApproverName ?? "",
      openingFloat: String(b.openingFloat),
    });
  };

  const custodianEmailFor = (name: string) =>
    custodians.find(p => p.name === name)?.email?.trim() ?? "";

  useEffect(() => {
    if (open && initialBranchId) {
      startEdit(initialBranchId);
    }
    if (!open) {
      setEditingId(null);
    }
  }, [open, initialBranchId, branches]);

  const save = () => {
    if (!editingId || !draft.custodianName.trim()) {
      toast.error("Custodian is required");
      return;
    }
    const opening = parseFloat(draft.openingFloat) || 0;
    updateBranch(editingId, {
      custodianName: draft.custodianName,
      secondaryApproverName: draft.secondaryApproverName || undefined,
      openingFloat: opening,
      custodianEmail: custodianEmailFor(draft.custodianName),
    });
    toast.success("Petty cash settings saved for this branch");
    setEditingId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Branch custodian &amp; approver</DialogTitle>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Each location has its own custodian and approver. Branch names come from{" "}
                <strong>Settings → Entities</strong>; use the pencil on a row to assign people and float.
              </p>
              <Link
                to="/accounting/settings/entities"
                className="inline-flex items-center gap-1 text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Open Entities <ExternalLink className="size-3" />
              </Link>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-md divide-y max-h-[280px] overflow-y-auto">
              {branches.map(b => (
                <div key={b.id} className="px-3 py-2 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Code {b.code} · Custodian: {displayBranchCustodian(b.custodianName)} · Approver: {displayBranchApprover(b.secondaryApproverName)} · Float {formatCurrency(b.openingFloat, "INR")}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(b.id)}><Pencil className="size-3.5" /></Button>
                </div>
              ))}
              {branches.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No BRANCH or SUB BRANCH entities yet. Add them under Settings → Entities.
                </div>
              )}
            </div>

            {editingId && (
              <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                <div className="text-sm font-semibold">
                  {branches.find(b => b.id === editingId)?.name ?? "Branch"}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Custodian *</Label>
                    <ExtensibleSelect
                      value={draft.custodianName}
                      onValueChange={(v) => setDraft(d => ({ ...d, custodianName: v }))}
                      options={custodians.map(p => ({ value: p.name, label: p.name }))}
                      placeholder="Select custodian"
                      canAdd onAdd={() => { setAddPersonRole("custodian"); setActiveFor("custodian"); }}
                      addLabel="Add custodian…"
                    />
                    {draft.custodianName && (
                      <p className="text-[11px] text-muted-foreground">
                        {custodianEmailFor(draft.custodianName)
                          ? `Email: ${custodianEmailFor(draft.custodianName)} (from name list)`
                          : "No email on file — add or edit the custodian under Manage → Name list."}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5"><Label>Secondary approver</Label>
                    <ExtensibleSelect
                      value={draft.secondaryApproverName}
                      onValueChange={(v) => setDraft(d => ({ ...d, secondaryApproverName: v }))}
                      options={approvers.map(p => ({ value: p.name, label: p.name }))}
                      placeholder="Select approver"
                      canAdd onAdd={() => { setAddPersonRole("approver"); setActiveFor("approver"); }}
                      addLabel="Add approver…"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2"><Label>Opening float (INR)</Label>
                    <Input type="number" value={draft.openingFloat} onChange={(e) => setDraft(d => ({ ...d, openingFloat: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button onClick={save}>Save settings</Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddOptionDialog
        open={addPersonRole !== null}
        onOpenChange={(v) => { if (!v) setAddPersonRole(null); }}
        title={`Add ${addPersonRole}`}
        fields={[
          { key: "name", label: "Name", required: true },
          { key: "email", label: "Email", type: "email", placeholder: "optional" },
        ]}
        onSubmit={(values) => {
          if (!addPersonRole) return;
          const p = addPerson({ name: values.name, email: values.email, role: addPersonRole });
          if (activeFor === "custodian") setDraft(d => ({ ...d, custodianName: p.name }));
          if (activeFor === "approver") setDraft(d => ({ ...d, secondaryApproverName: p.name }));
          toast.success(`${addPersonRole} added`);
        }}
      />
    </>
  );
}
