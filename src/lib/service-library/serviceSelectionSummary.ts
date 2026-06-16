import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import type { ServiceTabKey } from "@/components/leads/serviceTabsConfig";

/** When true, ServiceTabs skips TabSelectedServices (parent renders SelectedServicesPanel). */
export function shouldShowTabSelectedSummary(
  layout: "inline" | "compact",
  externalSelectedSummary: boolean,
): boolean {
  if (externalSelectedSummary && layout === "inline") return false;
  return true;
}

/** Slice of ServiceSelection for a tab's "Currently selected" panel. */
export function serviceSelectionForTab(
  tabKey: ServiceTabKey,
  value: ServiceSelection,
): ServiceSelection {
  if (tabKey === "all") return value;
  if (tabKey === "coaching_services") {
    return {
      coaching_services: value.coaching_services ?? [],
      visa_services: [],
      admission_services: [],
      allied_services: [],
      travel_services: [],
    };
  }
  if (tabKey === "visa_services") {
    return {
      coaching_services: [],
      visa_services: value.visa_services ?? [],
      admission_services: [],
      allied_services: [],
      travel_services: [],
    };
  }
  return {
    coaching_services: [],
    visa_services: [],
    admission_services: value.admission_services ?? [],
    allied_services: value.allied_services ?? [],
    travel_services: value.travel_services ?? [],
  };
}

/** Codes shown in TabSelectedServices for label-map resolution. */
export function codesForTabSelection(tabKey: ServiceTabKey, value: ServiceSelection): string[] {
  const slice = serviceSelectionForTab(tabKey, value);
  return [
    ...(slice.coaching_services ?? []),
    ...(slice.visa_services ?? []),
    ...(slice.admission_services ?? []),
    ...(slice.allied_services ?? []),
    ...(slice.travel_services ?? []),
  ];
}
