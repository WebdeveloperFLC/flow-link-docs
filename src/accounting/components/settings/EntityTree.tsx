import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsEntity, COUNTRY_FLAG } from "../../types/settings";

interface Props {
  entities: SettingsEntity[];
  onEdit: (e: SettingsEntity) => void;
  onDelete: (e: SettingsEntity) => void;
}

export default function EntityTree({ entities, onEdit, onDelete }: Props) {
  const roots = entities.filter((e) => !e.parentId);
  return (
    <div className="space-y-1">
      {roots.map((r) => <Node key={r.id} entity={r} all={entities} depth={0} onEdit={onEdit} onDelete={onDelete} />)}
    </div>
  );
}

function Node({ entity, all, depth, onEdit, onDelete }: { entity: SettingsEntity; all: SettingsEntity[]; depth: number; onEdit: (e: SettingsEntity) => void; onDelete: (e: SettingsEntity) => void; }) {
  const [open, setOpen] = useState(true);
  const children = all.filter((e) => e.parentId === entity.id);
  const hasChildren = children.length > 0;
  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-accent/40 group" style={{ paddingLeft: 8 + depth * 20 }}>
        <button onClick={() => setOpen((o) => !o)} className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label={open ? "Collapse" : "Expand"} disabled={!hasChildren}>
          {hasChildren ? (open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />) : <span className="size-4" />}
        </button>
        <Building2 className="size-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-foreground flex items-center gap-2">
            <span>{COUNTRY_FLAG[entity.country] ?? "🏳️"}</span>
            <span className="truncate">{entity.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{entity.type.replace(/_/g, " ")}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>{entity.currency}</span>
            <span>FY starts {entity.fiscalYearStart}</span>
            {entity.taxIds.map((t, i) => (<span key={i}><span className="font-medium">{t.label}:</span> <span className="font-mono">{t.value}</span></span>))}
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(entity)} aria-label="Edit"><Pencil className="size-3.5" /></Button>
          <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => onDelete(entity)} aria-label="Delete"><Trash2 className="size-3.5" /></Button>
        </div>
      </div>
      {open && hasChildren && (
        <div className="border-l border-border ml-[18px]">
          {children.map((c) => <Node key={c.id} entity={c} all={all} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}