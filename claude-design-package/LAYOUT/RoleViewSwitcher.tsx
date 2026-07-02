import { useMemo, useState } from "react";
import { Eye, GripVertical, Settings2 } from "lucide-react";
import { getCenterBottomDefaultPosition, useDraggableFixedPanel } from "@/hooks/useDraggableFixedPanel";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/appRoles";
import { PREVIEWABLE_APP_ROLES, viewAsFullAccessLabel, viewAsRoleLabel } from "@/lib/roleViewAs";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type RoleViewSwitcherProps = {
  /** Dark Performance Hub context bar styling */
  variant?: "default" | "hub";
  /** Vertical right-edge topbar — stack icons, open menus to the left */
  layout?: "default" | "rail";
};

/** Compact icon — opens menu on click (no inline label overlap in topbar). */
export function RoleViewSwitcher({ variant = "default", layout = "default" }: RoleViewSwitcherProps) {
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

  const currentLabel = useMemo(() => {
    if (!viewAsRole) return viewAsFullAccessLabel(isPlatformOwner, actualRoles);
    return viewAsRoleLabel(viewAsRole);
  }, [viewAsRole, actualRoles, isPlatformOwner]);

  const isHub = variant === "hub";
  const isRail = layout === "rail";
  const menuSide = isRail ? "left" : "bottom";

  if (loading || !canUseViewAs) return null;

  return (
    <div
      className={cn(
        "flex shrink-0",
        isRail ? "flex-col items-center gap-0.5" : "items-center gap-0.5",
      )}
      data-testid="role-view-switcher"
    >
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "size-8 shrink-0 relative",
                  viewAsRole &&
                    (isHub
                      ? "border-amber-400/50 bg-amber-950/40 text-amber-200"
                      : "border-amber-400/60 bg-amber-50/90 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"),
                  isHub &&
                    !viewAsRole &&
                    "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white",
                )}
                aria-label={`View as: ${currentLabel}`}
              >
                <Eye className="size-4" />
                {viewAsRole && (
                  <span
                    className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500 ring-1 ring-background"
                    aria-hidden
                  />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side={menuSide}>View as — {currentLabel}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side={isRail ? "left" : undefined} align="end" className="w-56">
          <DropdownMenuLabel>View as</DropdownMenuLabel>
          {(actualRoles.length > 1 || isPlatformOwner) && (
            <DropdownMenuItem onClick={() => setViewAsRole(null)}>
              {viewAsFullAccessLabel(isPlatformOwner, actualRoles)}
            </DropdownMenuItem>
          )}
          {viewAsOptions.length > 0 && <DropdownMenuSeparator />}
          {viewAsOptions.map((r) => (
            <DropdownMenuItem key={r} onClick={() => setViewAsRole(r)}>
              {viewAsRoleLabel(r)}
              {viewAsRole === r && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {canUseFullPreviewCatalog && (
        <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8 shrink-0",
                    isHub && "text-[#8FA0C2] hover:bg-white/10 hover:text-white",
                  )}
                  aria-label="Configure preview roles"
                >
                  <Settings2 className="size-3.5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side={menuSide}>Preview role catalog</TooltipContent>
          </Tooltip>
          <PopoverContent side={isRail ? "left" : "bottom"} align="end" className="w-72">
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

const ROLE_VIEW_BANNER_STORAGE_KEY = "role-view-banner:position";

/** Compact banner when viewing as a different role */
export function RoleViewBanner() {
  const { viewAsRole, setViewAsRole, actualRoles, canUseViewAs } = useAuth();
  const { ref, position, isDragging, isReady, startDrag, moveDrag, endDrag, resetPosition } =
    useDraggableFixedPanel(ROLE_VIEW_BANNER_STORAGE_KEY, getCenterBottomDefaultPosition);

  if (!canUseViewAs || !viewAsRole) return null;

  const actualLabel =
    actualRoles.length === 1
      ? viewAsRoleLabel(actualRoles[0])
      : actualRoles.map((r) => viewAsRoleLabel(r)).join(", ");

  return (
    <div
      ref={ref}
      style={
        isReady && position
          ? { left: position.x, top: position.y }
          : { left: "50%", bottom: "4.5rem", transform: "translateX(-50%)" }
      }
      className={cn(
        "fixed z-[45] flex max-w-[min(100vw-1rem,36rem)] items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50/95 py-1.5 pl-1 pr-4 text-xs shadow-sm backdrop-blur dark:bg-amber-950/90",
        !isReady && "opacity-0 pointer-events-none",
        isDragging && "shadow-md ring-2 ring-amber-400/40",
      )}
      data-testid="role-view-banner"
    >
      <button
        type="button"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-800/70 hover:bg-amber-200/60 dark:text-amber-200/70 dark:hover:bg-amber-900/50 touch-none",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        aria-label="Drag preview banner. Double-click to reset position."
        title="Drag to move · double-click to reset"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={resetPosition}
      >
        <GripVertical className="size-3.5" aria-hidden />
      </button>
      <div className="min-w-0 flex-1 leading-snug">
        <span className="font-medium text-amber-900 dark:text-amber-100">
          Previewing as {viewAsRoleLabel(viewAsRole)}
        </span>
        <span className="text-amber-800/80 dark:text-amber-200/80 mx-1.5 hidden sm:inline">·</span>
        <span className="text-muted-foreground hidden sm:inline">Signed in as {actualLabel}</span>
      </div>
      <button
        type="button"
        className="ml-1 shrink-0 font-semibold underline underline-offset-2 hover:no-underline text-amber-900 dark:text-amber-100"
        onClick={() => setViewAsRole(null)}
      >
        Exit preview
      </button>
    </div>
  );
}

/** @deprecated Use RoleViewSwitcher — same compact icon on all breakpoints */
export function RoleViewSwitcherMobile(props: RoleViewSwitcherProps) {
  return <RoleViewSwitcher {...props} />;
}
