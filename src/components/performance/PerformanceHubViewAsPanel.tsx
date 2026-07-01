import { Eye, RotateCcw } from "lucide-react";
import { useState } from "react";
import { usePerformanceHubViewAs } from "@/contexts/PerformanceHubViewAsContext";
import type { AppRole } from "@/lib/appRoles";
import { viewAsRoleLabel } from "@/lib/roleViewAs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const NONE = "";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Performance Hub View As — preview layer for UAT / QA / support.
 * Native selects avoid Radix Select portals inside Popover (FIN-R-001 removeChild crash).
 */
export function PerformanceHubViewAsPanel() {
  const {
    canUse,
    isActive,
    previewRole,
    previewBranchId,
    previewUserId,
    roleOptions,
    branchOptions,
    userOptions,
    usersLoading,
    setPreviewRole,
    setPreviewBranchId,
    setPreviewUserId,
    reset,
    previewRoleLabel,
  } = usePerformanceHubViewAs();

  const [open, setOpen] = useState(false);

  if (!canUse) return null;

  const triggerLabel = previewRole ? previewRoleLabel : "View as";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title={`View as — ${triggerLabel}`}
          className={cn(
            "h-8 gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white text-xs shrink-0",
            isActive && "border-amber-400/50 bg-amber-950/40 text-amber-200 hover:bg-amber-950/50",
          )}
          data-testid="performance-hub-view-as-trigger"
        >
          <Eye className="size-3.5 shrink-0" />
          <span className="hidden sm:inline max-w-[7rem] truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 space-y-3" sideOffset={8}>
        <div>
          <p className="text-sm font-semibold">View As</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preview-only — your sign-in and permissions in the database are unchanged.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ph-view-as-role" className="text-xs">
            Role
          </Label>
          <select
            id="ph-view-as-role"
            className={selectClass}
            value={previewRole ?? NONE}
            onChange={(e) => setPreviewRole(e.target.value ? (e.target.value as AppRole) : null)}
          >
            <option value={NONE}>— Your access —</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {viewAsRoleLabel(r)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ph-view-as-branch" className="text-xs">
            Branch
          </Label>
          <select
            id="ph-view-as-branch"
            className={selectClass}
            value={previewBranchId ?? NONE}
            disabled={!previewRole}
            onChange={(e) => setPreviewBranchId(e.target.value || null)}
          >
            <option value={NONE}>Default for role</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ph-view-as-user" className="text-xs">
            User (optional)
          </Label>
          <select
            id="ph-view-as-user"
            className={selectClass}
            value={previewUserId ?? NONE}
            disabled={!previewRole || usersLoading}
            onChange={(e) => setPreviewUserId(e.target.value || null)}
          >
            <option value={NONE}>{usersLoading ? "Loading…" : "Standard role view"}</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={!isActive}
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/** Banner shown while Performance Hub View As preview is active */
export function PerformanceHubViewAsBanner() {
  const { canUse, isActive, previewRoleLabel, previewBranchId, previewUserId, userOptions, reset } =
    usePerformanceHubViewAs();

  if (!canUse || !isActive || !previewRoleLabel) return null;

  const userName = previewUserId
    ? userOptions.find((u) => u.id === previewUserId)?.full_name ?? "Selected user"
    : null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-amber-400/40 bg-amber-950/50 px-4 py-1.5 text-xs text-amber-100"
      data-testid="performance-hub-view-as-banner"
    >
      <Eye className="size-3.5 shrink-0 text-amber-300" />
      <span>
        <span className="font-semibold">Preview:</span> {previewRoleLabel}
        {previewBranchId && " · branch scoped"}
        {userName && ` · ${userName}`}
      </span>
      <span className="text-amber-200/70 hidden sm:inline">— actions still audit as you</span>
      <button
        type="button"
        className="ml-auto font-semibold underline underline-offset-2 hover:no-underline"
        onClick={reset}
      >
        Exit preview
      </button>
    </div>
  );
}
