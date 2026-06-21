import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMasterItems, type MasterItem } from "@/lib/masters";
import { filterDocumentTypesForSearch } from "@/lib/documentWorkflow/searchDocumentTypes";
import { cn } from "@/lib/utils";

/** @deprecated Legacy extra_items shape — kept for ClientDetail compat reads. */
export interface ExtraItem {
  id: string;
  name: string;
  mandatory: boolean;
  notes?: string;
}

export interface AddDocumentRequirementInput {
  masterItemCode: string;
  label: string;
  mandatory: boolean;
  notes?: string;
}

export const AddDocTypeDialog = ({
  open,
  onOpenChange,
  excludedMasterCodes,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** master_item_code values already on the case checklist. */
  excludedMasterCodes: string[];
  onAdd: (item: AddDocumentRequirementInput) => Promise<void> | void;
}) => {
  const masterItems = useMasterItems("document_types");
  const [selected, setSelected] = useState<MasterItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);

  const excluded = useMemo(() => new Set(excludedMasterCodes), [excludedMasterCodes]);

  const filtered = useMemo(
    () => filterDocumentTypesForSearch(masterItems, search, excluded),
    [masterItems, search, excluded],
  );

  const reset = () => {
    setSelected(null);
    setMandatory(false);
    setNotes("");
    setSearch("");
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  useEffect(() => {
    if (!pickerOpen) return;
    requestAnimationFrame(() => {
      commandRef.current?.querySelector<HTMLInputElement>("[cmdk-input]")?.focus();
    });
  }, [pickerOpen]);

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await onAdd({
        masterItemCode: selected.code,
        label: selected.label,
        mandatory,
        notes: notes.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a document requirement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selected ? selected.label : "Search e.g. Wedding Photos, PCC, Marriage Certificate…"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command
                  ref={commandRef}
                  shouldFilter={false}
                  value={search}
                  onValueChange={setSearch}
                >
                  <CommandInput placeholder="Type to search document name or alias…" />
                  <CommandList className="max-h-[280px]">
                    <CommandEmpty>No document type found.</CommandEmpty>
                    <CommandGroup>
                      {filtered.slice(0, 50).map((item) => (
                        <CommandItem
                          key={item.code}
                          value={`${item.label} ${item.code}`}
                          onSelect={() => {
                            setSelected(item);
                            setPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              selected?.code === item.code ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">
              Search by name, alias, or partial match. Already on this checklist are hidden.
              Manual adds default to <strong>Other Documents</strong>.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. certified translation required"
            />
          </div>
          <label className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="text-sm font-medium">Required for this client</div>
              <div className="text-[11px] text-muted-foreground">
                Off = optional — does not affect required/missing progress counts.
              </div>
            </div>
            <Switch checked={mandatory} onCheckedChange={setMandatory} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={!selected || busy}
            className="gradient-brand text-primary-foreground"
          >
            {busy ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
