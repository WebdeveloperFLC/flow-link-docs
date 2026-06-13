import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { supabase } from "@/integrations/supabase/client";
import type { ScopeJson } from "@/incentives/lib/incentiveScopeLogic";
import { SCOPE_PRESET_KEYS, SCOPE_PRESET_LABELS } from "@/incentives/lib/incentiveScopeLogic";
import { catalogueItemCode } from "@/lib/service-library/serviceSelectionMatch";
import { findCatalogueItemForStoredCode } from "@/lib/service-library/resolveServiceLabel";
import { findCountry } from "@/lib/countries";
import { getOtherCountries, REGIONS } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  groupCatalogueItems,
  shouldUseGroupedPicker,
  type ServicePickerGroup,
  type ServicePickerTab,
} from "@/lib/leads/servicePickerGroups";

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

/** Same country universe as lead form (RegionCountriesPicker). */
function allLeadFormCountries(): string[] {
  const set = new Set<string>();
  for (const r of REGIONS) for (const c of r.countries) set.add(c);
  for (const c of getOtherCountries()) set.add(c.name);
  return [...set].sort((a, b) => a.localeCompare(b));
}

const SERVICE_TABS: {
  key: string;
  label: string;
  masterKeys: string[];
  grouped: ServicePickerTab;
}[] = [
  { key: "coaching", label: "Coaching", masterKeys: ["coaching_services"], grouped: "coaching_services" },
  { key: "visa", label: "Visa & Immigration", masterKeys: ["visa_immigration"], grouped: "visa_services" },
  { key: "admission", label: "Admissions", masterKeys: ["admission_services"], grouped: "admission_services" },
  { key: "allied", label: "Allied & Travel", masterKeys: ["allied_services", "travel_financial"], grouped: "allied_travel" },
];

export type ScopeFormState = {
  scope_preset: string;
  scope_json: ScopeJson;
};

interface Props {
  value: ScopeFormState;
  onChange: (v: ScopeFormState) => void;
}

function MultiSelectDropdown({
  label,
  hint,
  selected,
  onToggle,
  onClear,
  renderOption,
  options,
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  triggerWidth = "w-full",
}: {
  label: string;
  hint?: string;
  selected: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
  renderOption: (value: string) => ReactNode;
  options: string[];
  searchPlaceholder?: string;
  emptyText?: string;
  triggerWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
          {selected.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 max-w-full">
              <span className="truncate">{renderOption(v)}</span>
              <button type="button" onClick={() => onToggle(v)} className="hover:text-destructive shrink-0">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {onClear && selected.length > 1 && (
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
              Clear all
            </Button>
          )}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("mt-1 justify-between font-normal", triggerWidth)}
          >
            <span className="truncate text-muted-foreground">
              {selected.length ? `${selected.length} selected` : "Select…"}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3">{emptyText}</p>
            ) : (
              filtered.map((opt) => {
                const checked = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggle(opt)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent",
                      checked && "bg-accent/60",
                    )}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <span className="min-w-0 truncate">{renderOption(opt)}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function matchesServiceSearch(item: ServiceCatalogueItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    item.service_name,
    item.group_label,
    item.group_key,
    item.sub_category,
    item.country_tag,
  ].some((part) => (part ?? "").toLowerCase().includes(q));
}

function filterTabCatalogue(
  tabKey: string,
  items: ServiceCatalogueItem[],
  scopeCountries: string[],
  query: string,
): ServiceCatalogueItem[] {
  let list = items;
  if (tabKey === "visa" && scopeCountries.length > 0) {
    const norms = new Set(scopeCountries.map((c) => c.toLowerCase()));
    list = list.filter(
      (s) =>
        !s.country_tag ||
        norms.has(s.country_tag.toLowerCase()) ||
        norms.has((s.sub_category ?? "").toLowerCase()),
    );
  }
  if (!query.trim()) return list;
  return list.filter((s) => matchesServiceSearch(s, query));
}

function IncentiveServicePickerRow({
  item,
  checked,
  onToggle,
}: {
  item: ServiceCatalogueItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const code = catalogueItemCode(item);
  return (
    <button
      key={code}
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent",
        checked && "bg-accent/60",
      )}
    >
      <Checkbox checked={checked} className="pointer-events-none mt-0.5" />
      <span className="min-w-0">
        <span className="block truncate">{item.service_name}</span>
        {(item.country_tag || item.group_label) && (
          <span className="text-[10px] text-muted-foreground">
            {[item.group_label, item.country_tag].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
    </button>
  );
}

function IncentiveGroupedServicePicker({
  groups,
  selected,
  onToggle,
}: {
  groups: ServicePickerGroup[];
  selected: string[];
  onToggle: (code: string) => void;
}) {
  const multi = groups.filter((g) => g.items.length > 1);
  const single = groups.filter((g) => g.items.length === 1);

  return (
    <div className="divide-y">
      {single.map((group) => {
        const item = group.items[0]!;
        const code = catalogueItemCode(item);
        return (
          <IncentiveServicePickerRow
            key={code}
            item={item}
            checked={selected.includes(code)}
            onToggle={() => onToggle(code)}
          />
        );
      })}
      {multi.length > 0 && (
        <Accordion type="multiple" defaultValue={multi.map((g) => g.key)} className="divide-y">
          {multi.map((group) => {
            const selectedInGroup = group.items.filter((item) =>
              selected.includes(catalogueItemCode(item)),
            ).length;
            return (
              <AccordionItem key={group.key} value={group.key} className="border-0">
                <AccordionTrigger className="px-2 py-2 hover:no-underline hover:bg-muted/30 text-sm gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <span className="font-medium">{group.label}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {group.items.length} options
                    </span>
                    {selectedInGroup > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
                        {selectedInGroup}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-1 pt-0">
                  {group.sections ? (
                    group.sections.map((section) => (
                      <div key={section.key}>
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/20">
                          {section.label}
                        </div>
                        {section.items.map((item) => {
                          const code = catalogueItemCode(item);
                          return (
                            <IncentiveServicePickerRow
                              key={code}
                              item={item}
                              checked={selected.includes(code)}
                              onToggle={() => onToggle(code)}
                            />
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    group.items.map((item) => {
                      const code = catalogueItemCode(item);
                      return (
                        <IncentiveServicePickerRow
                          key={code}
                          item={item}
                          checked={selected.includes(code)}
                          onToggle={() => onToggle(code)}
                        />
                      );
                    })
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

export function IncentiveScopeFields({ value, onChange }: Props) {
  const countryOptions = useMemo(() => allLeadFormCountries(), []);
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);
  const [serviceTab, setServiceTab] = useState<string>("coaching");
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceOpen, setServiceOpen] = useState(false);

  useEffect(() => {
    fetchAllServiceCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
    supabase.from("upi_institutions").select("id, name").order("name").then(({ data }) => {
      setInstitutions((data ?? []) as { id: string; name: string }[]);
    });
  }, []);

  const sj = value.scope_json;

  function patchScope(patch: Partial<ScopeJson>) {
    onChange({ ...value, scope_json: { ...sj, ...patch } });
  }

  function toggleInList(key: keyof ScopeJson, item: string) {
    const list = ((sj[key] as string[] | undefined) ?? []).slice();
    const i = list.indexOf(item);
    if (i >= 0) list.splice(i, 1);
    else list.push(item);
    patchScope({ [key]: list.length ? list : undefined });
  }

  const serviceOptionsByTab = useMemo(() => {
    const map = new Map<string, ServiceCatalogueItem[]>();
    for (const tab of SERVICE_TABS) {
      const items = catalogue
        .filter((s) => tab.masterKeys.includes(s.master_key))
        .sort((a, b) => a.display_order - b.display_order || a.service_name.localeCompare(b.service_name));
      map.set(tab.key, items);
    }
    return map;
  }, [catalogue]);

  const selectedServices = sj.service_codes ?? [];

  function serviceLabel(code: string) {
    const item = findCatalogueItemForStoredCode(code, catalogue);
    return item?.service_name ?? code;
  }

  function toggleService(code: string) {
    toggleInList("service_codes", code);
  }

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div>
        <label className="text-xs text-muted-foreground">Scope preset</label>
        <select
          className={sel}
          value={value.scope_preset || "all_services"}
          onChange={(e) => onChange({ ...value, scope_preset: e.target.value })}
        >
          {SCOPE_PRESET_KEYS.map((k) => (
            <option key={k} value={k}>
              {SCOPE_PRESET_LABELS[k]}
            </option>
          ))}
          <option value="">Custom (use filters below)</option>
        </select>
      </div>

      <MultiSelectDropdown
        label="Countries (optional — AND filter)"
        hint="Same country list as lead form · select any combination"
        selected={sj.country_codes ?? []}
        onToggle={(name) => toggleInList("country_codes", name)}
        onClear={() => patchScope({ country_codes: undefined })}
        options={countryOptions}
        searchPlaceholder="Search countries…"
        renderOption={(name) => {
          const flag = findCountry(name)?.flag;
          return (
            <>
              {flag && <span className="mr-1">{flag}</span>}
              {name}
            </>
          );
        }}
      />

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Institutions (optional — campaign / B2B)</label>
        <select
          className={sel}
          value=""
          onChange={(e) => {
            if (e.target.value) toggleInList("institution_ids", e.target.value);
          }}
        >
          <option value="">Add institution…</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {(sj.institution_ids ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(sj.institution_ids ?? []).map((id) => (
              <span key={id} className="text-xs bg-primary/10 px-2 py-0.5 rounded">
                {institutions.find((i) => i.id === id)?.name ?? id}
                <button
                  type="button"
                  className="ml-1 text-muted-foreground"
                  onClick={() => toggleInList("institution_ids", id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Intake seasons (comma-separated, e.g. Sep-2026, Jan-2027)</label>
        <input
          className={sel}
          value={(sj.intakes ?? []).join(", ")}
          onChange={(e) =>
            patchScope({
              intakes: e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
          placeholder="Sep-2026"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Specific services (optional)</label>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Same catalogue as lead form Services Required · empty = all services in preset
        </p>

        {selectedServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
            {selectedServices.map((code) => (
              <Badge key={code} variant="secondary" className="gap-1 max-w-full">
                <span className="truncate">{serviceLabel(code)}</span>
                <button type="button" onClick={() => toggleService(code)} className="hover:text-destructive shrink-0">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {selectedServices.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => patchScope({ service_codes: undefined })}
              >
                Clear all
              </Button>
            )}
          </div>
        )}

        <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="mt-1 w-full justify-between font-normal">
              <span className="truncate text-muted-foreground">
                {selectedServices.length ? `${selectedServices.length} service(s) selected` : "Select services…"}
              </span>
              <ChevronDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(28rem,calc(100vw-2rem))] p-0" align="start">
            <Tabs value={serviceTab} onValueChange={setServiceTab}>
              <div className="border-b px-2 pt-2">
                <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-transparent p-0">
                  {SERVICE_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div className="p-2 border-b">
                <Input
                  value={serviceQuery}
                  onChange={(e) => setServiceQuery(e.target.value)}
                  placeholder="Search services, groups (Student, Visitor…) or countries…"
                  className="h-8 text-sm"
                />
              </div>
              {SERVICE_TABS.map((tab) => {
                const tabItems = serviceOptionsByTab.get(tab.key) ?? [];
                const scopeCountries = sj.country_codes ?? [];
                const items = filterTabCatalogue(tab.key, tabItems, scopeCountries, serviceQuery);
                const useGrouped = shouldUseGroupedPicker(tab.grouped, items);
                const groups = useGrouped ? groupCatalogueItems(items, tab.grouped) : [];
                return (
                  <TabsContent key={tab.key} value={tab.key} className="mt-0 max-h-72 overflow-y-auto p-1">
                    {tab.key === "visa" && scopeCountries.length > 0 && items.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-2">
                        No visa services for selected countries — adjust Countries above or clear the filter.
                      </p>
                    )}
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-3">No services in this tab.</p>
                    ) : useGrouped ? (
                      <IncentiveGroupedServicePicker
                        groups={groups}
                        selected={selectedServices}
                        onToggle={toggleService}
                      />
                    ) : (
                      items.map((s) => {
                        const code = catalogueItemCode(s);
                        return (
                          <IncentiveServicePickerRow
                            key={code}
                            item={s}
                            checked={selectedServices.includes(code)}
                            onToggle={() => toggleService(code)}
                          />
                        );
                      })
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
