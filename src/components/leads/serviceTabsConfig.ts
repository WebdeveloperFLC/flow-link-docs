import type { ServiceCatalogueItem } from "@/lib/leads";
import { shouldUseGroupedPicker, type ServicePickerTab } from "@/lib/leads/servicePickerGroups";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";

export type ServiceTabKey = keyof ServiceSelection | "allied_travel";

export interface ServiceTabConfig {
  key: ServiceTabKey;
  label: string;
  masterKeys: string[];
  selectionKey?: keyof ServiceSelection;
  grouped?: ServicePickerTab;
  dialogTitle: string;
}

export const SERVICE_TABS: ServiceTabConfig[] = [
  {
    key: "coaching_services",
    label: "Coaching",
    masterKeys: ["coaching_services"],
    selectionKey: "coaching_services",
    grouped: "coaching_services",
    dialogTitle: "Choose coaching services",
  },
  {
    key: "visa_services",
    label: "Visa & Immigration",
    masterKeys: ["visa_immigration"],
    selectionKey: "visa_services",
    grouped: "visa_services",
    dialogTitle: "Choose visa & immigration services",
  },
  {
    key: "allied_travel",
    label: "Allied & Travel",
    masterKeys: ["allied_services", "travel_financial"],
    grouped: "allied_travel",
    dialogTitle: "Choose allied & travel services",
  },
];

export function selectionKeyForItem(s: ServiceCatalogueItem): keyof ServiceSelection {
  if (s.master_key === "travel_financial") return "travel_services";
  if (s.master_key === "admission_services") return "admission_services";
  if (s.master_key === "coaching_services") return "coaching_services";
  if (s.master_key === "visa_immigration") return "visa_services";
  return "allied_services";
}

export function tabSelectionCount(tabKey: ServiceTabKey, value: ServiceSelection): number {
  if (tabKey === "allied_travel") {
    return (value.allied_services?.length ?? 0) + (value.travel_services?.length ?? 0);
  }
  if (tabKey === "coaching_services") return value.coaching_services?.length ?? 0;
  return value.visa_services?.length ?? 0;
}

export function filterCatalogueForTab(
  tab: ServiceTabConfig,
  byKey: Record<string, ServiceCatalogueItem[]>,
  opts: {
    visaCountry: string;
    interestedCountries?: string[];
  },
): ServiceCatalogueItem[] {
  const list = tab.masterKeys.flatMap((mk) => byKey[mk] ?? []);
  const isVisa = tab.key === "visa_services";
  if (!isVisa) return list;
  if (opts.visaCountry !== "ALL") {
    return list.filter((s) => s.country_tag === opts.visaCountry);
  }
  if (opts.interestedCountries) {
    return list.filter((s) => !s.country_tag || opts.interestedCountries!.includes(s.country_tag));
  }
  return list;
}

export function shouldUseGroupedForTab(
  tab: ServiceTabConfig,
  filtered: ServiceCatalogueItem[],
): boolean {
  return !!tab.grouped && shouldUseGroupedPicker(tab.grouped, filtered);
}
