import { cn } from "@/lib/utils";
import type { ServiceCatalogueItem } from "@/lib/leads";
import { type FeeCurrency } from "@/lib/leads/serviceFeeLabel";
import type { ServicePickerTab } from "@/lib/leads/servicePickerGroups";
import { GroupedServiceList } from "@/components/leads/GroupedServiceList";
import { ServicePickerRow, ServiceFeeColumnsHeader } from "@/components/leads/ServicePickerRow";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import {
  catalogueItemCode,
  isServiceCodeSelected,
} from "@/lib/service-library/serviceSelectionMatch";

export function FlatServiceList({
  items,
  catalogue,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  openNote,
  onOpenNote,
  feeCurrency,
}: {
  items: ServiceCatalogueItem[];
  catalogue: ServiceCatalogueItem[];
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
    <div className={cn("border rounded-md divide-y overflow-x-auto min-w-0", disabled && "opacity-50 pointer-events-none")}>
      <ServiceFeeColumnsHeader feeCurrency={feeCurrency} />
      {items.map((s) => {
        const code = catalogueItemCode(s);
        const itemKey = getSelectionKey(s);
        const checked = isServiceCodeSelected(value[itemKey] ?? [], s, catalogue);
        return (
          <ServicePickerRow
            key={s.id}
            item={s}
            checked={checked}
            disabled={disabled}
            openNote={openNote}
            onToggle={() => onToggle(itemKey, code)}
            onOpenNote={onOpenNote}
            feeCurrency={feeCurrency}
          />
        );
      })}
    </div>
  );
}

export function ServicePickerListBody({
  items,
  catalogue,
  groupedTab,
  useGrouped,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  openNote,
  onOpenNote,
  feeCurrency,
  showFeeHeader,
  collapseOnSelect,
  accordionResetKey,
}: {
  items: ServiceCatalogueItem[];
  catalogue: ServiceCatalogueItem[];
  groupedTab?: ServicePickerTab;
  useGrouped: boolean;
  getSelectionKey: (item: ServiceCatalogueItem) => keyof ServiceSelection;
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  disabled?: boolean;
  openNote: string | null;
  onOpenNote: (id: string | null) => void;
  feeCurrency: FeeCurrency;
  showFeeHeader: boolean;
  collapseOnSelect?: boolean;
  accordionResetKey?: string | number;
}) {
  if (useGrouped && groupedTab) {
    return (
      <GroupedServiceList
        items={items}
        catalogue={catalogue}
        tab={groupedTab}
        getSelectionKey={getSelectionKey}
        value={value}
        onToggle={onToggle}
        disabled={disabled}
        openNote={openNote}
        onOpenNote={onOpenNote}
        feeCurrency={feeCurrency}
        showFeeHeader={showFeeHeader}
        collapseOnSelect={collapseOnSelect}
        accordionResetKey={accordionResetKey}
      />
    );
  }

  return (
    <FlatServiceList
      items={items}
      catalogue={catalogue}
      getSelectionKey={getSelectionKey}
      value={value}
      onToggle={onToggle}
      disabled={disabled}
      openNote={openNote}
      onOpenNote={onOpenNote}
      feeCurrency={feeCurrency}
    />
  );
}
