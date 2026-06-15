import { useMemo, useState } from "react";
import { Eye, Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/appRoles";
import { PREVIEWABLE_APP_ROLES, viewAsFullAccessLabel, viewAsFullAccessShortLabel, viewAsRoleLabel } from "@/lib/roleViewAs";
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

type RoleViewSwitcherProps = {
  /** Dark Performance Hub context bar styling */
  variant?: "default" | "hub";
};

export function RoleViewSwitcher({ variant = "default" }: RoleViewSwitcherProps) {
  const {
    loading,
    canUseViewAs,
    viewAsRole,
    setViewAsRole,
    isPlatformOwner,
    canUseFullPreviewCatalog,
    previewRoleCatalog,
    setPreviewRoleCatalog,
    viewAsOptions,
    actualRoles,
  } = useAuth();

  const [catalogOpen, setCatalogOpen] = useState(false);

  const selectValue = viewAsRole ?? "__all__";

  const currentLabel = useMemo(() => {
    if (!viewAsRole) {
      return variant === "hub"
        ? viewAsFullAccessShortLabel(isPlatformOwner)
        : viewAsFullAccessLabel(isPlatformOwner, actualRoles);
    }
    return viewAsRoleLabel(viewAsRole);
  }, [viewAsRole, actualRoles, isPlatformOwner, variant]);

  const isHub = variant === "hub";

  if (loading || !canUseViewAs) return null;

  return (
    <div
      className={cn(
        "hidden sm:flex items-center gap-1 rounded-full border px-2 py-0.5 shrink-0 max-w-full",
        isHub
          ? viewAsRole
            ? "border-amber-400/50 bg-amber-950/40"
            : "border-white/20 bg-white/10"
          : viewAsRole
            ? "border-amber-400/60 bg-amber-50/90 dark:bg-amber-950/40"
            : "border-border/60 bg-muted/40",
      )}
      data-testid="role-view-switcher"
    >
      <Eye
        className={cn("size-3.5 shrink-0", isHub ? "text-[#8FA0C2]" : "text-muted-foreground")}
        aria-hidden
      />
      <span
        className={cn(
          "text-[10px] font-medium uppercase tracking-wide whitespace-nowrap",
          isHub ? "text-[#8FA0C2]" : "text-muted-foreground",
        )}
      >
        View as
      </span>
      <Select
        value={selectValue}
        onValueChange={(v) => setViewAsRole(v === "__all__" ? null : (v as AppRole))}
      >
        <SelectTrigger
          className={cn(
            "h-7 border-0 bg-transparent px-1 text-xs font-semibold shadow-none focus:ring-0",
            isHub ? "w-[5.5rem] text-white [&>span]:truncate" : "w-[8rem] [&>span]:truncate",
          )}
          aria-label="View as role"
          title={viewAsRole ? viewAsRoleLabel(viewAsRole) : viewAsFullAccessLabel(isPlatformOwner, actualRoles)}
        >
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="__all__">{viewAsFullAccessLabel(isPlatformOwner, actualRoles)}</SelectItem>
          {viewAsOptions.map((r) => (
            <SelectItem key={r} value={r}>
              {viewAsRoleLabel(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {canUseFullPreviewCatalog && (
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
                      {viewAsRoleLabel(r)}
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

/** Compact banner when viewing as a different role */
export function RoleViewBanner() {
  const { viewAsRole, setViewAsRole, actualRoles, canUseViewAs } = useAuth();

  if (!canUseViewAs || !viewAsRole) return null;

  const actualLabel =
    actualRoles.length === 1
      ? viewAsRoleLabel(actualRoles[0])
      : actualRoles.map((r) => viewAsRoleLabel(r)).join(", ");

  return (
    <div
      className="fixed top-14 left-1/2 z-[45] -translate-x-1/2 max-w-lg rounded-full border border-amber-400/50 bg-amber-50/95 px-4 py-1.5 text-xs shadow-sm backdrop-blur dark:bg-amber-950/90"
      data-testid="role-view-banner"
    >
      <span className="font-medium text-amber-900 dark:text-amber-100">
        Previewing as {viewAsRoleLabel(viewAsRole)}
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

/** Mobile-friendly dropdown variant */
export function RoleViewSwitcherMobile({ variant = "default" }: RoleViewSwitcherProps) {
  const { loading, canUseViewAs, viewAsRole, setViewAsRole, viewAsOptions, actualRoles, isPlatformOwner } = useAuth();

  if (loading || !canUseViewAs) return null;

  const shortDefault = viewAsFullAccessShortLabel(isPlatformOwner);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "sm:hidden h-8 gap-1.5 text-xs shrink-0",
            variant === "hub" && "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white",
          )}
        >
          <Eye className="size-3.5" />
          {viewAsRole ? viewAsRoleLabel(viewAsRole) : shortDefault}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>View as</DropdownMenuLabel>
        {(actualRoles.length > 1 || isPlatformOwner) && (
          <DropdownMenuItem onClick={() => setViewAsRole(null)}>
            {viewAsFullAccessLabel(isPlatformOwner, actualRoles)}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {viewAsOptions.map((r) => (
          <DropdownMenuItem key={r} onClick={() => setViewAsRole(r)}>
            {viewAsRoleLabel(r)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
