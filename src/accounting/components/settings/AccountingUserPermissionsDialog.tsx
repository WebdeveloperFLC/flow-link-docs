import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { AccountingRole } from "../../types/accountingUsers";
import {
  ACCT_MODULES, ACCT_ROLE_DEFAULTS, AcctPermissionMap,
  acctEmptyMap, fetchAcctPermissions, saveAcctPermissions,
} from "../../lib/accountingModulePermissions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName: string;
  role: AccountingRole;
}

export default function AccountingUserPermissionsDialog({ open, onOpenChange, userId, userName, role }: Props) {
  const isFull = role === "SUPER_ADMIN" || role === "FINANCE_ADMIN";
  const [map, setMap] = useState<AcctPermissionMap>(acctEmptyMap());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isFull) { setMap(ACCT_ROLE_DEFAULTS[role]); return; }
    setLoading(true);
    fetchAcctPermissions(userId)
      .then((m) => {
        const hasAny = Object.values(m).some((p) => p.view || p.edit || p.delete);
        setMap(hasAny ? m : (ACCT_ROLE_DEFAULTS[role] ?? acctEmptyMap()));
      })
      .catch((e) => toast.error(e?.message ?? "Failed to load permissions"))
      .finally(() => setLoading(false));
  }, [open, userId, role, isFull]);

  const toggle = (mod: string, level: "view" | "edit" | "delete", v: boolean) => {
    setMap((prev) => {
      const cur = { ...(prev[mod] ?? { view: false, edit: false, delete: false }) };
      cur[level] = v;
      if (level === "view" && !v) { cur.edit = false; cur.delete = false; }
      if ((level === "edit" || level === "delete") && v) cur.view = true;
      if (level === "edit" && !v) cur.delete = false;
      if (level === "delete" && v) cur.edit = true;
      return { ...prev, [mod]: cur };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveAcctPermissions(userId, map);
      toast.success("Permissions updated");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Module access — {userName}</DialogTitle>
          <DialogDescription>
            Pick which accounting sections this user can View, Edit, or Delete.
          </DialogDescription>
        </DialogHeader>

        {isFull && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 text-primary text-sm">
            <ShieldCheck className="size-4" />
            {role.replace("_", " ")} has full access to every accounting section.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto">
            <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
              <div>Section</div>
              <div className="text-center">View</div>
              <div className="text-center">Edit</div>
              <div className="text-center">Delete</div>
            </div>
            <div className="divide-y">
              {ACCT_MODULES.map((m) => {
                const p = map[m.key] ?? { view: false, edit: false, delete: false };
                return (
                  <div key={m.key} className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 px-3 py-2.5 items-center">
                    <div className="text-sm font-medium truncate">{m.label}</div>
                    {(["view", "edit", "delete"] as const).map((lvl) => (
                      <div key={lvl} className="flex justify-center">
                        <Checkbox
                          checked={p[lvl]}
                          disabled={isFull}
                          onCheckedChange={(v) => toggle(m.key, lvl, !!v)}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setMap(ACCT_ROLE_DEFAULTS[role] ?? acctEmptyMap())} disabled={isFull || loading || saving}>
            Reset to role defaults
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={isFull || loading || saving}>
            {saving ? "Saving…" : "Save permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}