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
import {
  DOCUMENT_CATEGORY_LABELS,
  formatDocumentWithCategory,
  resolveDocumentCategory,
  type DocumentCategory,
} from "@/lib/documentWorkflow/documentCategories";
import {
  categoryRank,
  detectServiceDocumentProfile,
  type ServiceDocumentProfile,
} from "@/lib/documentWorkflow/documentRelevance";
import {
  filterDocumentTypesForAdd,
  inspectDocumentTypeFilterPipeline,
} from "@/lib/documentWorkflow/documentTypeFilterPipeline";
import { cn } from "@/lib/utils";

const PROFILE_LABELS: Record<ServiceDocumentProfile, string> = {
  spouse_dependent: "Spouse / Dependent visa",
  student: "Student visa",
  visitor: "Visitor visa",
  work: "Work permit",
  general: "General (no visa profile detected)",
};

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
  serviceCode,
  templateName,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  excludedMasterCodes: string[];
  serviceCode?: string | null;
  templateName?: string | null;
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

  const profile = useMemo(
    () => detectServiceDocumentProfile(serviceCode, templateName),
    [serviceCode, templateName],
  );

  const excluded = useMemo(() => new Set(excludedMasterCodes), [excludedMasterCodes]);

  const filtered = useMemo(
    () => filterDocumentTypesForAdd(masterItems, search, excluded, serviceCode, templateName),
    [masterItems, search, excluded, serviceCode, templateName],
  );

  useEffect(() => {
    if (!open || !import.meta.env.DEV) return;
    const counts = inspectDocumentTypeFilterPipeline(
      masterItems,
      search,
      excluded,
      serviceCode,
      templateName,
    );
    console.debug("[AddDocTypeDialog] document type pipeline", counts);
  }, [open, masterItems, search, excluded, serviceCode, templateName]);

  const grouped = useMemo(() => {
    const map = new Map<DocumentCategory, MasterItem[]>();
    for (const item of filtered) {
      const cat = resolveDocumentCategory(item);
      const list = map.get(cat) ?? [];
      list.push(item);
      map.set(cat, list);
    }
    return Array.from(map.entries()).sort(
      (a, b) => categoryRank(profile, a[0]) - categoryRank(profile, b[0]),
    );
  }, [filtered, profile]);

  const reset = () => {
    setSelected(null);
    setMandatory(false);
    setNotes("");
    setSearch("");
    setPickerOpen(false);
  };

  useEffect(() => {
    if (open) {
      setSelected(null);
      setSearch("");
      setMandatory(false);
    } else {
      reset();
    }
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
          <p className="text-[11px] text-muted-foreground">
            Relevance: <strong>{PROFILE_LABELS[profile]}</strong>
            {profile === "general" && templateName ? (
              <span> — pass service/template context for ranked results</span>
            ) : null}
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Document name</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="w-full justify-between font-normal h-auto min-h-9 py-2"
                >
                  <span className="truncate text-left">
                    {selected
                      ? formatDocumentWithCategory(selected)
                      : "Search e.g. Marriage Certificate, PCC, Wedding Photos…"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command ref={commandRef} shouldFilter={false} value={search} onValueChange={setSearch}>
                  <CommandInput placeholder="Type to search name, category, or alias…" />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No document type found.</CommandEmpty>
                    {grouped.map(([category, items]) => (
                      <CommandGroup
                        key={category}
                        heading={DOCUMENT_CATEGORY_LABELS[category]}
                      >
                        {items.map((item) => (
                          <CommandItem
                            key={item.code}
                            value={`${item.label} ${item.code} ${DOCUMENT_CATEGORY_LABELS[category]}`}
                            onSelect={() => {
                              setSelected(item);
                              setPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4 shrink-0",
                                selected?.code === item.code ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="flex-1 truncate">{formatDocumentWithCategory(item)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selected ? (
              <p className="text-[11px] text-muted-foreground">
                Category: <strong>{DOCUMENT_CATEGORY_LABELS[resolveDocumentCategory(selected)]}</strong>
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              Sorted by relevance for this visa type. Types already on this case checklist are hidden.
              Manual adds go to <strong>Other Documents</strong>.
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
          <label className="flex items-center justify-between rounded border p-3 border-dashed">
            <div>
              <div className="text-sm font-medium">Mandatory document</div>
              <div className="text-[11px] text-muted-foreground">
                Default is <strong>optional</strong>. Turn on only when this document must block progress.
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
            {busy ? "Adding…" : mandatory ? "Add as mandatory" : "Add as optional"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
