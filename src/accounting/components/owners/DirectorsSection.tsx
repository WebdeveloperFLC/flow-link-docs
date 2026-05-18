import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useOwners } from "../../stores/ownersStore";
import {
  useDirectorsForCompany, addDirector, removeDirector,
} from "../../stores/ownerDirectorsStore";
import {
  ownerDisplayName, ownerInitials, avatarColorClass,
} from "../../data/mockOwners";

const ROLES = ["Director", "Shareholder", "Partner"] as const;

export default function DirectorsSection({ companyId }: { companyId: string }) {
  const links = useDirectorsForCompany(companyId);
  const owners = useOwners();
  const byId = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Users className="size-4" />
          <h3 className="font-semibold">Directors &amp; shareholders</h3>
          <span className="text-xs text-muted-foreground">({links.length})</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add director
        </Button>
      </div>

      <div className="px-4 pb-4">
        {links.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 px-2">
            No directors linked. Add one to track ownership.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {links.map((l) => {
              const ind = byId.get(l.individualProfileId);
              return (
                <Card key={l.id} className="p-3 flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0",
                    avatarColorClass(l.individualProfileId),
                  )}>
                    {ind ? ownerInitials(ind) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {ind ? (
                        <Link to={`/accounting/owners/${ind.id}`} className="hover:underline">
                          {ownerDisplayName(ind)}
                        </Link>
                      ) : "Unknown profile"}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80">{l.role}</span>
                      {l.ownershipPercent != null && (
                        <span>{l.ownershipPercent}% ownership</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await removeDirector(l.id);
                      toast.success("Director removed");
                    }}
                    aria-label="Remove director"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddDirectorDialog
        open={open}
        onOpenChange={setOpen}
        companyId={companyId}
        existingIndividualIds={new Set(links.map((l) => l.individualProfileId))}
      />
    </Card>
  );
}

function AddDirectorDialog({
  open, onOpenChange, companyId, existingIndividualIds,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  existingIndividualIds: Set<string>;
}) {
  const owners = useOwners();
  const [individualId, setIndividualId] = useState("");
  const [role, setRole] = useState<string>("Director");
  const [pct, setPct] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(
    () => owners
      .filter((o) => o.category === "PERSONAL" && !existingIndividualIds.has(o.id))
      .sort((a, b) => ownerDisplayName(a).localeCompare(ownerDisplayName(b))),
    [owners, existingIndividualIds],
  );

  async function submit() {
    if (!individualId) { toast.error("Pick a person"); return; }
    const pctNum = pct.trim() === "" ? null : Number(pct);
    if (pctNum != null && (Number.isNaN(pctNum) || pctNum < 0 || pctNum > 100)) {
      toast.error("Ownership % must be between 0 and 100"); return;
    }
    setSaving(true);
    const created = await addDirector({
      companyProfileId: companyId,
      individualProfileId: individualId,
      role,
      ownershipPercent: pctNum,
    });
    setSaving(false);
    if (created) {
      toast.success("Director added");
      setIndividualId(""); setRole("Director"); setPct("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add director</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Person</Label>
            <Select value={individualId} onValueChange={setIndividualId}>
              <SelectTrigger><SelectValue placeholder="Select an individual profile" /></SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No personal profiles available. Create one first.
                  </div>
                ) : candidates.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{ownerDisplayName(o)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ownership % (optional)</Label>
            <Input
              type="number" min={0} max={100} step="0.001"
              value={pct} onChange={(e) => setPct(e.target.value)}
              placeholder="e.g. 51"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}