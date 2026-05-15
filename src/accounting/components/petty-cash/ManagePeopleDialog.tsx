import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { usePettyCash } from "../../stores/pettyCashStore";
import { PettyPersonRole } from "../../types/pettyCash";

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

export function ManagePeopleDialog({ open, onOpenChange }: Props) {
  const { people, addPerson } = usePettyCash();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage custodians, approvers & employees</DialogTitle>
          <div className="text-xs text-muted-foreground">Add or review the people who can be selected on petty-cash branches and vouchers. No limit on entries.</div>
        </DialogHeader>

        <Tabs defaultValue="custodian">
          <TabsList>
            <TabsTrigger value="custodian">Custodians ({people.filter(p => p.role === "custodian").length})</TabsTrigger>
            <TabsTrigger value="approver">Approvers ({people.filter(p => p.role === "approver").length})</TabsTrigger>
            <TabsTrigger value="employee">Employees ({people.filter(p => p.role === "employee").length})</TabsTrigger>
          </TabsList>

          {(["custodian", "approver", "employee"] as PettyPersonRole[]).map(role => (
            <TabsContent key={role} value={role} className="mt-4">
              <PeopleSection
                role={role}
                people={people.filter(p => p.role === role)}
                onAdd={(name, email) => {
                  addPerson({ name, email, role });
                  toast.success(`${role[0].toUpperCase()}${role.slice(1)} added`);
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

function PeopleSection({ role, people, onAdd }: { role: PettyPersonRole; people: { id: string; name: string; email?: string }[]; onAdd: (name: string, email?: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const submit = () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    onAdd(name.trim(), email.trim() || undefined);
    setName(""); setEmail("");
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${role} name`} />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" />
        <Button onClick={submit}><Plus className="size-4 mr-1.5" /> Add</Button>
      </div>
      <div className="max-h-[260px] overflow-y-auto border rounded-md divide-y">
        {people.map(p => (
          <div key={p.id} className="px-3 py-2 flex items-center justify-between text-sm">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-muted-foreground">{p.email ?? "—"}</div>
          </div>
        ))}
        {people.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No {role}s yet.</div>}
      </div>
    </div>
  );
}