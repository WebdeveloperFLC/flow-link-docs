import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronDown, Plus, ShieldCheck, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchModuleAccessList,
  saveSingleModulePermission,
  ModuleAccessLevel,
} from "@/lib/modulePermissions";
import { logActivity } from "@/lib/activity";
import { AppRole } from "@/contexts/AuthContext";

interface Profile { id: string; email: string | null; full_name: string | null; status?: string | null; }
interface RoleRow { user_id: string; role: AppRole; }

interface Props {
  module: "institutions" | "commissions" | "digital_success_hub";
  title: string;
  description: string;
  profiles: Profile[];
  roles: RoleRow[];
}

const LEVEL_LABEL: Record<Exclude<ModuleAccessLevel, "none">, string> = {
  view: "View",
  edit: "Edit",
  delete: "Delete",
};

export function ModuleAccessCard({ module, title, description, profiles, roles }: Props) {
  const [rows, setRows] = useState<Array<{ user_id: string; level: Exclude<ModuleAccessLevel, "none"> }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);

  const adminIds = useMemo(
    () => new Set(roles.filter((r) => r.role === "admin").map((r) => r.user_id)),
    [roles],
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchModuleAccessList(module);
      setRows(
        data
          .filter((r) => r.can_view || r.can_edit || r.can_delete)
          .map((r) => ({
            user_id: r.user_id,
            level: r.can_delete ? "delete" : r.can_edit ? "edit" : "view",
          })),
      );
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load access list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [module]);

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const nameOf = (id: string) => {
    const p = profileById.get(id);
    return p?.full_name || p?.email || id;
  };

  const explicit = rows.filter((r) => !adminIds.has(r.user_id));
  const adminProfiles = profiles.filter((p) => adminIds.has(p.id));
  const assignedIds = new Set([...explicit.map((r) => r.user_id), ...adminProfiles.map((p) => p.id)]);
  const grantCandidates = profiles
    .filter((p) => (p.status ?? "active") === "active" && !assignedIds.has(p.id));

  const setLevel = async (userId: string, level: ModuleAccessLevel) => {
    setBusy(userId);
    try {
      await saveSingleModulePermission(userId, module, level);
      await logActivity("user.module_access_changed", "user", userId, { module, level });
      toast.success(level === "none" ? "Access revoked" : `Access set to ${LEVEL_LABEL[level]}`);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to update access");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5 shadow-elev-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Popover open={grantOpen} onOpenChange={setGrantOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="shrink-0">
              <Plus className="size-3.5 mr-1" /> Grant access
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <Command>
              <CommandInput placeholder="Search teammate…" />
              <CommandList>
                <CommandEmpty>No teammates available.</CommandEmpty>
                <CommandGroup heading="Grant View access">
                  {grantCandidates.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.full_name ?? ""} ${p.email ?? ""}`}
                      onSelect={async () => {
                        setGrantOpen(false);
                        await setLevel(p.id, "view");
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{p.full_name ?? p.email ?? p.id}</span>
                        {p.full_name && p.email && (
                          <span className="text-[11px] text-muted-foreground">{p.email}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-1.5">
          {adminProfiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/40">
              <div className="min-w-0">
                <div className="text-sm truncate">{p.full_name ?? p.email ?? p.id}</div>
              </div>
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <ShieldCheck className="size-3" /> Full access
              </Badge>
            </div>
          ))}

          {explicit.length === 0 && adminProfiles.length === 0 && (
            <div className="text-xs text-muted-foreground py-4 text-center">
              No one has access yet. Click <b>Grant access</b> to add a teammate.
            </div>
          )}

          {explicit.map((row) => {
            const isBusy = busy === row.user_id;
            return (
              <div key={row.user_id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40">
                <div className="min-w-0 text-sm truncate">{nameOf(row.user_id)}</div>
                <div className="flex items-center gap-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isBusy}>
                        {isBusy ? <Loader2 className="size-3 animate-spin" /> : LEVEL_LABEL[row.level]}
                        <ChevronDown className="size-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(["view", "edit", "delete"] as const).map((lvl) => (
                        <DropdownMenuItem key={lvl} onClick={() => setLevel(row.user_id, lvl)}>
                          {LEVEL_LABEL[lvl]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    disabled={isBusy}
                    onClick={() => setLevel(row.user_id, "none")}
                    title="Revoke"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}