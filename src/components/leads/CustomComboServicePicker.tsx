import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ServiceCatalogueItem } from "@/lib/leads";
import { type FeeCurrency } from "@/lib/leads/serviceFeeLabel";
import type { ServicePickerTab } from "@/lib/leads/servicePickerGroups";
import { shouldUseGroupedPicker } from "@/lib/leads/servicePickerGroups";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import { selectionKeyForItem } from "@/components/leads/serviceTabsConfig";
import { ServicePickerListBody } from "@/components/leads/ServicePickerListBody";
import { isServiceCodeSelected } from "@/lib/service-library/serviceSelectionMatch";

type ComboSection = {
  id: string;
  label: string;
  masterKeys: string[];
  grouped?: ServicePickerTab;
  isVisa?: boolean;
};

const COMBO_SECTIONS: ComboSection[] = [
  {
    id: "coaching",
    label: "Coaching",
    masterKeys: ["coaching_services"],
    grouped: "coaching_services",
  },
  {
    id: "visa",
    label: "Visa & Immigration",
    masterKeys: ["visa_immigration"],
    grouped: "visa_services",
    isVisa: true,
  },
  {
    id: "allied",
    label: "Allied",
    masterKeys: ["allied_services"],
    grouped: "allied_travel",
  },
  {
    id: "travel",
    label: "Travel",
    masterKeys: ["travel_financial"],
    grouped: "allied_travel",
  },
];

export function CustomComboServicePicker({
  byKey,
  catalogue,
  value,
  onToggle,
  visaLocked,
  interestedCountries,
  visaCountry,
  onVisaCountryChange,
  feeCurrency,
  onFeeCurrencyChange,
  collapseOnSelect,
  accordionResetKey,
}: {
  byKey: Record<string, ServiceCatalogueItem[]>;
  catalogue: ServiceCatalogueItem[];
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  visaLocked?: boolean;
  interestedCountries?: string[];
  visaCountry: string;
  onVisaCountryChange: (country: string) => void;
  feeCurrency: FeeCurrency;
  onFeeCurrencyChange: (cur: FeeCurrency) => void;
  collapseOnSelect?: boolean;
  accordionResetKey?: string | number;
}) {
  const [openNote, setOpenNote] = useState<string | null>(null);

  const visaCountries = useMemo(() => {
    if (interestedCountries?.length) return [...interestedCountries].sort();
    const set = new Set<string>();
    (byKey["visa_immigration"] ?? []).forEach((s) => {
      if (s.country_tag) set.add(s.country_tag);
    });
    return Array.from(set).sort();
  }, [byKey, interestedCountries]);

  const noCountriesPicked =
    interestedCountries !== undefined && interestedCountries.length === 0;

  const sections = useMemo(
    () =>
      COMBO_SECTIONS.map((section) => {
        let items = section.masterKeys.flatMap((mk) => byKey[mk] ?? []);
        if (section.isVisa) {
          if (visaCountry !== "ALL") {
            items = items.filter((s) => s.country_tag === visaCountry);
          } else if (interestedCountries?.length) {
            items = items.filter(
              (s) => !s.country_tag || interestedCountries.includes(s.country_tag),
            );
          }
        }
        if (section.id === "allied") {
          items = items.filter((s) => s.master_key === "allied_services");
        }
        if (section.id === "travel") {
          items = items.filter((s) => s.master_key === "travel_financial");
        }
        const useGrouped = !!section.grouped && shouldUseGroupedPicker(section.grouped, items);
        const selectedCount = items.filter((item) => {
          const key = selectionKeyForItem(item);
          return isServiceCodeSelected(value[key] ?? [], item, catalogue);
        }).length;
        return { section, items, useGrouped, selectedCount };
      }),
    [byKey, catalogue, feeCurrency, interestedCountries, value, visaCountry],
  );

  const defaultOpen = sections
    .filter((s) => s.selectedCount > 0 || s.section.isVisa)
    .map((s) => s.section.id);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Build a single service offer across coaching, visa, allied and travel. Selections are saved
        to the same service lists used everywhere on this lead or client.
      </p>
      <Accordion
        key={accordionResetKey}
        type="multiple"
        defaultValue={defaultOpen.length ? defaultOpen : ["coaching"]}
        className="rounded-md border"
      >
        {sections.map(({ section, items, useGrouped, selectedCount }) => {
          const locked = section.isVisa && visaLocked;
          const visaBlocked = section.isVisa && noCountriesPicked;

          return (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                <span className="flex items-center gap-2">
                  {section.label}
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {selectedCount}
                    </Badge>
                  )}
                  {locked && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      Locked
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                {section.isVisa && visaBlocked ? (
                  <div className="p-3 text-sm text-muted-foreground border rounded-md bg-muted/30 text-center">
                    Select countries of interest under Geography to see visa services.
                  </div>
                ) : (
                  <>
                    {section.isVisa && !visaBlocked && (
                      <div className="space-y-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Consultancy ({feeCurrency}); filter by destination:
                          </span>
                          <div className="inline-flex rounded-md border p-0.5">
                            {(["INR", "CAD"] as FeeCurrency[]).map((cur) => (
                              <button
                                key={cur}
                                type="button"
                                onClick={() => onFeeCurrencyChange(cur)}
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
                              onClick={() => onVisaCountryChange("ALL")}
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
                                onClick={() => onVisaCountryChange(c)}
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
                      </div>
                    )}
                    <ServicePickerListBody
                      items={items}
                      catalogue={catalogue}
                      groupedTab={section.grouped}
                      useGrouped={useGrouped}
                      getSelectionKey={selectionKeyForItem}
                      value={value}
                      onToggle={onToggle}
                      disabled={locked || visaBlocked}
                      openNote={openNote}
                      onOpenNote={setOpenNote}
                      feeCurrency={section.isVisa ? feeCurrency : "INR"}
                      showFeeHeader={!!section.isVisa}
                      collapseOnSelect={collapseOnSelect}
                    />
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
