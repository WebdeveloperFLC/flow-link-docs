import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { MasterItem } from "@/lib/masters";
import {
  DOCUMENT_CATEGORY_LABELS,
  formatDocumentWithCategory,
  resolveDocumentCategory,
  type DocumentCategory,
} from "@/lib/documentWorkflow/documentCategories";
import { cn } from "@/lib/utils";

type Props = {
  items: MasterItem[];
  value: string;
  onChange: (code: string) => void;
  excludeCodes?: ReadonlySet<string>;
  placeholder?: string;
  className?: string;
};

export function DocumentTypeSearchPicker({
  items,
  value,
  onChange,
  excludeCodes,
  placeholder = "Search e.g. Passport, IELTS, Marriage Certificate…",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  const activeItems = useMemo(() => items.filter((i) => i.is_active), [items]);
  const selected = activeItems.find((i) => i.code === value);

  const grouped = useMemo(() => {
    const map = new Map<DocumentCategory, MasterItem[]>();
    for (const item of activeItems) {
      const cat = resolveDocumentCategory(item);
      const list = map.get(cat) ?? [];
      list.push(item);
      map.set(cat, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => DOCUMENT_CATEGORY_LABELS[a].localeCompare(DOCUMENT_CATEGORY_LABELS[b]))
      .map(([cat, rows]) => [cat, [...rows].sort((a, b) => a.label.localeCompare(b.label))] as const);
  }, [activeItems]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal h-9", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate text-left">
            {selected ? formatDocumentWithCategory(selected) : "Select document type…"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>No document type found.</CommandEmpty>
            {grouped.map(([category, rows]) => (
              <CommandGroup key={category} heading={DOCUMENT_CATEGORY_LABELS[category]}>
                {rows.map((item) => {
                  const taken = excludeCodes?.has(item.code);
                  return (
                    <CommandItem
                      key={item.code}
                      value={`${item.label} ${item.code}`}
                      disabled={taken}
                      onSelect={() => {
                        if (taken) return;
                        onChange(item.code);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4 shrink-0",
                          value === item.code ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">
                        {formatDocumentWithCategory(item)}
                        {taken ? (
                          <span className="ml-1 text-[10px] text-muted-foreground">— Already in section</span>
                        ) : null}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
