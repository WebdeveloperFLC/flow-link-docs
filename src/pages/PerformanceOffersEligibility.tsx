import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceOfferConflictPanel } from "@/components/performance/PerformanceOfferConflictPanel";
import { PerformanceOfferEligibilityTable } from "@/components/performance/PerformanceOfferEligibilityTable";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { useOfferEligibilityData } from "@/hooks/useOfferEligibilityData";
import { ELIGIBILITY_AUDIENCES } from "@/incentives/lib/offerEligibilityLogic";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Plus } from "lucide-react";
import { toast } from "sonner";

export default function PerformanceOffersEligibility() {
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator", "director"]);
  const canManage = canEdit || hasRole(["manager", "administrator"]);

  const { rules, offers, loading: dataLoading, summary, reload } = useOfferEligibilityData();
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offerId, setOfferId] = useState("");
  const [audience, setAudience] = useState("existing");
  const [scopeService, setScopeService] = useState("");
  const [scopeCountry, setScopeCountry] = useState("");
  const [notes, setNotes] = useState("");

  const createRule = async () => {
    setSaving(true);
    try {
      // @ts-expect-error offer_eligibility_rules added in Phase 3B migration
      const { error } = await supabase.from("offer_eligibility_rules").insert({
        offer_id: offerId || null,
        audience,
        block_if_active_service: true,
        scope_service_code: scopeService.trim() || null,
        scope_country_tag: scopeCountry.trim() || null,
        evaluate_against: ["enrollments", "invoices", "payments"],
        is_active: true,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success("Eligibility rule created");
      setCreateOpen(false);
      setOfferId("");
      setScopeService("");
      setScopeCountry("");
      setNotes("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create rule");
    } finally {
      setSaving(false);
    }
  };

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/performance/offers" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Offer eligibility"
          subtitle="Existing-client and enrollment-aware rules — extends offers_eligible_for_client"
          showModuleLegend={false}
        />
        <OffersStudioNav />

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <ShieldCheck className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Auto eligibility checks</div>
            <div className="ph-muted text-xs mt-1">
              Rules block offers when a client is already enrolled in a scoped service (e.g. active IELTS → block another
              IELTS promo). Global policies apply to all offers; offer-specific rules override per promotion.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/offers/library" className="hover:underline" style={{ color: "var(--blue)" }}>
            Offer management →
          </Link>
          <Link to="/performance/client-commercials" className="hover:underline" style={{ color: "var(--blue)" }}>
            Client commercials →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={dataLoading}
          items={[
            { module: "offers", label: "Active rules", value: String(rules.filter((r) => r.isActive).length), hint: `${summary.globalRules} global` },
            { module: "offers", label: "Stackable offers", value: String(summary.stackableOffers), hint: "May combine when both stackable" },
            { module: "wallet", label: "Priority offers", value: String(summary.highPriorityOffers), hint: "Higher priority wins ties" },
          ]}
        />

        <div className="flex justify-end">
          {canManage && (
            <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Add rule
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceOfferEligibilityTable rows={rules} loading={dataLoading} />
          <PerformanceOfferConflictPanel summary={summary} />
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New eligibility rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Linked offer (optional)</Label>
                <Select value={offerId || "__global__"} onValueChange={(v) => setOfferId(v === "__global__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Global policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__global__">Global — all offers</SelectItem>
                    {offers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ELIGIBILITY_AUDIENCES.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="scope-service">Scope service code</Label>
                <Input
                  id="scope-service"
                  value={scopeService}
                  onChange={(e) => setScopeService(e.target.value)}
                  placeholder="library-uuid::IELTS"
                />
              </div>
              <div>
                <Label htmlFor="scope-country">Scope country tag (optional)</Label>
                <Input
                  id="scope-country"
                  value={scopeCountry}
                  onChange={(e) => setScopeCountry(e.target.value)}
                  placeholder="Germany"
                />
              </div>
              <div>
                <Label htmlFor="rule-notes">Notes</Label>
                <Input id="rule-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createRule} disabled={saving}>
                {saving ? "Saving…" : "Create rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
