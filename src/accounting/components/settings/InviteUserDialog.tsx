import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  onCreated: (u: AccountingUser) => void;
}

export default function InviteUserDialog({ open, onOpenChange, onCreated }: Props) {
  const entities = useEntities();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AccountingRole>("ACCOUNTANT");
  const [scope, setScope] = useState<string[]>(["*"]);
  const [submitting, setSubmitting] = useState(false);

  const allEntities = scope.includes("*");
  const toggleEntity = (id: string) => {
    setScope((prev) => {
      const without = prev.filter((p) => p !== "*");
      return without.includes(id) ? without.filter((p) => p !== id) : [...without, id];
    });
  };

  const submit = async () => {
    if (!email.trim()) { toast.error("Email is required"); return; }
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-create-user", {
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          entity_scope: scope.length ? scope : ["*"],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const row = data.user;
      onCreated({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        entityScope: row.entity_scope ?? ["*"],
        mfaEnabled: !!row.mfa_enabled,
        lastLogin: row.last_login ?? undefined,
        status: row.status,
      });
      toast.success(`Account created for ${email}. They can sign in immediately.`);
      onOpenChange(false);
      setEmail(""); setName(""); setPassword(""); setRole("ACCOUNTANT"); setScope(["*"]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add new user</DialogTitle>
          <DialogDescription>
            Create an account with a temporary password. The user can sign in immediately and change
            their password after first login.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </div>
          <div className="grid gap-2">
            <Label>Temporary password</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <p className="text-[11px] text-muted-foreground">Share this with the user securely. They can change it after signing in.</p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Creating..." : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}