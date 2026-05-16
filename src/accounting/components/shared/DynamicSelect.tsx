import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AddOptionDialog } from "../petty-cash/AddOptionDialog";
import { useMaster, addMasterItem, type MasterListKey } from "../../stores/accountingMastersStore";

interface Props {
  listKey: MasterListKey;
  value: string;
  onValueChange: (code: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
  addLabel?: string;
  /** Hide the "Add new" item (turns DynamicSelect into a read-only dropdown). */
  readOnly?: boolean;
}

const ADD = "__add__";

/**
 * Reusable extensible dropdown bound to the shared accounting masters store.
 * Every list across Accounting (currencies, payment terms, tax codes, branches,
 * categories…) is rendered via this component so users can add new options inline.
 */
export default function DynamicSelect({
  listKey, value, onValueChange, placeholder, triggerClassName, disabled, addLabel, readOnly,
}: Props) {
  const items = useMaster(listKey);
  const [open, setOpen] = useState(false);

  const handleAdd = (values: Record<string, string>) => {
    const created = addMasterItem(listKey, values.label);
    if (!created) { toast.error("Name is required"); return; }
    toast.success(`Added "${created.label}"`);
    onValueChange(created.code);
  };

  const niceLabel = addLabel ?? listKey.replace(/_/g, " ");

  return (
    <>
      <Select
        value={value}
        onValueChange={(v) => { if (v === ADD) { setOpen(true); return; } onValueChange(v); }}
        disabled={disabled}
      >
        <SelectTrigger className={cn(triggerClassName)}>
          <SelectValue placeholder={placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.code} value={i.code}>{i.label}</SelectItem>
          ))}
          {!readOnly && (
            <>
              <SelectSeparator />
              <SelectItem value={ADD} className="text-primary font-medium">
                <span className="inline-flex items-center gap-1.5"><Plus className="size-3.5" /> Add new {niceLabel}</span>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
      <AddOptionDialog
        open={open}
        onOpenChange={setOpen}
        title={`Add ${niceLabel}`}
        description="This option will be available everywhere this list is used."
        fields={[{ key: "label", label: "Name", required: true, placeholder: `e.g. ${niceLabel}` }]}
        onSubmit={handleAdd}
      />
    </>
  );
}