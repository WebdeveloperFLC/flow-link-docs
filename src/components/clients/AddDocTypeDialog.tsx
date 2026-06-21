import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMasterItems, type MasterItem } from "@/lib/masters";
import {
  DOCUMENT_CATEGORY_LABELS,
  formatDocumentWithCategory,
  resolveDocumentCategory,
} from "@/lib/documentWorkflow/documentCategories";
import {
  detectServiceDocumentProfile,
  type ServiceDocumentProfile,
} from "@/lib/documentWorkflow/documentRelevance";
import {
  filterDocumentTypesForAdd,
  groupDocumentTypesByCategory,
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

function formatCategorySummary(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([cat, n]) => `${cat}: ${n}`)
    .join(" · ");
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
  /** Codes already on case checklist — shown as badge, not removed from picker. */
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
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const profile = useMemo(
    () => detectServiceDocumentProfile(serviceCode, templateName),
    [serviceCode, templateName],
  );

  const onChecklist = useMemo(() => new Set(excludedMasterCodes), [excludedMasterCodes]);

  const filtered = useMemo(
    () => filterDocumentTypesForAdd(masterItems, search, serviceCode, templateName),
    [masterItems, search, serviceCode, templateName],
  );

  const grouped = useMemo(
    () => groupDocumentTypesByCategory(filtered, profile),
    [filtered, profile],
  );

  const pipeline = useMemo(
    () =>
      inspectDocumentTypeFilterPipeline(
        masterItems,
        search,
        onChecklist,
        serviceCode,
        templateName,
      ),
    [masterItems, search, onChecklist, serviceCode, templateName],
  );

  useEffect(() => {
    if (!open) return;
    console.info("[AddDocTypeDialog] pipeline", pipeline);
  }, [open, pipeline]);

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
    requestAnimationFrame(() => searchInputRef.current?.focus());
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
                      : "Search e.g. Marriage Certificate, PCC, Passport…"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 size-4 shrink-0 opacity-50" />
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type to search name, category, or alias…"
                    className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div ref={listRef} className="max-h-[300px] overflow-y-auto p-1" role="listbox">
                  {filtered.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No document type found.</p>
                  ) : (
                    grouped.map(([category, items]) => (
                      <div key={category} role="group" aria-label={DOCUMENT_CATEGORY_LABELS[category]}>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          {DOCUMENT_CATEGORY_LABELS[category]} ({items.length})
                        </div>
                        {items.map((item) => {
                          const onCase = onChecklist.has(item.code);
                          return (
                            <button
                              key={item.code}
                              type="button"
                              role="option"
                              aria-selected={selected?.code === item.code}
                              className={cn(
                                "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                selected?.code === item.code && "bg-accent text-accent-foreground",
                              )}
                              onClick={() => {
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
                              <span className="flex-1 truncate text-left">
                                {formatDocumentWithCategory(item)}
                                {onCase ? (
                                  <span className="ml-1 text-[10px] text-muted-foreground">(on checklist)</span>
                                ) : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
                <p className="border-t px-2 py-1.5 text-[10px] text-muted-foreground leading-snug">
                  {pipeline.uiRendered} of {pipeline.masterActiveTotal} types
                  {pipeline.renderedGroupCount > 0
                    ? ` · ${pipeline.renderedGroupCount} groups · ${formatCategorySummary(pipeline.categoryCounts)}`
                    : ""}
                </p>
              </PopoverContent>
            </Popover>
            {selected ? (
              <p className="text-[11px] text-muted-foreground">
                Category: <strong>{DOCUMENT_CATEGORY_LABELS[resolveDocumentCategory(selected)]}</strong>
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              Full document catalogue — sorted by visa relevance. Academic types appear last for spouse cases.
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
