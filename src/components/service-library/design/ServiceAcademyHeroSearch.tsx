import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AcademyTabId } from "@/lib/service-library/academyTabs";
import type { PageSearchEntry } from "@/lib/service-library/buildPageSearchIndex";
import { tabLabel } from "@/lib/service-library/academyTabs";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";

type Props = {
  value: string;
  onChange: (q: string) => void;
  entries: PageSearchEntry[];
  view: Pick<AcademyViewModel, "isCoaching" | "isMbbs" | "coachingProfile">;
  onOpenTab: (tab: AcademyTabId) => void;
};

function matchEntry(entry: PageSearchEntry, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  const hay = [entry.label, entry.hint ?? ""].join(" ").toLowerCase();
  return hay.includes(needle);
}

export function ServiceAcademyHeroSearch({ value, onChange, entries, view, onOpenTab }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => (value.trim() ? entries.filter((e) => matchEntry(e, value)).slice(0, 12) : []),
    [value, entries],
  );

  useEffect(() => {
    setActiveIdx(0);
    setOpen(value.trim().length > 0 && results.length > 0);
  }, [value, results.length]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const activate = (entry: PageSearchEntry) => {
    onOpenTab(entry.tabId);
    onChange("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) {
      if (e.key === "Enter" && value.trim()) {
        const hit = entries.find((entry) => matchEntry(entry, value));
        if (hit) {
          e.preventDefault();
          activate(hit);
        }
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(results[activeIdx]);
    }
  };

  return (
    <div ref={rootRef} className="relative hidden sm:block w-48 md:w-56">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground z-10" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim() && results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search this page…"
        className="h-8 pl-8 text-sm"
        aria-label="Search this page"
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
      />
      {open && results.length > 0 && (
        <ul
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
          role="listbox"
        >
          {results.map((entry, i) => (
            <li key={`${entry.tabId}-${entry.label}-${i}`} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => activate(entry)}
                className={cn(
                  "w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80",
                  i === activeIdx && "bg-muted",
                )}
              >
                <Layers className="size-3.5 shrink-0 text-primary mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{entry.label}</span>
                  {entry.hint && (
                    <span className="block truncate text-[11px] text-muted-foreground">{entry.hint}</span>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 mt-0.5">
                  {tabLabel(entry.tabId, view)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
