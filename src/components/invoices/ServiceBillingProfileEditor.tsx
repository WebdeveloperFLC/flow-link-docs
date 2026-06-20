import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BILLING_TRIGGER_OPTIONS, billingTriggerLabel, type BillingTrigger } from "@/lib/serviceBilling";

interface Props {
  currency: string;
  requestedAmount: string;
  institutionRequiredDeposit: string;
  billingTrigger: BillingTrigger | "" | null;
  institutionDepositReference: string;
  canEdit: boolean;
  onRequestedChange: (v: string) => void;
  onInstitutionDepositChange: (v: string) => void;
  onTriggerChange: (v: BillingTrigger | "") => void;
  onReferenceChange: (v: string) => void;
}

export default function ServiceBillingProfileEditor({
  currency,
  requestedAmount,
  institutionRequiredDeposit,
  billingTrigger,
  institutionDepositReference,
  canEdit,
  onRequestedChange,
  onInstitutionDepositChange,
  onTriggerChange,
  onReferenceChange,
}: Props) {
  return (
    <div className="rounded-md border px-3 py-2 space-y-2">
      <div className="text-xs font-medium">Service billing profile ({currency})</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Requested amount</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            disabled={!canEdit}
            value={requestedAmount}
            onChange={(e) => onRequestedChange(e.target.value)}
            className="h-8 text-right tabular-nums"
          />
        </div>
        <div>
          <Label className="text-xs">Institution required deposit</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            disabled={!canEdit}
            value={institutionRequiredDeposit}
            onChange={(e) => onInstitutionDepositChange(e.target.value)}
            className="h-8 text-right tabular-nums"
          />
        </div>
        <div>
          <Label className="text-xs">Billing trigger</Label>
          <Select
            value={billingTrigger || ""}
            disabled={!canEdit}
            onValueChange={(v) => onTriggerChange(v as BillingTrigger)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select trigger">
                {billingTrigger ? billingTriggerLabel(billingTrigger) : "Select trigger"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BILLING_TRIGGER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Institution deposit reference</Label>
          <Input
            disabled={!canEdit}
            value={institutionDepositReference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder="Offer / seat / deposit ref"
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
