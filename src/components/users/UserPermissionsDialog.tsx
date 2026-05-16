import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  CRM_MODULES, PermissionMap, ROLE_DEFAULTS, RoleKey,
  emptyMap, fetchUserPermissions, saveUserPermissions,
} from "@/lib/modulePermissions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName: string;
  role: RoleKey;
}

export function UserPermissionsDialog({ open, onOpenChange, userId, userName, role }: Props) {
  const isAdmin = role === "admin";
  const [map, setMap] = useState<PermissionMap>(emptyMap());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isAdmin) {
      setMap(ROLE_DEFAULTS.admin);
      return;
    }
    setLoading(true);
    fetchUserPermissions(userId)
      .then((m) => {
        const hasAny = Object.values(m).some((p) => p.view || p.edit || p.delete);
        setMap(hasAny ? m : (ROLE_DEFAULTS[role] ?? emptyMap()));
      })
      .catch((e) => toast.error(e?.message ?? "Failed to load permissions"))
      .finally(() => setLoading(false));
  }, [open, userId, role, isAdmin]);

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

  const resetDefaults = () => setMap(ROLE_DEFAULTS[role] ?? emptyMap());

  const save = async () => {
    setSaving(true);
    try {
      await saveUserPermissions(userId, map);
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
            Check what this user can View, Edit, or Delete in each section.
          </DialogDescription>
        </DialogHeader>

        {isAdmin && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 text-primary text-sm">
            <ShieldCheck className="size-4" />
            Administrators automatically have full access to every section.
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
              {CRM_MODULES.map((m) => {
                const p = map[m.key] ?? { view: false, edit: false, delete: false };
                return (
                  <div key={m.key} className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 px-3 py-2.5 items-center">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.label}</div>
                      {m.description && <div className="text-[11px] text-muted-foreground truncate">{m.description}</div>}
                    </div>
                    {(["view", "edit", "delete"] as const).map((lvl) => (
                      <div key={lvl} className="flex justify-center">
                        <Checkbox
                          checked={p[lvl]}
                          disabled={isAdmin}
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
          <Button variant="outline" onClick={resetDefaults} disabled={isAdmin || loading || saving}>
            Reset to role defaults
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={isAdmin || loading || saving}>
            {saving ? "Saving…" : "Save permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}