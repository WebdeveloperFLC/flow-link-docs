import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  role: z.enum(["admin", "counselor", "documentation", "telecaller", "viewer"]),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  counselor: "Edit – Counselor",
  documentation: "Edit – Documentation",
  telecaller: "Telecaller",
  viewer: "Viewer",
  client: "Client (Portal)",
};

export const AddUserDialog = ({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void; }) => {
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<AppRole>("viewer");
  const [showPw, setShowPw] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      first_name: fd.get("first_name"), last_name: fd.get("last_name"),
      email: fd.get("email"), phone: fd.get("phone"), role,
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
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["admin", "counselor", "documentation", "telecaller", "viewer"] as AppRole[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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