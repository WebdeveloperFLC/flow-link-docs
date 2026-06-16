// Finalized enterprise topbar slot. Sticky, responsive, clean z-index layering.
// Hosts: notification bell, future global search & quick actions slots.
// HandoffBell retired 2026-05-29 — handoffs now emit via app_notifications (handoff_received)
// and surface in NotificationCenter like all other events.
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";
import { RoleViewBanner, RoleViewSwitcher } from "@/components/layout/RoleViewSwitcher";
import { isPerformanceHubPath } from "@/lib/performanceHubTokens";
import { cn } from "@/lib/utils";

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

  return (
    <>
      <RoleViewBanner />
      <div
        className={cn(
          "fixed right-2 top-1/2 z-50 -translate-y-1/2",
          "flex flex-col items-center gap-1 p-1.5",
          "rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md shadow-md",
          className,
        )}
        data-topbar="enterprise"
        data-topbar-layout="rail"
        aria-label="Global actions"
      >
        {searchSlot ? <div className="hidden md:block">{searchSlot}</div> : null}
        {quickActionsSlot ? <div className="hidden sm:block">{quickActionsSlot}</div> : null}
        {!isPerformanceHub && <RoleViewSwitcher layout="rail" />}
        {!isPerformanceHub && <ThemeModeToggle tooltipSide="left" />}
        <NotificationCenter popoverSide="left" />
      </div>
    </>
  );
}
