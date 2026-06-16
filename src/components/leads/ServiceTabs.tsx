import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { type FeeCurrency } from "@/lib/leads/serviceFeeLabel";
import { ServicePickerDialog } from "@/components/leads/ServicePickerDialog";
import { ServicePickerListBody } from "@/components/leads/ServicePickerListBody";
import { TabSelectedServices } from "@/components/leads/TabSelectedServices";
import {
  SERVICE_TABS,
  filterCatalogueForTab,
  selectionKeyForItem,
  shouldUseGroupedForTab,
  tabSelectionCount,
  type ServiceTabKey,
} from "@/components/leads/serviceTabsConfig";
import {
  catalogueItemCode,
  toggleServiceSelectionCodes,
} from "@/lib/service-library/serviceSelectionMatch";

export interface ServiceSelection {
  coaching_services: string[];
  visa_services: string[];
  admission_services: string[];
  allied_services: string[];
  travel_services: string[];
}

export type ServiceTabsLayout = "inline" | "compact";

export const ServiceTabs = ({
  value,
  onChange,
  visaLocked,
  onCommit,
  interestedCountries,
  layout = "compact",
}: {
  value: ServiceSelection;
  onChange: (v: ServiceSelection) => void;
  visaLocked: boolean;
  onCommit?: (key: keyof ServiceSelection, list: string[]) => void;
  interestedCountries?: string[];
  layout?: ServiceTabsLayout;
}) => {
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [visaCountry, setVisaCountry] = useState<string>("ALL");
  const [feeCurrency, setFeeCurrency] = useState<FeeCurrency>("INR");
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [pickerTab, setPickerTab] = useState<ServiceTabKey | null>(null);

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
    const item = catalogue.find((s) => catalogueItemCode(s) === code);
    const next = item
      ? toggleServiceSelectionCodes(cur, item, catalogue)
      : cur.includes(code)
        ? cur.filter((x) => x !== code)
        : [...cur, code];
    onChange({ ...value, [key]: next });
    onCommit?.(key, next);
  };

  const activePickerTab = pickerTab ? SERVICE_TABS.find((t) => t.key === pickerTab) : null;

  const pickerDialogProps = useMemo(() => {
    if (!activePickerTab) return null;
    const filtered = filterCatalogueForTab(activePickerTab, byKey, {
      visaCountry,
      interestedCountries,
    });
    const getSelectionKey = (s: ServiceCatalogueItem): keyof ServiceSelection =>
      activePickerTab.selectionKey ?? selectionKeyForItem(s);
    const useGrouped = shouldUseGroupedForTab(activePickerTab, filtered);
    const isVisa = activePickerTab.key === "visa_services";
    return {
      tab: activePickerTab,
      items: filtered,
      getSelectionKey,
      useGrouped,
      disabled: isVisa && visaLocked,
      feeCurrency: (isVisa ? feeCurrency : "INR") as FeeCurrency,
      showFeeHeader: isVisa,
    };
  }, [activePickerTab, byKey, visaCountry, interestedCountries, feeCurrency, visaLocked]);

  return (
    <>
      <Tabs defaultValue={SERVICE_TABS[0].key}>
        <TabsList className="w-full justify-start flex-wrap h-auto">
          {SERVICE_TABS.map((t) => {
            const count = tabSelectionCount(t.key, value);
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

        {SERVICE_TABS.map((t) => {
          const filtered = filterCatalogueForTab(t, byKey, { visaCountry, interestedCountries });
          const isVisa = t.key === "visa_services";
          const locked = isVisa && visaLocked;
          const noCountriesPicked =
            isVisa && interestedCountries !== undefined && interestedCountries.length === 0;
          const getSelectionKey = (s: ServiceCatalogueItem): keyof ServiceSelection =>
            t.selectionKey ?? selectionKeyForItem(s);
          const useGrouped = shouldUseGroupedForTab(t, filtered);
          const count = tabSelectionCount(t.key, value);

          return (
            <TabsContent key={t.key} value={t.key} className="space-y-3">
              {isVisa && noCountriesPicked && (
                <div className="p-4 text-sm text-muted-foreground border rounded-md bg-muted/30 text-center">
                  Select countries of interest under Geography to see visa services.
                </div>
              )}

              {isVisa && !noCountriesPicked && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Filter by destination country to add services. Consultancy ({feeCurrency}); government
                      fees:
                    </span>
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
                  {visaCountries.length > 0 && (
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
                </>
              )}

              {layout === "compact" ? (
                <div className="space-y-3">
                  <TabSelectedServices
                    tabKey={t.key}
                    value={value}
                    catalogue={catalogue}
                    onChange={onChange}
                  />
                  {!(isVisa && noCountriesPicked) && (
                    <>
                      {count === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No services selected yet. Open the picker to add services.
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={locked || (isVisa && noCountriesPicked)}
                        onClick={() => setPickerTab(t.key)}
                      >
                        <Plus className="size-4 mr-1.5" />
                        {count > 0 ? "Edit services" : "Add services"}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                !(isVisa && noCountriesPicked) && (
                  <ServicePickerListBody
                    items={filtered}
                    catalogue={catalogue}
                    groupedTab={t.grouped}
                    useGrouped={useGrouped}
                    getSelectionKey={getSelectionKey}
                    value={value}
                    onToggle={toggle}
                    disabled={locked}
                    openNote={openNote}
                    onOpenNote={setOpenNote}
                    feeCurrency={isVisa ? feeCurrency : "INR"}
                    showFeeHeader={isVisa}
                    collapseOnSelect={false}
                  />
                )
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {pickerDialogProps && (
        <ServicePickerDialog
          open={pickerTab !== null}
          onOpenChange={(open) => {
            if (!open) setPickerTab(null);
          }}
          tab={pickerDialogProps.tab}
          title={pickerDialogProps.tab.dialogTitle}
          items={pickerDialogProps.items}
          catalogue={catalogue}
          useGrouped={pickerDialogProps.useGrouped}
          getSelectionKey={pickerDialogProps.getSelectionKey}
          value={value}
          onToggle={toggle}
          disabled={pickerDialogProps.disabled}
          feeCurrency={pickerDialogProps.feeCurrency}
          showFeeHeader={pickerDialogProps.showFeeHeader}
        />
      )}
    </>
  );
};
