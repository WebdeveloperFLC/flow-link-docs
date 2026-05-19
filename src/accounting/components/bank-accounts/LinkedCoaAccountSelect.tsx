import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "../../stores/coaStore";
import { useTypes } from "../../stores/coaMasterStore";

interface Props {
  value: string;
  onChange: (id: string) => void;
  currency?: string;
  entityId?: string;
  disabled?: boolean;
}

export default function LinkedCoaAccountSelect({ value, onChange, currency, entityId, disabled }: Props) {
  const accounts = useAccounts();
  const types = useTypes();

  const eligible = useMemo(() => {
    const bankishTypes = new Set(
      types
        .filter((t) => /BANK|CASH/i.test(t.code) || /BANK|CASH/i.test(t.label))
        .map((t) => t.code),
    );
    return accounts
      .filter((a) => a.status === "ACTIVE" && bankishTypes.has(a.typeCode))
      .filter((a) => a.isPostable !== false)
      .filter((a) => a.groupCode === "ASSET")
      .filter((a) => !currency || a.currency === currency)
      .filter((a) => !entityId || a.entityId === entityId || a.entityId === null)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, types, currency, entityId]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={eligible.length ? "Select linked ledger" : "No bank/cash ledgers available"} />
      </SelectTrigger>
      <SelectContent>
        {eligible.length === 0 && (
          <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
            Create a Bank or Cash account in Chart of Accounts first.
          </div>
        )}
        {eligible.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.code} · {a.name} <span className="text-muted-foreground">({a.currency})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}