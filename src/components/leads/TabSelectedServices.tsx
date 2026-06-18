import type { ServiceCatalogueItem } from "@/lib/leads";
import { useServiceLabelMap } from "@/lib/service-library/useServiceLabelMap";
import {
  codesForTabSelection,
  serviceSelectionForTab,
} from "@/lib/service-library/serviceSelectionSummary";
import { SelectedServicesPanel } from "@/components/clients/SelectedServicesPanel";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import {
  tabSelectionCount,
  type ServiceTabKey,
} from "@/components/leads/serviceTabsConfig";

export function TabSelectedServices({
  tabKey,
  value,
  catalogue,
  onChange,
}: {
  tabKey: ServiceTabKey;
  value: ServiceSelection;
  catalogue: ServiceCatalogueItem[];
  onChange: (v: ServiceSelection) => void;
}) {
  const codes = codesForTabSelection(tabKey, value);
  const labelByCode = useServiceLabelMap(codes, catalogue);
  const tabValue = serviceSelectionForTab(tabKey, value);
  const count = tabSelectionCount(tabKey, value);

  if (count === 0) return null;

  return (
    <SelectedServicesPanel
      value={tabValue}
      catalogue={catalogue}
      labelByCode={labelByCode}
      onChange={(next) => {
        if (tabKey === "all" || tabKey === "custom_combo") {
          onChange(next);
          return;
        }
        if (tabKey === "coaching_services") {
          onChange({ ...value, coaching_services: next.coaching_services });
          return;
        }
        if (tabKey === "visa_services") {
          onChange({ ...value, visa_services: next.visa_services });
          return;
        }
        onChange({
          ...value,
          allied_services: next.allied_services,
          travel_services: next.travel_services,
          admission_services: next.admission_services,
        });
      }}
    />
  );
}
