import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { REGIONS, getOtherCountries, isPromoted, getRegionOf } from "@/lib/regions";
import { findCountry } from "@/lib/countries";

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
};

const OTHER_KEY = "__other__";

export function RegionCountriesPicker({ value, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<string>(REGIONS[0].key);
  const [query, setQuery] = useState("");

  const others = useMemo(() => getOtherCountries(), []);

  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((c) => c !== name));
    else onChange([...value, name]);
  };

  const tabs = [
    ...REGIONS.map((r) => ({ key: r.key, label: r.label })),
    { key: OTHER_KEY, label: "Other Countries" },
  ];

  const q = query.trim().toLowerCase();

  const currentList: { name: string; flag?: string }[] = useMemo(() => {
    if (activeTab === OTHER_KEY) {
      const list = others.map((c) => ({ name: c.name, flag: c.flag }));
      return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
    }
    const region = REGIONS.find((r) => r.key === activeTab)!;
    const list = region.countries.map((name) => ({
      name,
      flag: findCountry(name)?.flag,
    }));
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  }, [activeTab, q, others]);

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((c) => {
            const promoted = isPromoted(c);
            const flag = findCountry(c)?.flag;
            return (
              <Badge
                key={c}
                variant={promoted ? "secondary" : "outline"}
                className={cn(
                  "gap-1",
                  !promoted && "border-amber-400/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
                )}
              >
                {flag && <span className="leading-none">{flag}</span>}
                <span>{c}</span>
                {!promoted && (
                  <span className="text-[10px] uppercase tracking-wide opacity-75">
                    Special inquiry
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggle(c)}
                  className="hover:text-destructive"
                  aria-label={`Remove ${c}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Region tabs */}
      <div className="flex flex-wrap gap-1.5 border-b pb-2">
        {tabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveTab(t.key);
                setQuery("");
              }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-border",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search within tab */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === OTHER_KEY ? "Search all countries…" : "Search in this region…"}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Country pills */}
      <div
        className={cn(
          "flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30",
          activeTab === OTHER_KEY && "max-h-56 overflow-auto",
        )}
      >
        {currentList.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-1">No match.</div>
        ) : (
          currentList.map((c) => {
            const sel = value.includes(c.name);
            return (
              <button
                type="button"
                key={c.name}
                onClick={() => toggle(c.name)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1.5",
                  sel
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent",
                )}
              >
                {c.flag && <span className="leading-none">{c.flag}</span>}
                {c.name}
              </button>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Need a country not listed? Pick it under <strong>Other Countries</strong> — it will be marked as a special-inquiry market. Only Admin can promote countries into the active regions list.
      </p>
    </div>
  );
}