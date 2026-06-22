import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMasterItems } from "@/lib/masters";
import {
  createDefaultDocumentStructure,
  DEFAULT_DOCUMENT_SECTION_TEMPLATES,
  normalizeDocumentStructure,
  reorderDocumentsInSection,
  reorderSections,
  slugKey,
  type DocumentStructureDocument,
  type DocumentStructureSection,
  type ServiceDocumentStructure,
} from "@/lib/service-library/documentStructure";
import { cn } from "@/lib/utils";

type Props = {
  structure: ServiceDocumentStructure | undefined;
  onChange: (next: ServiceDocumentStructure) => void;
};

function ensureStructure(raw: ServiceDocumentStructure | undefined): ServiceDocumentStructure {
  return normalizeDocumentStructure(raw) ?? createDefaultDocumentStructure();
}

function SortableSection({
  section,
  expanded,
  onExpandedChange,
  onRename,
  onDelete,
  onToggleActive,
  onAddDocument,
  onRemoveDocument,
  onToggleDocActive,
  onToggleDocMandatory,
  onDocDragEnd,
  docTypesByCode,
  children,
}: {
  section: DocumentStructureSection;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  onAddDocument: (code: string) => void;
  onRemoveDocument: (itemKey: string) => void;
  onToggleDocActive: (itemKey: string, active: boolean) => void;
  onToggleDocMandatory: (itemKey: string, mandatory: boolean) => void;
  onDocDragEnd: (activeKey: string, overKey: string) => void;
  docTypesByCode: Map<string, string>;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.section_key,
  });
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(section.label);
  const [addCode, setAddCode] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const activeDocs = section.documents.filter((d) => d.is_active);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card",
        !section.is_active && "opacity-60",
        isDragging && "shadow-md z-10",
      )}
    >
      <div className="flex items-center gap-2 p-3 border-b bg-muted/20">
        <button
          type="button"
          className="touch-none text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag section"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <Collapsible open={expanded} onOpenChange={onExpandedChange} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-1 text-sm font-semibold">
                {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                {editing ? (
                  <Input
                    value={draftLabel}
                    className="h-7 w-48"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    onBlur={() => {
                      setEditing(false);
                      if (draftLabel.trim()) onRename(draftLabel.trim());
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                ) : (
                  <span>{section.label}</span>
                )}
              </button>
            </CollapsibleTrigger>
            <Badge variant="outline" className="text-[10px] font-mono">
              {section.section_key}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {activeDocs.length} doc{activeDocs.length === 1 ? "" : "s"}
            </Badge>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => {
                setDraftLabel(section.label);
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
            <div className="flex items-center gap-1.5 ml-auto">
              <Switch checked={section.is_active} onCheckedChange={onToggleActive} />
              <span className="text-[10px] text-muted-foreground uppercase">Active</span>
            </div>
          </div>
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Add from Document Types</Label>
                <Select value={addCode} onValueChange={setAddCode}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select document type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...docTypesByCode.entries()]
                      .sort((a, b) => a[1].localeCompare(b[1]))
                      .map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!addCode}
                onClick={() => {
                  if (addCode) {
                    onAddDocument(addCode);
                    setAddCode("");
                  }
                }}
              >
                <Plus className="size-3.5 mr-1" />
                Add document
              </Button>
            </div>
            {children}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function SortableDocumentRow({
  doc,
  label,
  onRemove,
  onToggleActive,
  onToggleMandatory,
}: {
  doc: DocumentStructureDocument;
  label: string;
  onRemove: () => void;
  onToggleActive: (active: boolean) => void;
  onToggleMandatory: (mandatory: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: doc.item_key,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-background",
        !doc.is_active && "opacity-50",
        isDragging && "shadow-md z-10",
      )}
    >
      <button
        type="button"
        className="touch-none text-muted-foreground cursor-grab active:cursor-grabbing"
        aria-label="Drag document"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{label}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{doc.master_item_code}</div>
      </div>
      <Badge variant={doc.mandatory ? "default" : "outline"} className="text-[10px] shrink-0">
        {doc.mandatory ? "Required" : "Optional"}
      </Badge>
      <Switch checked={doc.mandatory} onCheckedChange={onToggleMandatory} />
      <Switch checked={doc.is_active} onCheckedChange={onToggleActive} />
      <Button type="button" size="icon" variant="ghost" className="size-7 text-destructive" onClick={onRemove}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function SectionDocuments({
  section,
  docTypesByCode,
  onRemoveDocument,
  onToggleDocActive,
  onToggleDocMandatory,
  onDocDragEnd,
}: {
  section: DocumentStructureSection;
  docTypesByCode: Map<string, string>;
  onRemoveDocument: (itemKey: string) => void;
  onToggleDocActive: (itemKey: string, active: boolean) => void;
  onToggleDocMandatory: (itemKey: string, mandatory: boolean) => void;
  onDocDragEnd: (activeKey: string, overKey: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = section.documents.map((d) => d.item_key);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onDocDragEnd(String(active.id), String(over.id));
  };

  if (section.documents.length === 0) {
    return <p className="text-xs text-muted-foreground">No documents in this section yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {section.documents.map((doc) => (
            <SortableDocumentRow
              key={doc.item_key}
              doc={doc}
              label={doc.label ?? docTypesByCode.get(doc.master_item_code) ?? doc.master_item_code}
              onRemove={() => onRemoveDocument(doc.item_key)}
              onToggleActive={(v) => onToggleDocActive(doc.item_key, v)}
              onToggleMandatory={(v) => onToggleDocMandatory(doc.item_key, v)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function DocumentStructureEditor({ structure: raw, onChange }: Props) {
  const structure = useMemo(() => ensureStructure(raw), [raw]);
  const docTypes = useMasterItems("document_types");
  const docTypesByCode = useMemo(
    () => new Map(docTypes.filter((d) => d.is_active).map((d) => [d.code, d.label])),
    [docTypes],
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newSectionLabel, setNewSectionLabel] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const commit = (next: ServiceDocumentStructure) => {
    onChange({ ...next, updated_at: new Date().toISOString() });
  };

  const updateSection = (sectionKey: string, fn: (s: DocumentStructureSection) => DocumentStructureSection) => {
    commit({
      ...structure,
      sections: structure.sections.map((s) => (s.section_key === sectionKey ? fn(s) : s)),
    });
  };

  const onSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    commit(reorderSections(structure, String(active.id), String(over.id)));
  };

  const addCustomSection = () => {
    const label = newSectionLabel.trim();
    if (!label) return;
    const section_key = slugKey(label, structure.sections.length);
    if (structure.sections.some((s) => s.section_key === section_key)) return;
    commit({
      ...structure,
      sections: [
        ...structure.sections,
        {
          section_key,
          label,
          sort_order: (structure.sections.length + 1) * 10,
          is_active: true,
          documents: [],
        },
      ],
    });
    setNewSectionLabel("");
    setExpanded((e) => ({ ...e, [section_key]: true }));
  };

  const addTemplateSection = (section_key: string, label: string) => {
    if (structure.sections.some((s) => s.section_key === section_key)) return;
    commit({
      ...structure,
      sections: [
        ...structure.sections,
        {
          section_key,
          label,
          sort_order: (structure.sections.length + 1) * 10,
          is_active: true,
          documents: [],
        },
      ],
    });
    setExpanded((e) => ({ ...e, [section_key]: true }));
  };

  const sectionIds = structure.sections.map((s) => s.section_key);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure default document sections and requirements for this service. Documents must come from{" "}
        <strong>Masters → Document Types</strong> only. Drag sections and documents to set order — this sequence
        becomes the default in client files and future binders.
      </p>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Custom section name</Label>
          <Input
            value={newSectionLabel}
            onChange={(e) => setNewSectionLabel(e.target.value)}
            placeholder="e.g. Medical Documents"
            onKeyDown={(e) => e.key === "Enter" && addCustomSection()}
          />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addCustomSection} disabled={!newSectionLabel.trim()}>
          <Plus className="size-3.5 mr-1" />
          Add section
        </Button>
        <Select
          onValueChange={(v) => {
            const t = DEFAULT_DOCUMENT_SECTION_TEMPLATES.find((x) => x.section_key === v);
            if (t) addTemplateSection(t.section_key, t.label);
          }}
        >
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue placeholder="Add template section…" />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_DOCUMENT_SECTION_TEMPLATES.filter(
              (t) => !structure.sections.some((s) => s.section_key === t.section_key),
            ).map((t) => (
              <SelectItem key={t.section_key} value={t.section_key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => commit(createDefaultDocumentStructure())}
        >
          Reset to 9 templates
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {structure.sections.map((section) => (
              <SortableSection
                key={section.section_key}
                section={section}
                expanded={!!expanded[section.section_key]}
                onExpandedChange={(open) =>
                  setExpanded((e) => ({ ...e, [section.section_key]: open }))
                }
                onRename={(label) => updateSection(section.section_key, (s) => ({ ...s, label }))}
                onDelete={() =>
                  commit({
                    ...structure,
                    sections: structure.sections.filter((s) => s.section_key !== section.section_key),
                  })
                }
                onToggleActive={(active) => updateSection(section.section_key, (s) => ({ ...s, is_active: active }))}
                onAddDocument={(code) => {
                  if (section.documents.some((d) => d.master_item_code === code)) return;
                  const doc: DocumentStructureDocument = {
                    item_key: slugKey(code),
                    master_item_code: code,
                    label: docTypesByCode.get(code),
                    mandatory: false,
                    is_active: true,
                    sort_order: (section.documents.length + 1) * 10,
                  };
                  updateSection(section.section_key, (s) => ({
                    ...s,
                    documents: [...s.documents, doc],
                  }));
                }}
                onRemoveDocument={(itemKey) =>
                  updateSection(section.section_key, (s) => ({
                    ...s,
                    documents: s.documents.filter((d) => d.item_key !== itemKey),
                  }))
                }
                onToggleDocActive={(itemKey, active) =>
                  updateSection(section.section_key, (s) => ({
                    ...s,
                    documents: s.documents.map((d) => (d.item_key === itemKey ? { ...d, is_active: active } : d)),
                  }))
                }
                onToggleDocMandatory={(itemKey, mandatory) =>
                  updateSection(section.section_key, (s) => ({
                    ...s,
                    documents: s.documents.map((d) => (d.item_key === itemKey ? { ...d, mandatory } : d)),
                  }))
                }
                onDocDragEnd={(activeKey, overKey) =>
                  commit(reorderDocumentsInSection(structure, section.section_key, activeKey, overKey))
                }
                docTypesByCode={docTypesByCode}
              >
                <SectionDocuments
                  section={section}
                  docTypesByCode={docTypesByCode}
                  onRemoveDocument={(itemKey) =>
                    updateSection(section.section_key, (s) => ({
                      ...s,
                      documents: s.documents.filter((d) => d.item_key !== itemKey),
                    }))
                  }
                  onToggleDocActive={(itemKey, active) =>
                    updateSection(section.section_key, (s) => ({
                      ...s,
                      documents: s.documents.map((d) => (d.item_key === itemKey ? { ...d, is_active: active } : d)),
                    }))
                  }
                  onToggleDocMandatory={(itemKey, mandatory) =>
                    updateSection(section.section_key, (s) => ({
                      ...s,
                      documents: s.documents.map((d) => (d.item_key === itemKey ? { ...d, mandatory } : d)),
                    }))
                  }
                  onDocDragEnd={(activeKey, overKey) =>
                    commit(reorderDocumentsInSection(structure, section.section_key, activeKey, overKey))
                  }
                />
              </SortableSection>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
