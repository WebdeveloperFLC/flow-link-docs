// Finalized enterprise topbar slot. Sticky, responsive, clean z-index layering.
// Hosts: notification bell, future global search & quick actions slots.
// HandoffBell retired 2026-05-29 — handoffs now emit via app_notifications (handoff_received)
// and surface in NotificationCenter like all other events.
import { ReactNode } from "react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";
import { RoleViewBanner, RoleViewSwitcher, RoleViewSwitcherMobile } from "@/components/layout/RoleViewSwitcher";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  /** Future global search slot. */
  searchSlot?: ReactNode;
  /** Future quick-actions slot (e.g. "+ new lead", create invoice). */
  quickActionsSlot?: ReactNode;
  className?: string;
}

export function Topbar({ searchSlot, quickActionsSlot, className }: TopbarProps) {
  return (
    <>
      <RoleViewBanner />
      <div
        className={cn(
          "fixed top-3 right-3 z-50 flex items-center gap-2",
          "rounded-full border border-border/60 bg-card/85 backdrop-blur shadow-sm",
          "px-2 py-1",
          className,
        )}
        data-topbar="enterprise"
      >
        {searchSlot ? <div className="hidden md:block">{searchSlot}</div> : null}
        {quickActionsSlot ? <div className="hidden sm:block">{quickActionsSlot}</div> : null}
        <RoleViewSwitcher />
        <RoleViewSwitcherMobile />
        <ThemeModeToggle />
        <NotificationCenter />
      </div>
    </>
  );
}
