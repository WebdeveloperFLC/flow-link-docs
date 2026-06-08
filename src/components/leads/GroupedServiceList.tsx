import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Info, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { ServiceCatalogueItem } from "@/lib/leads";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import {
  groupCatalogueItems,
  groupsWithSelection,
  type ServicePickerGroup,
  type ServicePickerTab,
} from "@/lib/leads/servicePickerGroups";

function serviceFeeLabel(s: ServiceCatalogueItem): string {
  if (s.fee_inr) return `₹${Number(s.fee_inr).toLocaleString("en-IN")}`;
  if (s.pricing_type === "FREE") return "Free";
  if (s.pricing_type === "ON_REQUEST") return "On request";
  return "—";
}

function ServicePickerRow({
  item,
  checked,
  disabled,
  openNote,
  onToggle,
  onOpenNote,
}: {
  item: ServiceCatalogueItem;
  checked: boolean;
  disabled?: boolean;
  openNote: string | null;
  onToggle: () => void;
  onOpenNote: (id: string | null) => void;
}) {
  const hasNote = typeof item.notes === "string" && item.notes.trim().length > 0;

  return (
    <label
      className={cn(
        "flex items-center gap-3 px-3 py-2 cursor-pointer border-l-2 transition-colors",
        checked
          ? "bg-primary/5 border-primary hover:bg-primary/10"
          : "border-transparent hover:bg-muted/30",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} disabled={disabled} />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm truncate flex items-center gap-1.5",
            checked ? "font-semibold text-foreground" : "font-medium",
          )}
        >
          <span className="truncate">{item.service_name}</span>
          {hasNote && (
            <Popover open={openNote === item.id} onOpenChange={(o) => onOpenNote(o ? item.id : null)}>
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
                  <div className="text-sm font-medium">{item.service_name}</div>
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
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {item.sub_category && (
          <div className="text-xs text-muted-foreground">{item.sub_category}</div>
        )}
      </div>
      <div className="text-xs text-muted-foreground whitespace-nowrap">{serviceFeeLabel(item)}</div>
    </label>
  );
}

function GroupItems({
  items,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  openNote,
  onOpenNote,
}: {
  items: ServiceCatalogueItem[];
  getSelectionKey: (item: ServiceCatalogueItem) => keyof ServiceSelection;
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  disabled?: boolean;
  openNote: string | null;
  onOpenNote: (id: string | null) => void;
}) {
  return (
    <div className="divide-y">
      {items.map((item) => {
        const code = item.service_code || item.id;
        const selectionKey = getSelectionKey(item);
        const checked = (value[selectionKey] ?? []).includes(code);
        return (
          <ServicePickerRow
            key={item.id}
            item={item}
            checked={checked}
            disabled={disabled}
            openNote={openNote}
            onToggle={() => onToggle(selectionKey, code)}
            onOpenNote={onOpenNote}
          />
        );
      })}
    </div>
  );
}

function GroupAccordion({
  group,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  openNote,
  onOpenNote,
}: {
  group: ServicePickerGroup;
  getSelectionKey: (item: ServiceCatalogueItem) => keyof ServiceSelection;
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  disabled?: boolean;
  openNote: string | null;
  onOpenNote: (id: string | null) => void;
}) {
  const selectedCount = group.items.filter((item) => {
    const code = item.service_code || item.id;
    const key = getSelectionKey(item);
    return (value[key] ?? []).includes(code);
  }).length;

  return (
    <AccordionItem value={group.key} className="border-b last:border-b-0">
      <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/30 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{group.label}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {group.items.length} option{group.items.length === 1 ? "" : "s"}
          </span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
              {selectedCount}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-0 pt-0">
        {group.sections ? (
          <div className="divide-y">
            {group.sections.map((section) => (
              <div key={section.key}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/20">
                  {section.label}
                </div>
                <GroupItems
                  items={section.items}
                  getSelectionKey={getSelectionKey}
                  value={value}
                  onToggle={onToggle}
                  disabled={disabled}
                  openNote={openNote}
                  onOpenNote={onOpenNote}
                />
              </div>
            ))}
          </div>
        ) : (
          <GroupItems
            items={group.items}
            getSelectionKey={getSelectionKey}
            value={value}
            onToggle={onToggle}
            disabled={disabled}
            openNote={openNote}
            onOpenNote={onOpenNote}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export function GroupedServiceList({
  items,
  tab,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  openNote,
  onOpenNote,
}: {
  items: ServiceCatalogueItem[];
  tab: ServicePickerTab;
  getSelectionKey: (item: ServiceCatalogueItem) => keyof ServiceSelection;
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  disabled?: boolean;
  openNote: string | null;
  onOpenNote: (id: string | null) => void;
}) {
  const groups = useMemo(() => groupCatalogueItems(items, tab), [items, tab]);

  const selectedCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const key of Object.keys(value) as (keyof ServiceSelection)[]) {
      for (const code of value[key] ?? []) codes.add(code);
    }
    return codes;
  }, [value]);

  const defaultOpen = useMemo(
    () => groupsWithSelection(groups, selectedCodes),
    [groups, selectedCodes],
  );

  if (items.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center border rounded-md">
        No services
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpen.length > 0 ? defaultOpen : undefined}
      className="border rounded-md divide-y"
    >
      {groups.map((group) => (
        <GroupAccordion
          key={group.key}
          group={group}
          getSelectionKey={getSelectionKey}
          value={value}
          onToggle={onToggle}
          disabled={disabled}
          openNote={openNote}
          onOpenNote={onOpenNote}
        />
      ))}
    </Accordion>
  );
}
