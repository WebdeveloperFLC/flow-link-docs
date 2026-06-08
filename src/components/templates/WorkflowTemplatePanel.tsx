import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Workflow, Pencil, Copy, Trash2 } from "lucide-react";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { fetchServiceCodeMap } from "@/lib/leads";
import type { Template } from "@/pages/Templates";

type Props = {
  /** When set, only show templates matching this service (by category code). */
  libraryId?: string;
  country?: string | null;
  /** Pre-fill new template editor */
  defaultCountry?: string;
  defaultCategory?: string;
  compact?: boolean;
  title?: string;
  description?: string;
};

export function WorkflowTemplatePanel({
  libraryId,
  country,
  defaultCountry,
  defaultCategory,
  compact = false,
  title = "Document binders",
  description = "Define document checklists per country and application type. Binders follow this exact order.",
}: Props) {
  const { isAdmin } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [serviceMap, setServiceMap] = useState<Map<string, string>>(new Map());

  const load = async () => {
    let q = supabase.from("workflow_templates").select("*").order("country").order("name");
    if (libraryId) {
      const codes = country?.trim()
        ? [`${libraryId}::${country.trim()}`, libraryId]
        : [libraryId];
      q = q.in("category", codes);
    }
    const { data } = await q;
    setTemplates(((data ?? []) as unknown) as Template[]);
  };

  useEffect(() => {
    load();
    fetchServiceCodeMap().then(setServiceMap).catch(() => setServiceMap(new Map()));
  }, [libraryId, country]);

  const onDuplicate = async (t: Template) => {
    const { error } = await supabase.from("workflow_templates").insert({
      name: `${t.name} (copy)`,
      country: t.country,
      category: t.category,
      version: 1,
      items: t.items as never,
      groups: (t.groups ?? []) as never,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Duplicated");
      load();
    }
  };

  const onDelete = async (t: Template) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const { error } = await supabase.from("workflow_templates").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else {
      await logActivity("template.deleted", "template", t.id, { name: t.name });
      toast.success("Deleted");
      load();
    }
  };

  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.country] ??= []).push(t);
    return acc;
  }, {});

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
          {isAdmin && (
            <Button onClick={startNew} className="gradient-brand text-primary-foreground">
              <Plus className="size-4 mr-1.5" /> New binder
            </Button>
          )}
        </div>
      )}
      {compact && isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={startNew}>
            <Plus className="size-3.5 mr-1" /> New binder
          </Button>
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <Card className="p-8 text-center">
          <Workflow className="size-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-medium text-sm">No document binder configured</div>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdmin
              ? "Create a binder template for this service."
              : "Ask documentation team to set one up."}
          </p>
        </Card>
      )}

      {Object.entries(grouped).map(([c, list]) => (
        <div key={c}>
          {!libraryId && (
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{c}</div>
          )}
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {list.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                serviceLabel={serviceMap.get(t.category) ?? t.category}
                isAdmin={isAdmin}
                onEdit={() => {
                  setEditing(t);
                  setOpen(true);
                }}
                onDuplicate={() => onDuplicate(t)}
                onDelete={() => onDelete(t)}
              />
            ))}
          </div>
        </div>
      ))}

      <TemplateEditorDialog
        open={open}
        onOpenChange={setOpen}
        template={editing}
        onSaved={load}
        defaultCountry={editing ? undefined : defaultCountry}
        defaultCategory={editing ? undefined : defaultCategory}
      />
    </div>
  );
}

function TemplateCard({
  template: t,
  serviceLabel,
  isAdmin,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: Template;
  serviceLabel: string;
  isAdmin: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-4 shadow-elev-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{t.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {serviceLabel} · v{t.version}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-0.5 shrink-0">
            <Button size="icon" variant="ghost" className="size-7" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="size-7" onClick={onDuplicate}>
              <Copy className="size-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={onDelete}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
        {t.items.length} document{t.items.length === 1 ? "" : "s"}
        {t.groups && t.groups.length > 0
          ? ` · ${t.groups.length} section${t.groups.length === 1 ? "" : "s"}`
          : ""}
      </div>
      {t.groups && t.groups.length > 0 ? (
        <div className="mt-2 space-y-1 max-h-32 overflow-hidden">
          {t.groups.slice(0, 4).map((g) => (
            <div key={g.id} className="text-xs">
              <span className="font-semibold">{g.label}</span>
              <span className="text-muted-foreground"> · {g.item_ids.length}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 space-y-0.5 max-h-24 overflow-hidden">
          {t.items.slice(0, 4).map((it, i) => (
            <div key={it.id} className="text-xs flex gap-1.5">
              <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
              <span className="truncate">{it.name}</span>
              {it.mandatory && <span className="text-secondary text-[10px]">*</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
