import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { usePettyCash } from "../../stores/pettyCashStore";
import { PETTY_PERSON_ROLE_META, PettyPersonRole } from "../../types/pettyCash";

const ROLES: PettyPersonRole[] = ["custodian", "approver", "authority"];

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

export function ManagePeopleDialog({ open, onOpenChange }: Props) {
  const { people, addPerson, removePerson } = usePettyCash();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Custodians, approvers &amp; authority</DialogTitle>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Build name lists for dropdowns when configuring branches and vouchers.</p>
            <p>
              Per-branch <strong>custodian</strong> and <strong>approver</strong>: Manage →{" "}
              <strong>Branch custodian &amp; approver</strong>.
            </p>
            <p>
              <strong>Reimbursement payees</strong> are entered on each voucher (not here).{" "}
              <strong>Authority</strong> is for finance / senior sign-off above ₹5,000.
            </p>
          </div>
        </DialogHeader>

        <Tabs defaultValue="custodian">
          <TabsList>
            {ROLES.map((role) => (
              <TabsTrigger key={role} value={role}>
                {PETTY_PERSON_ROLE_META[role].tab} ({people.filter((p) => p.role === role).length})
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map((role) => (
            <TabsContent key={role} value={role} className="mt-4">
              <PeopleSection
                role={role}
                people={people.filter((p) => p.role === role)}
                onAdd={(name, email) => {
                  addPerson({ name, email, role });
                  toast.success(PETTY_PERSON_ROLE_META[role].addedToast);
                }}
                onRemove={(id) => {
                  if (removePerson(id)) toast.success("Removed");
                }}
              />
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeopleSection({
  role,
  people,
  onAdd,
  onRemove,
}: {
  role: PettyPersonRole;
  people: { id: string; name: string; email?: string }[];
  onAdd: (name: string, email?: string) => void;
  onRemove: (id: string) => void;
}) {
  const meta = PETTY_PERSON_ROLE_META[role];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const submit = () => {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    onAdd(name.trim(), email.trim() || undefined);
    setName("");
    setEmail("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{meta.hint}</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={meta.placeholder} />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" />
        <Button onClick={submit}>
          <Plus className="size-4 mr-1.5" /> Add
        </Button>
      </div>
      <div className="max-h-[260px] overflow-y-auto border rounded-md divide-y">
        {people.map((p) => (
          <div key={p.id} className="px-3 py-2 flex items-center gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.email ?? "—"}</div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              title={`Remove ${p.name}`}
              onClick={() => onRemove(p.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {people.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No entries yet.</div>
        )}
      </div>
    </div>
  );
}
