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
import { CustomComboServicePicker } from "@/components/leads/CustomComboServicePicker";

export function CustomComboPickerDialog({
  open,
  onOpenChange,
  byKey,
  catalogue,
  value,
  onToggle,
  visaLocked,
  interestedCountries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  byKey: Record<string, ServiceCatalogueItem[]>;
  catalogue: ServiceCatalogueItem[];
  value: ServiceSelection;
  onToggle: (key: keyof ServiceSelection, code: string) => void;
  visaLocked?: boolean;
  interestedCountries?: string[];
}) {
  const [visaCountry, setVisaCountry] = useState("ALL");
  const [feeCurrency, setFeeCurrency] = useState<FeeCurrency>("INR");
  const [accordionResetKey, setAccordionResetKey] = useState(0);

  useEffect(() => {
    if (open) {
      setAccordionResetKey((k) => k + 1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build custom combo</DialogTitle>
        </DialogHeader>
        <CustomComboServicePicker
          byKey={byKey}
          catalogue={catalogue}
          value={value}
          onToggle={onToggle}
          visaLocked={visaLocked}
          interestedCountries={interestedCountries}
          visaCountry={visaCountry}
          onVisaCountryChange={setVisaCountry}
          feeCurrency={feeCurrency}
          onFeeCurrencyChange={setFeeCurrency}
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
