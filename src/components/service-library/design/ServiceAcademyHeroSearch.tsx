import { useEffect, useMemo, useRef, useState } from "react";
import { Search, FileText, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AcademyTabId } from "@/lib/service-library/academyTabs";

export type HeroSearchService = { id: string; label: string };
export type HeroSearchTab = { id: AcademyTabId; label: string };

type Props = {
  value: string;
  onChange: (q: string) => void;
  tabs: HeroSearchTab[];
  services: HeroSearchService[];
  onOpenTab: (tab: AcademyTabId) => void;
  onSelectService: (id: string) => void;
};

type Result =
  | { kind: "tab"; id: AcademyTabId; label: string }
  | { kind: "service"; id: string; label: string };

function matchQuery(label: string, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  return label.toLowerCase().includes(needle);
}

export function ServiceAcademyHeroSearch({
  value,
  onChange,
  tabs,
  services,
  onOpenTab,
  onSelectService,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo<Result[]>(() => {
    const q = value.trim();
    if (!q) return [];
    const tabHits = tabs
      .filter((t) => matchQuery(t.label, q) || matchQuery(t.id, q))
      .map((t) => ({ kind: "tab" as const, id: t.id, label: t.label }));
    const serviceHits = services
      .filter((s) => matchQuery(s.label, q))
      .map((s) => ({ kind: "service" as const, id: s.id, label: s.label }));
    return [...tabHits, ...serviceHits].slice(0, 12);
  }, [value, tabs, services]);

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

  const activate = (item: Result) => {
    if (item.kind === "tab") {
      onOpenTab(item.id);
    } else {
      onSelectService(item.id);
    }
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
        const tab = tabs.find(
          (t) =>
            t.label.toLowerCase() === value.trim().toLowerCase() ||
            t.id.toLowerCase() === value.trim().toLowerCase(),
        );
        if (tab) {
          e.preventDefault();
          onOpenTab(tab.id);
          onChange("");
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
        placeholder="Search tabs or services…"
        className="h-8 pl-8 text-sm"
        aria-label="Search tabs or services"
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
      />
      {open && results.length > 0 && (
        <ul
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
          role="listbox"
        >
          {results.map((item, i) => (
            <li key={`${item.kind}-${item.id}`} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => activate(item)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80",
                  i === activeIdx && "bg-muted",
                )}
              >
                {item.kind === "tab" ? (
                  <Layers className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                  {item.kind === "tab" ? "Tab" : "Service"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
