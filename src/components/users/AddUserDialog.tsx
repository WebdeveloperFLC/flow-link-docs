import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import type { AppRole } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

const schema = z.object({
  first_name: z.string().trim().min(1).max(50),
  last_name: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(40),
  roles: z.array(z.enum(["admin", "commission_admin", "counselor", "documentation", "telecaller", "viewer"])).min(1, "Select at least one role"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  commission_admin: "Commission admin",
  counselor: "Edit – Counselor",
  documentation: "Edit – Documentation",
  telecaller: "Telecaller",
  viewer: "Viewer",
  client: "Client (Portal)",
};

export const AddUserDialog = ({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void; }) => {
  const [busy, setBusy] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>(["viewer"]);
  const [showPw, setShowPw] = useState(false);

  const toggleRole = (r: AppRole, on: boolean) =>
    setRoles((prev) => (on ? Array.from(new Set([...prev, r])) : prev.filter((x) => x !== r)));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      first_name: fd.get("first_name"), last_name: fd.get("last_name"),
      email: fd.get("email"), phone: fd.get("phone"), roles,
      password: fd.get("password"),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "create", ...parsed.data },
    });
    setBusy(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Failed to add user");
      return;
    }
    toast.success("Account created — verification email sent");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add new user</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" key={open ? "o" : "c"}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First name *</Label>
              <Input id="first_name" name="first_name" required maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last name *</Label>
              <Input id="last_name" name="last_name" required maxLength={50} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" name="phone" required />
          </div>
          <div className="space-y-1.5">
            <Label>Roles * <span className="text-muted-foreground font-normal">(select one or more)</span></Label>
            <div className="rounded-md border divide-y">
              {(["admin", "commission_admin", "counselor", "documentation", "telecaller", "viewer"] as AppRole[]).map((r) => (
                <label key={r} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40">
                  <Checkbox checked={roles.includes(r)} onCheckedChange={(v) => toggleRole(r, !!v)} />
                  <span className="text-sm">{ROLE_LABEL[r]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input id="password" name="password" type={showPw ? "text" : "password"} required minLength={8} maxLength={72} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">A verification email will be sent. The user will sign in with the password you set above. Only admins can change passwords later.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gradient-brand text-primary-foreground">{busy ? "Creating…" : "Create account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};