import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AccountingRole, AccountingUser, ROLE_DESCRIPTIONS } from "../../types/accountingUsers";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { ROLE_OPTIONS } from "./RoleBadge";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInvite: (u: AccountingUser) => void;
}

export default function InviteUserDialog({ open, onOpenChange, onInvite }: Props) {
  const entities = useEntities();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AccountingRole>("ACCOUNTANT");
  const [scope, setScope] = useState<string[]>(["*"]);

  const allEntities = scope.includes("*");
  const toggleEntity = (id: string) => {
    setScope((prev) => {
      const without = prev.filter((p) => p !== "*");
      return without.includes(id) ? without.filter((p) => p !== id) : [...without, id];
    });
  };

  const submit = () => {
    if (!email.trim()) { toast.error("Email is required"); return; }
    onInvite({
      id: `u-${Date.now().toString(36)}`,
      name: name.trim() || email.split("@")[0],
      email: email.trim(),
      role,
      entityScope: scope.length ? scope : ["*"],
      mfaEnabled: false,
      status: "INVITED",
    });
    toast.success(`Invite sent to ${email}`);
    onOpenChange(false);
    setEmail(""); setName(""); setRole("ACCOUNTANT"); setScope(["*"]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>Send an invite to grant access to the accounting workspace.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </div>
          <div className="grid gap-2">
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AccountingRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.replace(/_/g, " ")}</span>
                      <span className="text-[11px] text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Entity scope</Label>
            <div className="border border-border rounded-md p-3 max-h-[180px] overflow-auto space-y-2">
              <label className="flex items-center gap-2 text-[13px]">
                <Checkbox checked={allEntities} onCheckedChange={(v) => setScope(v ? ["*"] : [])} />
                <span className="font-medium">All entities</span>
              </label>
              <div className="border-t border-border pt-2 space-y-1.5">
                {entities.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-[13px]">
                    <Checkbox
                      checked={!allEntities && scope.includes(e.id)}
                      disabled={allEntities}
                      onCheckedChange={() => toggleEntity(e.id)}
                    />
                    <span>{e.name}</span>
                    <span className="text-[11px] text-muted-foreground">{e.currency}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Send invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}