import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
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

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

export function ManageBranchesDialog({ open, onOpenChange }: Props) {
  const { branches, people, addBranch, updateBranch, addPerson } = usePettyCash();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", code: "", custodianName: "", secondaryApproverName: "", openingFloat: "10000", custodianEmail: "" });
  const [addPersonRole, setAddPersonRole] = useState<PettyPersonRole | null>(null);
  const [activeFor, setActiveFor] = useState<"create" | string | null>(null);

  const custodians = people.filter(p => p.role === "custodian");
  const approvers = people.filter(p => p.role === "approver");

  const startCreate = () => {
    setEditingId("__new__");
    setDraft({ name: "", code: "", custodianName: custodians[0]?.name ?? "", secondaryApproverName: "", openingFloat: "10000", custodianEmail: "" });
  };

  const startEdit = (id: string) => {
    const b = branches.find(x => x.id === id)!;
    setEditingId(id);
    setDraft({
      name: b.name, code: b.code, custodianName: b.custodianName,
      secondaryApproverName: b.secondaryApproverName ?? "",
      openingFloat: String(b.openingFloat), custodianEmail: b.custodianEmail,
    });
  };

  const save = () => {
    if (!draft.name.trim() || !draft.code.trim() || !draft.custodianName) {
      toast.error("Branch name, code, and custodian are required");
      return;
    }
    const opening = parseFloat(draft.openingFloat) || 0;
    if (editingId === "__new__") {
      addBranch({
        name: draft.name, code: draft.code, custodianName: draft.custodianName,
        secondaryApproverName: draft.secondaryApproverName || undefined,
        openingFloat: opening, custodianEmail: draft.custodianEmail || undefined,
      });
      toast.success("Branch added");
    } else if (editingId) {
      updateBranch(editingId, {
        name: draft.name, code: draft.code, custodianName: draft.custodianName,
        secondaryApproverName: draft.secondaryApproverName || undefined,
        openingFloat: opening, custodianEmail: draft.custodianEmail,
      });
      toast.success("Branch updated");
    }
    setEditingId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage branches</DialogTitle>
            <div className="text-xs text-muted-foreground">Add unlimited branches and assign a custodian and approver to each.</div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={startCreate}><Plus className="size-4 mr-1.5" /> New branch</Button>
            </div>

            <div className="border rounded-md divide-y max-h-[280px] overflow-y-auto">
              {branches.map(b => (
                <div key={b.id} className="px-3 py-2 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{b.name} <span className="text-xs text-muted-foreground font-mono">· {b.code}</span></div>
                    <div className="text-xs text-muted-foreground truncate">
                      Custodian: {b.custodianName} · Approver: {b.secondaryApproverName ?? "—"} · Float {formatCurrency(b.openingFloat, "INR")}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(b.id)}><Pencil className="size-3.5" /></Button>
                </div>
              ))}
              {branches.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No branches yet.</div>}
            </div>

            {editingId && (
              <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                <div className="text-sm font-semibold">{editingId === "__new__" ? "New branch" : "Edit branch"}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Branch name *</Label>
                    <Input value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Jaipur Branch" />
                  </div>
                  <div className="space-y-1.5"><Label>Code *</Label>
                    <Input value={draft.code} onChange={(e) => setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="JAI" />
                  </div>
                  <div className="space-y-1.5"><Label>Custodian *</Label>
                    <ExtensibleSelect
                      value={draft.custodianName}
                      onValueChange={(v) => setDraft(d => ({ ...d, custodianName: v }))}
                      options={custodians.map(p => ({ value: p.name, label: p.name }))}
                      placeholder="Select custodian"
                      canAdd onAdd={() => { setAddPersonRole("custodian"); setActiveFor("custodian"); }}
                      addLabel="Add custodian…"
                    />
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
                  <div className="space-y-1.5"><Label>Opening float (INR)</Label>
                    <Input type="number" value={draft.openingFloat} onChange={(e) => setDraft(d => ({ ...d, openingFloat: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5"><Label>Custodian email</Label>
                    <Input type="email" value={draft.custodianEmail} onChange={(e) => setDraft(d => ({ ...d, custodianEmail: e.target.value }))} placeholder="optional" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button onClick={save}>Save branch</Button>
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