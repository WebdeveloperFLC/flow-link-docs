// Finalized enterprise topbar slot. Sticky, responsive, clean z-index layering.
// Hosts: notification bell, handoff bell, future global search & quick actions slots.
import { ReactNode } from "react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { HandoffBell } from "@/components/notifications/HandoffBell";
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
    <div
      className={cn(
        "fixed top-3 right-3 z-50 flex items-center gap-2",
        "rounded-full border border-border/60 bg-background/85 backdrop-blur shadow-sm",
        "px-2 py-1",
        className,
      )}
      data-topbar="enterprise"
    >
      {searchSlot ? <div className="hidden md:block">{searchSlot}</div> : null}
      {quickActionsSlot ? <div className="hidden sm:block">{quickActionsSlot}</div> : null}
      <HandoffBell />
      <NotificationCenter />
    </div>
  );
}