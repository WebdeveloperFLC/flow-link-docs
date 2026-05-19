import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useMasterLabels } from "@/lib/masters";

const PRIORITY = ["India", "Canada", "United Kingdom", "Australia", "United States", "Germany", "United Arab Emirates"];

interface Props {
  value?: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function CountrySelect({ value, onChange, placeholder = "Select country", className }: Props) {
  const [open, setOpen] = useState(false);
  const countries = useMasterLabels("countries");

  const sorted = useMemo(() => {
    const set = new Set(countries);
    const priority = PRIORITY.filter((p) => set.has(p));
    const rest = countries.filter((c) => !PRIORITY.includes(c)).sort((a, b) => a.localeCompare(b));
    return { priority, rest };
  }, [countries]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}>
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[320px]" align="start">
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            {sorted.priority.length > 0 && (
              <CommandGroup heading="Suggested">
                {sorted.priority.map((c) => (
                  <CommandItem key={c} value={c} onSelect={() => { onChange(c); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                    {c}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="All countries">
              {sorted.rest.map((c) => (
                <CommandItem key={c} value={c} onSelect={() => { onChange(c); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
