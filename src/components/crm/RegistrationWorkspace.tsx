import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type RegistrationSection = {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  /** Optional hint shown under label in sidebar */
  hint?: string;
};

type Props = {
  sections: RegistrationSection[];
  activeId: string;
  onSectionChange: (id: string) => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function RegistrationWorkspace({
  sections,
  activeId,
  onSectionChange,
  title,
  subtitle,
  badge,
  headerExtra,
  children,
  footer,
  className,
}: Props) {
  const activeIdx = sections.findIndex((s) => s.id === activeId);

  return (
    <div className={cn("rounded-xl border bg-card shadow-elev-sm overflow-hidden", className)}>
      {/* Branded header strip */}
      <div className="gradient-brand px-4 sm:px-6 py-4 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="text-sm text-primary-foreground/85 mt-0.5">{subtitle}</p>}
          </div>
          {headerExtra}
        </div>

        {/* Mobile: horizontal section pills */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 lg:hidden scrollbar-none">
          {sections.map((s, idx) => {
            const Icon = s.icon;
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSectionChange(s.id)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-white text-primary shadow-sm"
                    : "bg-white/15 text-primary-foreground hover:bg-white/25",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active ? "bg-primary/10 text-primary" : "bg-white/20",
                  )}
                >
                  {idx + 1}
                </span>
                {s.shortLabel ?? s.label}
              </button>
            );
          })}
        </div>

        {/* Desktop: progress bar */}
        <div className="mt-4 hidden lg:flex items-center gap-1">
          {sections.map((s, idx) => {
            const done = idx < activeIdx;
            const active = s.id === activeId;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onSectionChange(s.id)}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    active ? "bg-white" : done ? "bg-white/70" : "bg-white/25 hover:bg-white/40",
                  )}
                  title={s.label}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[420px]">
        {/* Desktop sidebar nav */}
        <nav
          className="hidden lg:flex lg:w-56 xl:w-60 shrink-0 flex-col border-r bg-muted/30"
          aria-label="Registration sections"
        >
          <ul className="p-2 space-y-0.5 flex-1">
            {sections.map((s, idx) => {
              const Icon = s.icon;
              const active = s.id === activeId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSectionChange(s.id)}
                    className={cn(
                      "w-full flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                        active ? "bg-primary-foreground/20" : "bg-muted",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium leading-tight">{s.label}</span>
                      {s.hint && (
                        <span
                          className={cn(
                            "block text-[11px] mt-0.5 leading-snug",
                            active ? "text-primary-foreground/75" : "text-muted-foreground",
                          )}
                        >
                          {s.hint}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {footer && <div className="p-3 border-t bg-card">{footer}</div>}
        </nav>

        {/* Section content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 p-4 sm:p-6">{children}</div>

          {/* Mobile footer + prev/next */}
          <div className="lg:hidden border-t p-3 space-y-3 bg-muted/20">
            {footer}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={activeIdx <= 0}
                onClick={() => activeIdx > 0 && onSectionChange(sections[activeIdx - 1].id)}
                className="text-sm font-medium text-primary disabled:opacity-40 disabled:pointer-events-none"
              >
                ← Previous
              </button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {activeIdx + 1} / {sections.length}
              </span>
              <button
                type="button"
                disabled={activeIdx >= sections.length - 1}
                onClick={() =>
                  activeIdx < sections.length - 1 && onSectionChange(sections[activeIdx + 1].id)
                }
                className="text-sm font-medium text-primary disabled:opacity-40 disabled:pointer-events-none"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
