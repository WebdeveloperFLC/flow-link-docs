import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";
import { RoleViewSwitcher } from "@/components/layout/RoleViewSwitcher";

/** Sticky Performance Hub context bar (prototype topbar + period X8). */
export function PerformanceHubContextBar() {
  return (
    <div className="ph-context-bar sticky top-0 z-30 px-4 py-2.5 flex flex-wrap items-center gap-3 border-b border-white/10">
      <div className="font-display font-bold text-[15px] shrink-0">
        Future Link · <span className="ph-context-accent">Performance Hub</span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2 min-w-0 pr-14 sm:pr-16">
        <RoleViewSwitcher variant="hub" />
        <div className="ph-context-chip rounded-lg px-2.5 py-1 shrink-0">
          <PerformancePeriodBar compact showBranch inContextBar className="border-0 bg-transparent p-0 gap-2 [&_label]:text-[10px] [&_label]:text-[#8FA0C2] [&_input]:h-8 [&_input]:w-28 [&_input]:text-xs [&_input]:bg-transparent [&_input]:border-white/20 [&_input]:text-white [&_select]:h-8 [&_select]:text-xs [&_select]:bg-transparent [&_select]:border-white/20 [&_select]:text-white" />
        </div>
        <div className="ph-context-chip rounded-lg p-0.5 shrink-0">
          <ThemeModeToggle variant="hub" />
        </div>
      </div>
    </div>
  );
}
