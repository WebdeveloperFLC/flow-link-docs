import { useMemo, useState } from "react";
import { Eye, Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/appRoles";
import { PREVIEWABLE_APP_ROLES, VIEW_AS_ROLE_LABELS } from "@/lib/roleViewAs";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function RoleViewSwitcher() {
  const {
    loading,
    canUseViewAs,
    viewAsRole,
    setViewAsRole,
    isSuperRoleViewer,
    previewRoleCatalog,
    setPreviewRoleCatalog,
    viewAsOptions,
    actualRoles,
  } = useAuth();

  const [catalogOpen, setCatalogOpen] = useState(false);

  const selectValue = viewAsRole ?? "__all__";

  const currentLabel = useMemo(() => {
    if (!viewAsRole) {
      if (actualRoles.length === 1) return VIEW_AS_ROLE_LABELS[actualRoles[0]];
      return "All my roles";
    }
    return VIEW_AS_ROLE_LABELS[viewAsRole];
  }, [viewAsRole, actualRoles]);

  if (loading || !canUseViewAs) return null;

  return (
    <div
      className={cn(
        "hidden sm:flex items-center gap-1 rounded-full border px-2 py-0.5",
        viewAsRole
          ? "border-amber-400/60 bg-amber-50/90 dark:bg-amber-950/40"
          : "border-border/60 bg-muted/40",
      )}
      data-testid="role-view-switcher"
    >
      <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
        View as
      </span>
      <Select
        value={selectValue}
        onValueChange={(v) => setViewAsRole(v === "__all__" ? null : (v as AppRole))}
      >
        <SelectTrigger
          className="h-7 w-[9.5rem] border-0 bg-transparent px-1 text-xs font-semibold shadow-none focus:ring-0"
          aria-label="View as role"
        >
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {!isSuperRoleViewer && actualRoles.length > 1 && (
            <SelectItem value="__all__">All my roles</SelectItem>
          )}
          {isSuperRoleViewer && (
            <SelectItem value="__all__">
              {roleIncludesAdmin(actualRoles) ? "Super admin (full access)" : "All my roles"}
            </SelectItem>
          )}
          {viewAsOptions.map((r) => (
            <SelectItem key={r} value={r}>
              {VIEW_AS_ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isSuperRoleViewer && (
        <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="Configure preview roles"
            >
              <Settings2 className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <p className="text-sm font-semibold mb-1">Preview role catalog</p>
            <p className="text-xs text-muted-foreground mb-3">
              Choose which roles appear in View as. Your real permissions are unchanged — this only
              affects menus and screens you see.
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {PREVIEWABLE_APP_ROLES.map((r) => {
                const checked = previewRoleCatalog.includes(r);
                return (
                  <div key={r} className="flex items-center gap-2">
                    <Checkbox
                      id={`preview-role-${r}`}
                      checked={checked}
                      onCheckedChange={(on) => {
                        const next = on
                          ? [...new Set([...previewRoleCatalog, r])]
                          : previewRoleCatalog.filter((x) => x !== r);
                        setPreviewRoleCatalog(next.length ? next : [r]);
                      }}
                    />
                    <Label htmlFor={`preview-role-${r}`} className="text-sm font-normal cursor-pointer">
                      {VIEW_AS_ROLE_LABELS[r]}
                    </Label>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setPreviewRoleCatalog([...PREVIEWABLE_APP_ROLES])}
            >
              Reset to all roles
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function roleIncludesAdmin(roles: AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("administrator");
}

/** Compact banner when viewing as a different role */
export function RoleViewBanner() {
  const { viewAsRole, setViewAsRole, actualRoles, canUseViewAs } = useAuth();

  if (!canUseViewAs || !viewAsRole) return null;

  const actualLabel =
    actualRoles.length === 1
      ? VIEW_AS_ROLE_LABELS[actualRoles[0]]
      : actualRoles.map((r) => VIEW_AS_ROLE_LABELS[r]).join(", ");

  return (
    <div
      className="fixed top-14 left-1/2 z-[45] -translate-x-1/2 max-w-lg rounded-full border border-amber-400/50 bg-amber-50/95 px-4 py-1.5 text-xs shadow-sm backdrop-blur dark:bg-amber-950/90"
      data-testid="role-view-banner"
    >
      <span className="font-medium text-amber-900 dark:text-amber-100">
        Previewing as {VIEW_AS_ROLE_LABELS[viewAsRole]}
      </span>
      <span className="text-amber-800/80 dark:text-amber-200/80 mx-1.5">·</span>
      <span className="text-muted-foreground">Signed in as {actualLabel}</span>
      <button
        type="button"
        className="ml-2 font-semibold underline underline-offset-2 hover:no-underline"
        onClick={() => setViewAsRole(null)}
      >
        Exit preview
      </button>
    </div>
  );
}

/** Mobile-friendly dropdown variant (optional export for narrow screens) */
export function RoleViewSwitcherMobile() {
  const { loading, canUseViewAs, viewAsRole, setViewAsRole, viewAsOptions, actualRoles } = useAuth();

  if (loading || !canUseViewAs) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="sm:hidden h-8 gap-1.5 text-xs">
          <Eye className="size-3.5" />
          {viewAsRole ? VIEW_AS_ROLE_LABELS[viewAsRole] : "All roles"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>View as</DropdownMenuLabel>
        {actualRoles.length > 1 && (
          <DropdownMenuItem onClick={() => setViewAsRole(null)}>All my roles</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {viewAsOptions.map((r) => (
          <DropdownMenuItem key={r} onClick={() => setViewAsRole(r)}>
            {VIEW_AS_ROLE_LABELS[r]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
