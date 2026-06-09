import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Lock, Info, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { serviceFeeLabel, type FeeCurrency } from "@/lib/leads/serviceFeeLabel";
import { GroupedServiceList } from "@/components/leads/GroupedServiceList";
import {
  shouldUseGroupedPicker,
  type ServicePickerTab,
} from "@/lib/leads/servicePickerGroups";

export interface ServiceSelection {
  coaching_services: string[];
  visa_services: string[];
  admission_services: string[];
  allied_services: string[];
  travel_services: string[];
}

type TabKey = keyof ServiceSelection | "allied_travel";

interface Tab {
  key: TabKey;
  label: string;
  masterKeys: string[];
  selectionKey?: keyof ServiceSelection;
  grouped?: ServicePickerTab;
}

const TABS: Tab[] = [
  {
    key: "coaching_services",
    label: "Coaching",
    masterKeys: ["coaching_services"],
    selectionKey: "coaching_services",
    grouped: "coaching_services",
  },
  {
    key: "visa_services",
    label: "Visa & Immigration",
    masterKeys: ["visa_immigration"],
    selectionKey: "visa_services",
    grouped: "visa_services",
  },
  {
    key: "admission_services",
    label: "Admissions",
    masterKeys: ["admission_services"],
    selectionKey: "admission_services",
    grouped: "admission_services",
  },
  {
    key: "allied_travel",
    label: "Allied & Travel",
    masterKeys: ["allied_services", "travel_financial"],
    grouped: "allied_travel",
  },
];

function FlatServiceList({
  items,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  openNote,
  onOpenNote,
  feeCurrency,
}: {
  items: ServiceCatalogueItem[];
  getSelectionKey: (item: ServiceCatalogueItem) => keyof ServiceSelection;
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  disabled?: boolean;
  openNote: string | null;
  onOpenNote: (id: string | null) => void;
  feeCurrency: FeeCurrency;
}) {
  if (items.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center border rounded-md">
        No services
      </div>
    );
  }

  return (
    <div className={cn("border rounded-md divide-y", disabled && "opacity-50 pointer-events-none")}>
      {items.map((s) => {
        const code = s.service_code || s.id;
        const itemKey = getSelectionKey(s);
        const checked = (value[itemKey] ?? []).includes(code);
        const hasNote = typeof s.notes === "string" && s.notes.trim().length > 0;
        return (
          <label
            key={s.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2 cursor-pointer border-l-2 transition-colors",
              checked
                ? "bg-primary/5 border-primary hover:bg-primary/10"
                : "border-transparent hover:bg-muted/30",
            )}
          >
            <Checkbox checked={checked} onCheckedChange={() => onToggle(itemKey, code)} />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-sm truncate flex items-center gap-1.5",
                  checked ? "font-semibold text-foreground" : "font-medium",
                )}
              >
                <span className="truncate">{s.service_name}</span>
                {hasNote && (
                  <Popover
                    open={openNote === s.id}
                    onOpenChange={(o) => onOpenNote(o ? s.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Service info"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" onClick={(e) => e.preventDefault()}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="text-sm font-medium">{s.service_name}</div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenNote(null);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Close"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{s.notes}</div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {s.sub_category && (
                <div className="text-xs text-muted-foreground">{s.sub_category}</div>
              )}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">{serviceFeeLabel(s, feeCurrency)}</div>
          </label>
        );
      })}
    </div>
  );
}

export const ServiceTabs = ({
  value,
  onChange,
  visaLocked,
  onCommit,
  interestedCountries,
}: {
  value: ServiceSelection;
  onChange: (v: ServiceSelection) => void;
  visaLocked: boolean;
  onCommit?: (key: keyof ServiceSelection, list: string[]) => void;
  interestedCountries?: string[];
}) => {
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [visaCountry, setVisaCountry] = useState<string>("ALL");
  const [feeCurrency, setFeeCurrency] = useState<FeeCurrency>("INR");
  const [openNote, setOpenNote] = useState<string | null>(null);

  useEffect(() => {
    fetchAllServiceCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
  }, []);

  const byKey = useMemo(() => {
    const m: Record<string, ServiceCatalogueItem[]> = {};
    for (const it of catalogue) {
      (m[it.master_key] ||= []).push(it);
    }
    return m;
  }, [catalogue]);

  const visaCountries = useMemo(() => {
    if (interestedCountries) return [...interestedCountries].sort();
    const set = new Set<string>();
    (byKey["visa_immigration"] ?? []).forEach((s) => {
      if (s.country_tag) set.add(s.country_tag);
    });
    return Array.from(set).sort();
  }, [byKey, interestedCountries]);

  useEffect(() => {
    if (visaCountry !== "ALL" && !visaCountries.includes(visaCountry)) {
      setVisaCountry("ALL");
    }
  }, [visaCountries, visaCountry]);

  const toggle = (key: keyof ServiceSelection, code: string) => {
    const cur = value[key] ?? [];
    const next = cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code];
    onChange({ ...value, [key]: next });
    onCommit?.(key, next);
  };

  const selectionKeyForItem = (s: ServiceCatalogueItem): keyof ServiceSelection => {
    if (s.master_key === "travel_financial") return "travel_services";
    if (s.master_key === "admission_services") return "admission_services";
    if (s.master_key === "coaching_services") return "coaching_services";
    if (s.master_key === "visa_immigration") return "visa_services";
    return "allied_services";
  };

  return (
    <Tabs defaultValue={TABS[0].key}>
      <TabsList className="w-full justify-start flex-wrap h-auto">
        {TABS.map((t) => {
          const count =
            t.key === "allied_travel"
              ? (value.allied_services?.length ?? 0) + (value.travel_services?.length ?? 0)
              : (value[t.selectionKey!]?.length ?? 0);
          const isVisa = t.key === "visa_services";
          const locked = isVisa && visaLocked;
          return (
            <TabsTrigger key={t.key} value={t.key} className={cn("gap-1.5", locked && "opacity-60")}>
              {locked && <Lock className="h-3 w-3" />}
              {t.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {TABS.map((t) => {
        const list = t.masterKeys.flatMap((mk) => byKey[mk] ?? []);
        const isVisa = t.key === "visa_services";
        const filtered = isVisa
          ? visaCountry !== "ALL"
            ? list.filter((s) => s.country_tag === visaCountry)
            : interestedCountries
              ? list.filter((s) => !s.country_tag || interestedCountries.includes(s.country_tag))
              : list
          : list;
        const locked = isVisa && visaLocked;
        const noCountriesPicked =
          isVisa && interestedCountries !== undefined && interestedCountries.length === 0;
        const getSelectionKey = (s: ServiceCatalogueItem): keyof ServiceSelection =>
          t.selectionKey ?? selectionKeyForItem(s);
        const useGrouped = !!t.grouped && shouldUseGroupedPicker(t.grouped, filtered);

        return (
          <TabsContent key={t.key} value={t.key} className="space-y-3">
            {isVisa && noCountriesPicked && (
              <div className="p-4 text-sm text-muted-foreground border rounded-md bg-muted/30 text-center">
                Select countries of interest under Geography to see visa services.
              </div>
            )}
            {isVisa && !noCountriesPicked && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Consultancy fees:</span>
                <div className="inline-flex rounded-md border p-0.5">
                  {(["INR", "CAD"] as FeeCurrency[]).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setFeeCurrency(cur)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-sm",
                        feeCurrency === cur
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isVisa && !noCountriesPicked && visaCountries.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setVisaCountry("ALL")}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border",
                    visaCountry === "ALL"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent",
                  )}
                >
                  All
                </button>
                {visaCountries.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setVisaCountry(c)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border",
                      visaCountry === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {useGrouped && t.grouped ? (
              <div className={cn(locked && "opacity-50 pointer-events-none")}>
                <GroupedServiceList
                  items={filtered}
                  tab={t.grouped}
                  getSelectionKey={getSelectionKey}
                  value={value}
                  onToggle={toggle}
                  disabled={locked}
                  openNote={openNote}
                  onOpenNote={setOpenNote}
                  feeCurrency={isVisa ? feeCurrency : "INR"}
                />
              </div>
            ) : (
              <FlatServiceList
                items={filtered}
                getSelectionKey={getSelectionKey}
                value={value}
                onToggle={toggle}
                disabled={locked}
                openNote={openNote}
                onOpenNote={setOpenNote}
                feeCurrency={isVisa ? feeCurrency : "INR"}
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
};
