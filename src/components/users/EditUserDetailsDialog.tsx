import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { callAdminUsers } from "@/lib/adminUsers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Opt { id: string; name: string; }

interface EditUserDetails {
  id: string;
  full_name: string | null;
}

export const EditUserDetailsDialog = ({
  user, onOpenChange, onSaved,
}: {
  user: EditUserDetails | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) => {
  const open = !!user;
  const [busy, setBusy] = useState(false);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [departments, setDepartments] = useState<Opt[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [designation, setDesignation] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [b, d, current] = await Promise.all([
        supabase.from("branches").select("id, name").eq("is_active", true).order("display_order"),
        supabase.from("departments").select("id, name").eq("is_active", true).order("display_order"),
        supabase.from("profiles").select("branch_id, department_id, designation, phone").eq("id", user.id).maybeSingle(),
      ]);
      setBranches((b.data ?? []) as Opt[]);
      setDepartments((d.data ?? []) as Opt[]);
      const cur = current.data as any;
      setBranchId(cur?.branch_id ?? "");
      setDepartmentId(cur?.department_id ?? "");
      setDesignation(cur?.designation ?? "");
      setPhone(cur?.phone ?? "");
    })();
  }, [open, user?.id]);

  const onSave = async () => {
    if (!user) return;
    if (!departmentId) { toast.error("Department is required"); return; }
    if (!phone.trim()) { toast.error("Phone is required"); return; }
    setBusy(true);
    try {
      await callAdminUsers({
        action: "update",
        user_id: user.id,
        phone: phone.trim(),
        branch_id: branchId || null,
        department_id: departmentId,
        designation: designation.trim() || null,
      });
      toast.success("Details updated");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit details{user?.full_name ? ` — ${user.full_name}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_branch">Branch <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <select
                id="edit_branch"
                className="w-full border rounded-md h-10 px-2 bg-background text-sm"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">— all / none —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_dept">Department *</Label>
              <select
                id="edit_dept"
                className="w-full border rounded-md h-10 px-2 bg-background text-sm"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">— select —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_phone">Phone *</Label>
            <Input
              id="edit_phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              placeholder="e.g. +14162942739"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_designation">Designation</Label>
            <Input id="edit_designation" value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={80} placeholder="e.g. Senior Counselor" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={busy} onClick={onSave}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
