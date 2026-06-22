import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMasterItems, type MasterItem } from "@/lib/masters";
import {
  DOCUMENT_CATEGORY_LABELS,
  formatDocumentWithCategory,
  resolveDocumentCategory,
} from "@/lib/documentWorkflow/documentCategories";
import type { ChecklistRequirementRef } from "@/lib/documentWorkflow/documentFamily";
import {
  buildAddDocumentPickerItems,
  groupPickerItemsByCategory,
  inspectDocumentTypeFilterPipeline,
  type AddDocumentPickerItem,
} from "@/lib/documentWorkflow/documentTypeFilterPipeline";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchServiceDocumentStructure } from "@/lib/service-library/fetchServiceDocumentStructure";
import { DEFAULT_DOCUMENT_SECTION_TEMPLATES } from "@/lib/service-library/documentStructure";
import {
  MANUAL_ADD_SECTION_KEY,
  MANUAL_ADD_SECTION_LABEL,
} from "@/lib/documentWorkflow/addCaseDocumentRequirement";

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
  sectionKey?: string;
  sectionLabel?: string;
  saveToTemplate?: boolean;
}

function formatCategorySummary(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([cat, n]) => `${cat}: ${n}`)
    .join(" · ");
}

export const AddDocTypeDialog = ({
  open,
  onOpenChange,
  checklistRequirements,
  serviceCode,
  templateName,
  libraryId,
  country,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Case ADR rows — used for document-family duplicate detection. */
  checklistRequirements: ChecklistRequirementRef[];
  serviceCode?: string | null;
  templateName?: string | null;
  libraryId?: string | null;
  country?: string | null;
  onAdd: (item: AddDocumentRequirementInput) => Promise<void> | void;
}) => {
  const masterItems = useMasterItems("document_types");
  const [selected, setSelected] = useState<MasterItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [sectionKey, setSectionKey] = useState(MANUAL_ADD_SECTION_KEY);
  const [saveToTemplate, setSaveToTemplate] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const structureQuery = useQuery({
    queryKey: ["service-doc-structure", libraryId, country],
    enabled: open && !!libraryId,
    queryFn: () => fetchServiceDocumentStructure(libraryId!, country),
  });

  const sectionOptions = useMemo(() => {
    const fromStructure =
      structureQuery.data?.sections
        .filter((s) => s.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({ key: s.section_key, label: s.label })) ?? [];
    if (fromStructure.length > 0) return fromStructure;
    return DEFAULT_DOCUMENT_SECTION_TEMPLATES.map((s) => ({ key: s.section_key, label: s.label }));
  }, [structureQuery.data]);

  const sectionLabel = useMemo(
    () => sectionOptions.find((s) => s.key === sectionKey)?.label ?? MANUAL_ADD_SECTION_LABEL,
    [sectionKey, sectionOptions],
  );

  const pickerRows = useMemo(
    () => buildAddDocumentPickerItems(masterItems, search, checklistRequirements, serviceCode, templateName),
    [masterItems, search, checklistRequirements, serviceCode, templateName],
  );

  const grouped = useMemo(() => groupPickerItemsByCategory(pickerRows), [pickerRows]);

  const selectableRows = useMemo(
    () => pickerRows.filter((r) => !r.duplicateFamily),
    [pickerRows],
  );

  const pipeline = useMemo(
    () =>
      inspectDocumentTypeFilterPipeline(
        masterItems,
        search,
        checklistRequirements,
        serviceCode,
        templateName,
      ),
    [masterItems, search, checklistRequirements, serviceCode, templateName],
  );

  useEffect(() => {
    if (!open) return;
    console.info("[AddDocTypeDialog] pipeline", pipeline);
  }, [open, pipeline]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search, pickerOpen, pickerRows.length]);

  const reset = () => {
    setSelected(null);
    setMandatory(false);
    setNotes("");
    setSearch("");
    setPickerOpen(false);
    setHighlightIndex(0);
    setSectionKey(MANUAL_ADD_SECTION_KEY);
    setSaveToTemplate(false);
  };

  useEffect(() => {
    if (open) {
      setSelected(null);
      setSearch("");
      setMandatory(false);
      setSectionKey(MANUAL_ADD_SECTION_KEY);
      setSaveToTemplate(false);
    } else {
      reset();
    }
  }, [open]);

  useEffect(() => {
    if (!pickerOpen) return;
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [pickerOpen]);

  const selectRow = useCallback((row: AddDocumentPickerItem) => {
    if (row.duplicateFamily) return;
    setSelected(row.item);
    setPickerOpen(false);
  }, []);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!selectableRows.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, selectableRows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = selectableRows[highlightIndex];
      if (row) selectRow(row);
    }
  };

  const submit = async () => {
    if (!selected) return;
    const blocked = pickerRows.find((r) => r.item.code === selected.code && r.duplicateFamily);
    if (blocked) return;
    setBusy(true);
    try {
      await onAdd({
        masterItemCode: selected.code,
        label: selected.label,
        mandatory,
        notes: notes.trim() || undefined,
        sectionKey,
        sectionLabel,
        saveToTemplate: saveToTemplate && !!libraryId,
      });
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  let selectableCursor = -1;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a document requirement</DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Pick from the <strong>document_types</strong> catalogue only. Choose a section for this requirement.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Document name</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen} modal>
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
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 size-4 shrink-0 opacity-50" />
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Type to search name, category, or alias…"
                    className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                    aria-controls="add-doc-type-list"
                    aria-activedescendant={
                      selectableRows[highlightIndex]
                        ? `add-doc-opt-${selectableRows[highlightIndex].item.code}`
                        : undefined
                    }
                  />
                </div>
                <ScrollArea
                  className="h-[300px]"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div id="add-doc-type-list" className="p-1" role="listbox">
                    {pickerRows.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No document type found.</p>
                    ) : (
                      grouped.map(([category, rows]) => (
                        <div key={category} role="group" aria-label={DOCUMENT_CATEGORY_LABELS[category]}>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            {DOCUMENT_CATEGORY_LABELS[category]} ({rows.length})
                          </div>
                          {rows.map((row) => {
                            const isSelectable = !row.duplicateFamily;
                            const rowIndex = isSelectable ? ++selectableCursor : -1;
                            const highlighted = isSelectable && rowIndex === highlightIndex;
                            return (
                              <button
                                key={row.item.code}
                                id={isSelectable ? `add-doc-opt-${row.item.code}` : undefined}
                                type="button"
                                role="option"
                                aria-selected={selected?.code === row.item.code}
                                aria-disabled={row.duplicateFamily}
                                disabled={row.duplicateFamily}
                                className={cn(
                                  "relative flex w-full select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-left",
                                  row.duplicateFamily
                                    ? "cursor-not-allowed opacity-50"
                                    : "cursor-default hover:bg-accent hover:text-accent-foreground",
                                  highlighted && "bg-accent text-accent-foreground",
                                  selected?.code === row.item.code && "bg-accent text-accent-foreground",
                                )}
                                onMouseEnter={() => {
                                  if (isSelectable && rowIndex >= 0) setHighlightIndex(rowIndex);
                                }}
                                onClick={() => selectRow(row)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 size-4 shrink-0",
                                    selected?.code === row.item.code ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <span className="flex-1 truncate">
                                  {formatDocumentWithCategory(row.item)}
                                  {row.duplicateFamily ? (
                                    <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                                      — Already on checklist
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <p className="border-t px-2 py-1.5 text-[10px] text-muted-foreground leading-snug">
                  {pipeline.selectableRendered} selectable · {pipeline.uiRendered} shown ·{" "}
                  {pipeline.masterActiveTotal} active · {pipeline.occupiedFamilyCount} families on checklist
                  {pipeline.renderedGroupCount > 0
                    ? ` · ${formatCategorySummary(pipeline.categoryCounts)}`
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
              Sorted alphabetically by category. Duplicate document families already on the checklist are hidden
              (shown disabled when searching).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={sectionKey} onValueChange={setSectionKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectionOptions.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
                {!sectionOptions.some((s) => s.key === MANUAL_ADD_SECTION_KEY) ? (
                  <SelectItem value={MANUAL_ADD_SECTION_KEY}>{MANUAL_ADD_SECTION_LABEL}</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
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
          {libraryId ? (
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="text-sm font-medium">Save to Service Library template</div>
                <div className="text-[11px] text-muted-foreground">
                  Also add to this service&apos;s Document Structure so future cases inherit it.
                </div>
              </div>
              <Switch checked={saveToTemplate} onCheckedChange={setSaveToTemplate} />
            </label>
          ) : null}
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
