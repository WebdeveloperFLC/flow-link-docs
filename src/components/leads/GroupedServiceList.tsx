import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { ServiceCatalogueItem } from "@/lib/leads";
import { type FeeCurrency } from "@/lib/leads/serviceFeeLabel";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import { ServicePickerRow, ServiceFeeColumnsHeader } from "@/components/leads/ServicePickerRow";
import {
  groupCatalogueItems,
  groupsWithSelection,
  type ServicePickerGroup,
  type ServicePickerTab,
} from "@/lib/leads/servicePickerGroups";
import {
  catalogueItemCode,
  isServiceCodeSelected,
} from "@/lib/service-library/serviceSelectionMatch";

function GroupItems({
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
  return (
    <div className="divide-y">
      {items.map((item) => {
        const code = catalogueItemCode(item);
        const selectionKey = getSelectionKey(item);
        const checked = isServiceCodeSelected(value[selectionKey] ?? [], item, catalogue);
        return (
          <ServicePickerRow
            key={item.id}
            item={item}
            checked={checked}
            disabled={disabled}
            openNote={openNote}
            onToggle={() => onToggle(selectionKey, code)}
            onOpenNote={onOpenNote}
            feeCurrency={feeCurrency}
          />
        );
      })}
    </div>
  );
}

function GroupAccordion({
  group,
  catalogue,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  openNote,
  onOpenNote,
  feeCurrency,
}: {
  group: ServicePickerGroup;
  catalogue: ServiceCatalogueItem[];
  getSelectionKey: (item: ServiceCatalogueItem) => keyof ServiceSelection;
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  disabled?: boolean;
  openNote: string | null;
  onOpenNote: (id: string | null) => void;
  feeCurrency: FeeCurrency;
}) {
  const selectedCount = group.items.filter((item) => {
    const key = getSelectionKey(item);
    return isServiceCodeSelected(value[key] ?? [], item, catalogue);
  }).length;

  // Single-option groups: show fees inline without an extra accordion level.
  if (group.items.length === 1) {
    const item = group.items[0]!;
    const code = catalogueItemCode(item);
    const selectionKey = getSelectionKey(item);
    const checked = isServiceCodeSelected(value[selectionKey] ?? [], item, catalogue);
    return (
      <div className="border-b last:border-b-0">
        <ServicePickerRow
          item={item}
          checked={checked}
          disabled={disabled}
          openNote={openNote}
          onToggle={() => onToggle(selectionKey, code)}
          onOpenNote={onOpenNote}
          feeCurrency={feeCurrency}
        />
      </div>
    );
  }

  return (
    <AccordionItem value={group.key} className="border-b last:border-b-0">
      <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/30 text-sm gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <span className="font-medium">{group.label}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {group.items.length} options
          </span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
              {selectedCount}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-0 pt-0">
        <ServiceFeeColumnsHeader feeCurrency={feeCurrency} />
        {group.sections ? (
          <div className="divide-y">
            {group.sections.map((section) => (
              <div key={section.key}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/20">
                  {section.label}
                </div>
                <GroupItems
                  items={section.items}
                  catalogue={catalogue}
                  getSelectionKey={getSelectionKey}
                  value={value}
                  onToggle={onToggle}
                  disabled={disabled}
                  openNote={openNote}
                  onOpenNote={onOpenNote}
                  feeCurrency={feeCurrency}
                />
              </div>
            ))}
          </div>
        ) : (
          <GroupItems
            items={group.items}
            catalogue={catalogue}
            getSelectionKey={getSelectionKey}
            value={value}
            onToggle={onToggle}
            disabled={disabled}
            openNote={openNote}
            onOpenNote={onOpenNote}
            feeCurrency={feeCurrency}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export function GroupedServiceList({
  items,
  catalogue,
  tab,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  openNote,
  onOpenNote,
  feeCurrency = "INR",
  showFeeHeader = false,
}: {
  items: ServiceCatalogueItem[];
  catalogue: ServiceCatalogueItem[];
  tab: ServicePickerTab;
  getSelectionKey: (item: ServiceCatalogueItem) => keyof ServiceSelection;
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  disabled?: boolean;
  openNote: string | null;
  onOpenNote: (id: string | null) => void;
  feeCurrency?: FeeCurrency;
  showFeeHeader?: boolean;
}) {
  const groups = useMemo(() => groupCatalogueItems(items, tab), [items, tab]);

  const defaultOpen = useMemo(
    () => groupsWithSelection(groups, value, catalogue, getSelectionKey, isServiceCodeSelected),
    [groups, value, catalogue, getSelectionKey],
  );

  if (items.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center border rounded-md">
        No services
      </div>
    );
  }

  const multiGroups = groups.filter((g) => g.items.length > 1);
  const singleGroups = groups.filter((g) => g.items.length === 1);

  return (
    <div className={cn("border rounded-md divide-y min-w-0 overflow-x-auto", disabled && "opacity-50 pointer-events-none")}>
      {showFeeHeader && <ServiceFeeColumnsHeader feeCurrency={feeCurrency} />}
      {singleGroups.map((group) => (
        <GroupAccordion
          key={group.key}
          group={group}
          catalogue={catalogue}
          getSelectionKey={getSelectionKey}
          value={value}
          onToggle={onToggle}
          disabled={disabled}
          openNote={openNote}
          onOpenNote={onOpenNote}
          feeCurrency={feeCurrency}
        />
      ))}
      {multiGroups.length > 0 && (
        <Accordion
          type="multiple"
          defaultValue={defaultOpen.filter((k) => multiGroups.some((g) => g.key === k))}
          className="divide-y"
        >
          {multiGroups.map((group) => (
            <GroupAccordion
              key={group.key}
              group={group}
              catalogue={catalogue}
              getSelectionKey={getSelectionKey}
              value={value}
              onToggle={onToggle}
              disabled={disabled}
              openNote={openNote}
              onOpenNote={onOpenNote}
              feeCurrency={feeCurrency}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}
