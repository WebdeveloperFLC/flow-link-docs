import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  HAS_BUDGET_OPTIONS,
  SPONSOR_OPTIONS,
  START_TIMELINE_OPTIONS,
  type LeadJourneyFields,
} from "@/lib/leadJourney";
import { useMasterItems } from "@/lib/masters";
import {
  budgetCurrencyOptions,
  buildBudgetEquivalents,
  fetchFxSnapshot,
  formatBudgetRange,
} from "@/lib/currencyMaster";

type Props = {
  value: LeadJourneyFields;
  interestedCountries: string[];
  onChange: (patch: Partial<LeadJourneyFields>) => void;
  onBlur?: () => void;
  compact?: boolean;
};

export function LeadJourneyFieldsBlock({
  value,
  interestedCountries,
  onChange,
  onBlur,
  compact,
}: Props) {
  const currencies = useMasterItems("currencies" as never);
  const [fxSnap, setFxSnap] = useState<Record<string, number>>({ INR: 1 });

  useEffect(() => {
    fetchFxSnapshot().then(setFxSnap);
  }, []);

  const currencyOptions = useMemo(
    () => budgetCurrencyOptions(interestedCountries, currencies),
    [interestedCountries, currencies],
  );

  const showBudgetDetails = value.has_budget === "yes";
  const budgetCurrency = value.budget_currency || "INR";

  const equivalents = useMemo(() => {
    if (!showBudgetDetails) return [];
    return buildBudgetEquivalents(
      interestedCountries,
      currencies,
      budgetCurrency,
      value.budget_min ?? null,
      value.budget_max ?? null,
      fxSnap,
    );
  }, [
    showBudgetDetails,
    interestedCountries,
    currencies,
    budgetCurrency,
    value.budget_min,
    value.budget_max,
    fxSnap,
  ]);

  const set = (patch: Partial<LeadJourneyFields>) => {
    onChange(patch);
    onBlur?.();
  };

  return (
    <div className={`space-y-4 ${compact ? "" : "pt-1"}`}>
      <div className={`grid grid-cols-1 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-4`}>
        <div className="space-y-1.5">
          <Label>Who is Sponsoring You?</Label>
          <Select
            value={value.sponsor ?? ""}
            onValueChange={(v) => set({ sponsor: v, sponsor_other: v === "other" ? value.sponsor_other : null })}
          >
            <SelectTrigger aria-label="Who is sponsoring you">
              <SelectValue placeholder="Select sponsor" />
            </SelectTrigger>
            <SelectContent>
              {SPONSOR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {value.sponsor === "other" && (
          <div className="space-y-1.5">
            <Label>Specify Sponsor</Label>
            <Input
              value={value.sponsor_other ?? ""}
              onChange={(e) => onChange({ sponsor_other: e.target.value })}
              onBlur={onBlur}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>How soon you wish to register?</Label>
          <Select value={value.start_timeline ?? ""} onValueChange={(v) => set({ start_timeline: v })}>
            <SelectTrigger aria-label="How soon you wish to register">
              <SelectValue placeholder="Select timeline" />
            </SelectTrigger>
            <SelectContent>
              {START_TIMELINE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Do You Have a Budget?</Label>
          <Select
            value={value.has_budget ?? ""}
            onValueChange={(v) =>
              set({
                has_budget: v,
                budget_currency: v === "yes" ? value.budget_currency || "INR" : null,
                budget_min: v === "yes" ? value.budget_min : null,
                budget_max: v === "yes" ? value.budget_max : null,
              })
            }
          >
            <SelectTrigger aria-label="Do you have a budget">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {HAS_BUDGET_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showBudgetDetails && (
        <div className="space-y-3 border rounded-md p-3 bg-muted/20">
          <div className={`grid grid-cols-1 ${compact ? "md:grid-cols-3" : "md:grid-cols-3 lg:grid-cols-4"} gap-3`}>
            <div className="space-y-1.5">
              <Label>Budget Currency</Label>
              <Select
                value={budgetCurrency}
                onValueChange={(v) => set({ budget_currency: v })}
              >
                <SelectTrigger aria-label="Budget currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((c) => (
                    <SelectItem key={c.code} value={c.code.toUpperCase()}>
                      {c.code} — {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Min Budget</Label>
              <Input
                type="number"
                min={0}
                value={value.budget_min ?? ""}
                onChange={(e) =>
                  onChange({ budget_min: e.target.value ? Number(e.target.value) : null })
                }
                onBlur={onBlur}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Budget</Label>
              <Input
                type="number"
                min={0}
                value={value.budget_max ?? ""}
                onChange={(e) =>
                  onChange({ budget_max: e.target.value ? Number(e.target.value) : null })
                }
                onBlur={onBlur}
              />
            </div>
          </div>
          {equivalents.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Equivalent budget by country (auto-converted)</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-1.5 pr-3 font-medium">Country</th>
                      <th className="text-left py-1.5 pr-3 font-medium">Currency</th>
                      <th className="text-left py-1.5 font-medium">Equivalent range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equivalents.map((row) => (
                      <tr key={row.currency} className="border-b border-border/50">
                        <td className="py-1.5 pr-3">{row.country}</td>
                        <td className="py-1.5 pr-3 font-mono">{row.currency}</td>
                        <td className="py-1.5">{formatBudgetRange(row.min, row.max, row.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
