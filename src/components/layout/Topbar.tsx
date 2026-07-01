// Finalized enterprise topbar slot. Sticky, responsive, clean z-index layering.
// Hosts: notification bell, future global search & quick actions slots.
// HandoffBell retired 2026-05-29 — handoffs now emit via app_notifications (handoff_received)
// and surface in NotificationCenter like all other events.
import { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";
import { RoleViewBanner, RoleViewSwitcher } from "@/components/layout/RoleViewSwitcher";
import { useDraggableFixedPanel } from "@/hooks/useDraggableFixedPanel";
import { isPerformanceHubPath } from "@/lib/performanceHubTokens";
import { cn } from "@/lib/utils";

const VIEWPORT_MARGIN_PX = 8;

export interface TopbarProps {
  /** Future global search slot. */
  searchSlot?: ReactNode;
  /** Future quick-actions slot (e.g. "+ new lead", create invoice). */
  quickActionsSlot?: ReactNode;
  className?: string;
}

export function Topbar({ searchSlot, quickActionsSlot, className }: TopbarProps) {
  const { pathname } = useLocation();
  const isPerformanceHub = isPerformanceHubPath(pathname);
  const { ref, position, isDragging, isReady, startDrag, moveDrag, endDrag, resetPosition } =
    useDraggableFixedPanel();

  return (
    <>
      {!isPerformanceHub && <RoleViewBanner />}
      <div
        ref={ref}
        style={
          isReady && position
            ? { left: position.x, top: position.y }
            : { right: VIEWPORT_MARGIN_PX, top: "50%", transform: "translateY(-50%)" }
        }
        className={cn(
          "fixed z-50",
          "flex flex-col items-center gap-1 p-1.5",
          "rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md shadow-md",
          !isReady && "opacity-0 pointer-events-none",
          isDragging && "shadow-lg ring-2 ring-primary/25",
          className,
        )}
        data-topbar="enterprise"
        data-topbar-layout="rail"
        aria-label="Global actions"
      >
        <button
          type="button"
          className={cn(
            "flex h-5 w-full min-w-9 items-center justify-center rounded-md",
            "text-muted-foreground hover:bg-muted/80 touch-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          aria-label="Drag global actions. Double-click to reset position."
          title="Drag to move · double-click to reset"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={resetPosition}
        >
          <GripVertical className="size-3.5" aria-hidden />
        </button>
        {searchSlot ? <div className="hidden md:block">{searchSlot}</div> : null}
        {quickActionsSlot ? <div className="hidden sm:block">{quickActionsSlot}</div> : null}
        {!isPerformanceHub && <RoleViewSwitcher layout="rail" />}
        {!isPerformanceHub && <ThemeModeToggle tooltipSide="left" />}
        <NotificationCenter popoverSide="left" />
      </div>
    </>
  );
}
