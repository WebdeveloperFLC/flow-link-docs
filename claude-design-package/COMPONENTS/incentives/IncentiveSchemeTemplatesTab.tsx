import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Save, Trash2 } from "lucide-react";

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  plan_defaults: Record<string, unknown>;
  slabs: unknown[];
  rules: unknown[];
  created_at: string;
}

interface Props {
  activePlan: string;
  plans: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  onReload: () => Promise<void>;
}

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

export function IncentiveSchemeTemplatesTab({ activePlan, plans, branches, onReload }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: "", description: "" });
  const [cloneForm, setCloneForm] = useState<Record<string, { planName: string; branchId: string }>>({});

  async function loadTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("incentive_scheme_templates")
      .select("id, name, description, plan_defaults, slabs, rules, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load templates", description: error.message, variant: "destructive" });
    }
    setTemplates(
      ((data ?? []) as any[]).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        plan_defaults: (t.plan_defaults ?? {}) as Record<string, unknown>,
        slabs: (t.slabs ?? []) as unknown[],
        rules: (t.rules ?? []) as unknown[],
        created_at: t.created_at,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    loadTemplates();
    /* eslint-disable-next-line */
  }, []);

  async function saveFromPlan() {
    if (!activePlan) {
      toast({ title: "Select a plan first", variant: "destructive" });
      return;
    }
    if (!saveForm.name.trim()) {
      toast({ title: "Template name required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_save_plan_as_scheme_template", {
        _plan_id: activePlan,
        _template_name: saveForm.name.trim(),
        _description: saveForm.description.trim() || null,
      });
      if (error) throw error;
      toast({
        title: "Template saved",
        description: `${saveForm.name} — ${plans.find((p) => p.id === activePlan)?.name ?? "plan"}`,
      });
      setSaveForm({ name: "", description: "" });
      await loadTemplates();
      await onReload();
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function cloneTemplate(templateId: string) {
    const form = cloneForm[templateId] ?? { planName: "", branchId: "" };
    if (!form.planName.trim()) {
      toast({ title: "New plan name required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_clone_scheme_template_to_plan", {
        _template_id: templateId,
        _plan_name: form.planName.trim(),
        _branch_id: form.branchId || null,
      });
      if (error) throw error;
      toast({
        title: "Plan cloned from template",
        description: form.planName.trim(),
      });
      await onReload();
    } catch (e) {
      toast({
        title: "Clone failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(id: string) {
    setBusy(true);
    const { error } = await supabase
      .from("incentive_scheme_templates")
      .update({ is_active: false })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Template archived" });
    await loadTemplates();
  }

  const activePlanName = plans.find((p) => p.id === activePlan)?.name ?? "—";

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Save className="size-4" /> Save plan as template (I3)
        </h2>
        <p className="text-sm text-muted-foreground">
          Snapshot the selected plan&apos;s rules and slabs into a reusable blueprint.
          Active plan: <strong>{activePlanName}</strong>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Template name</label>
            <Input
              className="mt-1"
              value={saveForm.name}
              onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
              placeholder="Standard counselor monthly"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <Input
              className="mt-1"
              value={saveForm.description}
              onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>
        <Button onClick={saveFromPlan} disabled={busy || !activePlan}>
          <Plus className="size-4 mr-1" /> Save as template
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Scheme template library</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates yet. Save a plan above.</p>
        ) : (
          <div className="space-y-4">
            {templates.map((t) => {
              const form = cloneForm[t.id] ?? { planName: `${t.name} copy`, branchId: "" };
              return (
                <div key={t.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      {t.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.rules.length} rule(s) · {t.slabs.length} slab(s) ·{" "}
                        {String(t.plan_defaults?.settlement_currency ?? "INR")} ·{" "}
                        {String(t.plan_defaults?.period_type ?? "monthly")}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)} disabled={busy}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">New plan name</label>
                      <Input
                        className="mt-1"
                        value={form.planName}
                        onChange={(e) =>
                          setCloneForm({
                            ...cloneForm,
                            [t.id]: { ...form, planName: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Branch (optional)</label>
                      <select
                        className={sel}
                        value={form.branchId}
                        onChange={(e) =>
                          setCloneForm({
                            ...cloneForm,
                            [t.id]: { ...form, branchId: e.target.value },
                          })
                        }
                      >
                        <option value="">From template</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => cloneTemplate(t.id)} disabled={busy}>
                    <Copy className="size-4 mr-1" /> Clone to new plan
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
