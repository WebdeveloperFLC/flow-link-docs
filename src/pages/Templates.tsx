import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Workflow, Pencil, Copy, Trash2 } from "lucide-react";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

export interface TemplateItem { id: string; name: string; mandatory: boolean; notes?: string; }
export interface TemplateGroup {
  id: string;
  section_key: string;
  label: string;
  sort_order: number;
  item_ids: string[];
}
export interface Template {
  id: string; name: string; country: string; category: string; version: number;
  items: TemplateItem[]; created_at: string;
  groups?: TemplateGroup[] | null;
}

const Templates = () => {
  const { isAdmin } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("workflow_templates").select("*").order("country").order("name");
    setTemplates(((data ?? []) as unknown) as Template[]);
  };
  useEffect(() => { load(); }, []);

  const onDuplicate = async (t: Template) => {
    const { error } = await supabase.from("workflow_templates").insert({
      name: `${t.name} (copy)`, country: t.country, category: t.category, version: 1,
      items: t.items as never,
      groups: (t.groups ?? []) as never,
    });
    if (error) toast.error(error.message);
    else { toast.success("Duplicated"); load(); }
  };

  const onDelete = async (t: Template) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const { error } = await supabase.from("workflow_templates").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else { await logActivity("template.deleted","template", t.id, { name: t.name }); toast.success("Deleted"); load(); }
  };

  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.country] ??= []).push(t); return acc;
  }, {});

  return (
    <AppLayout>
      <PageHeader
        title="Workflow templates"
        description="Define document checklists per country and application type. Binders follow this exact order."
        actions={isAdmin && (
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-primary-foreground">
            <Plus className="size-4 mr-1.5" /> New template
          </Button>
        )}
      />
      <div className="p-8 space-y-6">
        {Object.keys(grouped).length === 0 && (
          <Card className="p-12 text-center">
            <Workflow className="size-10 mx-auto text-muted-foreground mb-3" />
            <div className="font-medium">No templates yet</div>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Create your first checklist to standardize submissions." : "Ask an admin to set up a template."}
            </p>
          </Card>
        )}
        {Object.entries(grouped).map(([country, list]) => (
          <div key={country}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{country}</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((t) => (
                <Card key={t.id} className="p-5 shadow-elev-sm hover:shadow-elev-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.category} · v{t.version}</div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 -mr-2">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditing(t); setOpen(true); }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => onDuplicate(t)}>
                          <Copy className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onDelete(t)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground mb-1.5">
                      {t.items.length} document{t.items.length === 1 ? "" : "s"}
                      {t.groups && t.groups.length > 0 ? ` · ${t.groups.length} section${t.groups.length === 1 ? "" : "s"}` : ""}
                    </div>
                    {t.groups && t.groups.length > 0 ? (
                      <div className="space-y-1 max-h-40 overflow-hidden">
                        {t.groups.slice(0, 4).map((g) => (
                          <div key={g.id} className="text-xs">
                            <span className="font-semibold">{g.label}</span>
                            <span className="text-muted-foreground"> · {g.item_ids.length}</span>
                          </div>
                        ))}
                        {t.groups.length > 4 && (
                          <div className="text-xs text-muted-foreground">+{t.groups.length - 4} more section{t.groups.length - 4 === 1 ? "" : "s"}…</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-0.5 max-h-32 overflow-hidden">
                        {t.items.slice(0, 5).map((it, i) => (
                          <div key={it.id} className="text-xs flex gap-1.5">
                            <span className="text-muted-foreground tabular-nums">{i+1}.</span>
                            <span className="truncate">{it.name}</span>
                            {it.mandatory && <span className="text-secondary text-[10px]">*</span>}
                          </div>
                        ))}
                        {t.items.length > 5 && <div className="text-xs text-muted-foreground">+{t.items.length - 5} more…</div>}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      <TemplateEditorDialog open={open} onOpenChange={setOpen} template={editing} onSaved={load} />
    </AppLayout>
  );
};

export default Templates;