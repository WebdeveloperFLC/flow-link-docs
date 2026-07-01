import { Eye, RotateCcw } from "lucide-react";
import { usePerformanceHubViewAs } from "@/contexts/PerformanceHubViewAsContext";
import type { AppRole } from "@/lib/appRoles";
import { viewAsRoleLabel } from "@/lib/roleViewAs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NONE = "__none__";

/**
 * Performance Hub View As — preview layer for UAT / QA / support.
 * Role + optional branch + optional user. Does not change authentication.
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

  if (!canUse) return null;

  const triggerLabel = previewRole ? previewRoleLabel : "View as";

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
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
        </TooltipTrigger>
        <TooltipContent side="bottom">View as — preview hub as another role</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 p-4 space-y-3" sideOffset={8}>
        <div>
          <p className="text-sm font-semibold">View As</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preview-only — your sign-in and permissions in the database are unchanged.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Role</Label>
          <Select
            value={previewRole ?? NONE}
            onValueChange={(v) => setPreviewRole(v === NONE ? null : (v as AppRole))}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— Your access —</SelectItem>
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {viewAsRoleLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Branch</Label>
          <Select
            value={previewBranchId ?? NONE}
            onValueChange={(v) => setPreviewBranchId(v === NONE ? null : v)}
            disabled={!previewRole}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Default for role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Default for role</SelectItem>
              {branchOptions.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">User (optional)</Label>
          <Select
            value={previewUserId ?? NONE}
            onValueChange={(v) => setPreviewUserId(v === NONE ? null : v)}
            disabled={!previewRole || usersLoading}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={usersLoading ? "Loading…" : "Standard role view"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Standard role view</SelectItem>
              {userOptions.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name ?? u.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full gap-1.5"
          onClick={reset}
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
