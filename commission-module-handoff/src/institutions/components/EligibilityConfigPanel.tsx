import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Send } from "lucide-react";
import type { EligibilityTriggerType } from "../lib/commissionEligibilityEvaluator";

interface EligibilityConfig {
  id: string;
  config_name: string;
  version_number: number;
  trigger_type: EligibilityTriggerType;
  effective_from: string | null;
  effective_to: string | null;
  status: string;
  partnership_route_id: string | null;
  notes: string | null;
}

const TRIGGERS: { value: EligibilityTriggerType; label: string }[] = [
  { value: "deposit", label: "Deposit paid" },
  { value: "visa", label: "Visa / study permit approved" },
  { value: "enrolled", label: "Enrollment confirmed" },
  { value: "registered", label: "Credits registered" },
  { value: "started_classes", label: "Classes started" },
  { value: "custom", label: "Custom (Phase 2)" },
];

export function EligibilityConfigPanel({ institutionId }: { institutionId: string }) {
  const [configs, setConfigs] = useState<EligibilityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<EligibilityConfig> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("upi_commission_eligibility_configs" as any)
      .select("*")
      .eq("institution_id", institutionId)
      .order("version_number", { ascending: false });
    if (error) toast.error(error.message);
    else setConfigs((data ?? []) as EligibilityConfig[]);
    setLoading(false);
  }, [institutionId]);

  useEffect(() => { load(); }, [load]);

  const saveDraft = async () => {
    if (!form?.config_name?.trim()) return toast.error("Config name is required");
    setSaving(true);
    const nextVersion = Math.max(0, ...configs.map((c) => c.version_number)) + 1;
    const payload = {
      institution_id: institutionId,
      config_name: form.config_name.trim(),
      version_number: form.id ? form.version_number : nextVersion,
      trigger_type: form.trigger_type || "deposit",
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      status: form.status || "draft",
      notes: form.notes || null,
    };
    if (form.id) {
      const { error } = await supabase.from("upi_commission_eligibility_configs" as any).update(payload).eq("id", form.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("upi_commission_eligibility_configs" as any).insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Eligibility config saved");
    setForm(null);
    setSaving(false);
    load();
  };

  const publish = async (id: string) => {
    const { error } = await supabase
      .from("upi_commission_eligibility_configs" as any)
      .update({ status: "published" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Config published");
    load();
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading eligibility configs…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Defines when a student becomes commission-eligible. Institution claim rules are a separate backlog item.
        </p>
        <Button size="sm" onClick={() => setForm({ config_name: "", trigger_type: "deposit", status: "draft" })}>
          <Plus className="size-4 mr-1" /> New config
        </Button>
      </div>

      {configs.map((c) => (
        <Card key={c.id} className="p-4 flex justify-between gap-2 flex-wrap">
          <div>
            <div className="font-medium flex items-center gap-2 flex-wrap">
              {c.config_name}
              <Badge variant="outline">v{c.version_number}</Badge>
              <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Trigger: {TRIGGERS.find((t) => t.value === c.trigger_type)?.label ?? c.trigger_type}
              {c.effective_from && ` · from ${c.effective_from}`}
              {c.effective_to && ` · to ${c.effective_to}`}
            </div>
          </div>
          <div className="flex gap-2">
            {c.status === "draft" && (
              <Button size="sm" variant="secondary" onClick={() => publish(c.id)}>
                <Send className="size-4 mr-1" /> Publish
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setForm(c)}>Edit</Button>
          </div>
        </Card>
      ))}

      {form && (
        <Card className="p-4 space-y-3">
          <div className="font-medium">{form.id ? "Edit config" : "New eligibility config"}</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Config name</Label>
              <Input value={form.config_name ?? ""} onChange={(e) => setForm({ ...form, config_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Trigger</Label>
              <Select value={form.trigger_type ?? "deposit"} onValueChange={(v) => setForm({ ...form, trigger_type: v as EligibilityTriggerType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Effective from</Label>
              <Input type="date" value={form.effective_from ?? ""} onChange={(e) => setForm({ ...form, effective_from: e.target.value || null })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Effective to</Label>
              <Input type="date" value={form.effective_to ?? ""} onChange={(e) => setForm({ ...form, effective_to: e.target.value || null })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveDraft} disabled={saving}>
              <Save className="size-4 mr-1" /> {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
