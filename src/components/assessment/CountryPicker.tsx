import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRY_LIST, findCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
  onChange: (name: string) => void;
  placeholder?: string;
};

export function CountryPicker({ value, onChange, placeholder = "Select country…" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = findCountry(value);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return COUNTRY_LIST;
    return COUNTRY_LIST.filter(
      (c) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term),
    );
  }, [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flc-input flex items-center justify-between w-full text-left"
        >
          <span className="inline-flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span className="text-lg leading-none">{selected.flag}</span>
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <span className="text-[hsl(220_14%_45%)]">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="size-4 opacity-50 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[260px]" align="start">
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search country…"
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
        <div className="max-h-64 overflow-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No match.</div>
          ) : (
            filtered.map((c) => {
              const active = selected?.code === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.name);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted",
                    active && "bg-muted/60",
                  )}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  {active && <Check className="size-4 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}