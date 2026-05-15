import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

/** Free-text combobox: type to filter, Enter or "Add" creates a new value not in the list. */
export default function FreeCombobox({ value, onChange, options, placeholder = "Select or type…", emptyText = "Type to add new", className, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const showAdd = trimmed.length > 0 && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}>
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="size-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Type to search or add…" value={query} onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showAdd) {
                e.preventDefault();
                onChange(trimmed); setOpen(false); setQuery("");
              }
            }} />
          <CommandList>
            <CommandEmpty>
              {showAdd ? (
                <button type="button" className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-accent text-left"
                  onClick={() => { onChange(trimmed); setOpen(false); setQuery(""); }}>
                  <Plus className="size-3.5" /> Add "{trimmed}"
                </button>
              ) : (<span className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</span>)}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem key={opt} value={opt}
                  onSelect={() => { onChange(opt); setOpen(false); setQuery(""); }}>
                  <Check className={cn("mr-2 size-4", value === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
              {showAdd && (
                <CommandItem value={`__add__${trimmed}`} onSelect={() => { onChange(trimmed); setOpen(false); setQuery(""); }}>
                  <Plus className="mr-2 size-4" /> Add "{trimmed}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
