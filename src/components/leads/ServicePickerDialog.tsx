import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ServiceCatalogueItem } from "@/lib/leads";
import { type FeeCurrency } from "@/lib/leads/serviceFeeLabel";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import type { ServiceTabConfig } from "@/components/leads/serviceTabsConfig";
import { ServicePickerListBody } from "@/components/leads/ServicePickerListBody";

export function ServicePickerDialog({
  open,
  onOpenChange,
  tab,
  title,
  items,
  catalogue,
  useGrouped,
  getSelectionKey,
  value,
  onToggle,
  disabled,
  feeCurrency,
  showFeeHeader,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: ServiceTabConfig;
  title: string;
  items: ServiceCatalogueItem[];
  catalogue: ServiceCatalogueItem[];
  useGrouped: boolean;
  getSelectionKey: (item: ServiceCatalogueItem) => keyof ServiceSelection;
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  disabled?: boolean;
  feeCurrency: FeeCurrency;
  showFeeHeader: boolean;
}) {
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [accordionResetKey, setAccordionResetKey] = useState(0);

  useEffect(() => {
    if (open) {
      setOpenNote(null);
      setAccordionResetKey((k) => k + 1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ServicePickerListBody
          items={items}
          catalogue={catalogue}
          groupedTab={tab.grouped}
          useGrouped={useGrouped}
          getSelectionKey={getSelectionKey}
          value={value}
          onToggle={onToggle}
          disabled={disabled}
          openNote={openNote}
          onOpenNote={setOpenNote}
          feeCurrency={feeCurrency}
          showFeeHeader={showFeeHeader}
          collapseOnSelect
          accordionResetKey={accordionResetKey}
        />
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
