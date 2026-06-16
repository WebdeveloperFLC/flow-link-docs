import { useMemo } from "react";
import type { ServiceCatalogueItem } from "@/lib/leads";
import { catalogueItemCode } from "@/lib/service-library/serviceSelectionMatch";
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
  const labelByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const item of catalogue) {
      m.set(catalogueItemCode(item), item.service_name);
    }
    return m;
  }, [catalogue]);

  const tabValue = useMemo((): ServiceSelection => {
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
  }, [tabKey, value]);

  const count = tabSelectionCount(tabKey, value);

  if (count === 0) return null;

  return (
    <SelectedServicesPanel
      value={tabValue}
      catalogue={catalogue}
      labelByCode={labelByCode}
      onChange={(next) => {
        if (tabKey === "all") {
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
