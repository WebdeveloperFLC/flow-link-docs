import { ReactNode, useState } from "react";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Option { value: string; label: string; disabled?: boolean }

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  canAdd?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  prefixItems?: ReactNode;
  invalid?: boolean;
}

const ADD_SENTINEL = "__petty_add__";

export function ExtensibleSelect({
  value, onValueChange, options, placeholder, triggerClassName, canAdd, addLabel = "Add new…", onAdd, prefixItems, invalid,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Select
      value={value}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(v) => {
        if (v === ADD_SENTINEL) {
          setOpen(false);
          onAdd?.();
          return;
        }
        onValueChange(v);
      }}
    >
      <SelectTrigger className={cn(triggerClassName, invalid && "border-destructive")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {prefixItems}
        {options.filter(o => !o.disabled).map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
        {canAdd && onAdd && (
          <SelectItem value={ADD_SENTINEL} className="text-primary font-medium">
            <span className="inline-flex items-center gap-1.5"><Plus className="size-3.5" /> {addLabel}</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}