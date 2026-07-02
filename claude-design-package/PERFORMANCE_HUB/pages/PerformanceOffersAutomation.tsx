import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { toast } from "sonner";
import { Plus, RefreshCw, Zap } from "lucide-react";

interface TemplateRow {
  id: string;
  name: string;
  trigger_type: string;
  discount_type: string;
  discount_value: number;
  validity_days_before: number;
  validity_days_after: number;
  trigger_event: string | null;
  is_active: boolean;
  target_countries: string[] | null;
}

export default function PerformanceOffersAutomation() {
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const canManage = canEdit || hasRole(["manager", "admin", "administrator"]);
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("birthday");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const [daysBefore, setDaysBefore] = useState("7");
  const [daysAfter, setDaysAfter] = useState("7");

  const load = useCallback(async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("offer_templates")
      .select(
        "id, name, trigger_type, discount_type, discount_value, validity_days_before, validity_days_after, trigger_event, is_active, target_countries",
      )
      .order("name");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as TemplateRow[]);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function toggleActive(row: TemplateRow) {
    if (!canManage) return;
    const { error } = await supabase.from("offer_templates").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) toast.error(error.message);
    else load();
  }

  async function addRule() {
    if (!canManage || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("offer_templates").insert({
      name: name.trim(),
      trigger_type: triggerType,
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      validity_days_before: Number(daysBefore) || 7,
      validity_days_after: Number(daysAfter) || 7,
      is_active: false,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rule saved (inactive) — enable when ready");
    setName("");
    load();
  }

  function ruleSummary(r: TemplateRow) {
    const when =
      r.trigger_type === "birthday"
        ? `Birthday · ${r.validity_days_before}d before`
        : r.trigger_type === "workflow"
          ? `Workflow · ${r.trigger_event ?? "event"}`
          : "Manual";
    const then = `${r.discount_type === "percentage" ? `${r.discount_value}%` : `₹${r.discount_value}`} off · valid +${r.validity_days_after}d after trigger`;
    return { when, then };
  }

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <PerformanceHubHeader
        title="Auto-offer rules"
        subtitle="WHEN trigger · IF conditions · THEN offer — birthday runs daily via offers-lifecycle-tick"
      />
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <OffersStudioNav />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={busy ? "size-4 mr-1 animate-spin" : "size-4 mr-1"} />
            Refresh
          </Button>
        </div>

        <Card className="p-4 space-y-3">
          {rows.map((r) => {
            const { when, then } = ruleSummary(r);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 border rounded-lg p-3">
                <Zap className="size-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-[240px] text-sm">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-muted-foreground mt-0.5">
                    <span className="font-semibold text-foreground">WHEN</span> {when} ·{" "}
                    <span className="font-semibold text-foreground">THEN</span> {then}
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {r.trigger_type}
                    {!r.is_active && " · off"}
                  </Badge>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${r.id}`} className="text-xs text-muted-foreground">
                      Active
                    </Label>
                    <Switch id={`toggle-${r.id}`} checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && !busy && (
            <p className="text-sm text-muted-foreground">No auto-offer rules yet.</p>
          )}
        </Card>

        {canManage && (
          <Card className="p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Plus className="size-4" />
              New rule
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Birthday IELTS bundle" />
              </div>
              <div className="space-y-1">
                <Label>Trigger</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday (L2 auto-send)</SelectItem>
                    <SelectItem value="workflow">Workflow event</SelectItem>
                    <SelectItem value="manual">Manual only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Discount type</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Discount value</Label>
                <Input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} type="number" />
              </div>
              <div className="space-y-1">
                <Label>Days before trigger</Label>
                <Input value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} type="number" />
              </div>
              <div className="space-y-1">
                <Label>Days after trigger</Label>
                <Input value={daysAfter} onChange={(e) => setDaysAfter(e.target.value)} type="number" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Birthday rules run daily via <code className="text-xs">offers-lifecycle-tick</code>. Workflow triggers are
              UI-only in this phase — enable birthday rules first.
            </p>
            <Button onClick={addRule} disabled={saving || !name.trim()}>
              Add rule (starts off)
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
