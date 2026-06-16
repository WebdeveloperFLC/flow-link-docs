import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMasterItems } from "@/lib/masters";

type Props = {
  value?: string | null;
  onValueChange: (code: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  className?: string;
};

/** Currency dropdown backed by CRM Masters → Currency Master (single source). */
export function MasterCurrencySelect({
  value,
  onValueChange,
  placeholder = "Currency",
  allowNone,
  className,
}: Props) {
  const currencies = useMasterItems("currencies");
  const active = currencies.filter((c) => c.is_active);

  return (
    <Select value={value ?? (allowNone ? "__none" : "INR")} onValueChange={(v) => onValueChange(v === "__none" ? "" : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__none">None</SelectItem>}
        {active.map((c) => (
          <SelectItem key={c.code} value={c.code.toUpperCase()}>
            {c.code} — {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
