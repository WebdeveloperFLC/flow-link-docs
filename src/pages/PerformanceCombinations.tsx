import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceCombinationCard } from "@/components/performance/PerformanceCombinationCard";
import { PerformanceCombinationDetail } from "@/components/performance/PerformanceCombinationDetail";
import { useCombinationEngineData } from "@/hooks/useCombinationEngineData";
import type { ServiceCombinationRow } from "@/incentives/lib/combinationEngineLogic";
import { supabase } from "@/integrations/supabase/client";
import { Combine, Layers, Plus } from "lucide-react";
import { toast } from "sonner";

export default function PerformanceCombinations() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);
  const canEdit = isAdmin || hasRole(["manager", "administrator"]);

  const { rows, loading, kpis, reload } = useCombinationEngineData();
  const [selected, setSelected] = useState<ServiceCombinationRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCodes, setNewCodes] = useState("");
  const [newMaxPct, setNewMaxPct] = useState("12");

  const openDetail = (row: ServiceCombinationRow) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const createCombination = async () => {
    if (!newName.trim()) {
      toast.error("Name required");
      return;
    }
    const codes = newCodes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (codes.length === 0) {
      toast.error("Add at least one service code");
      return;
    }
    setCreating(true);
    try {
      // @ts-expect-error service_combinations added in Phase 3A migration
      const { error } = await supabase.from("service_combinations").insert({
        name: newName.trim(),
        combination_type: "logical",
        service_codes: codes,
        max_discount_pct: newMaxPct ? Number(newMaxPct) : null,
        wallet_eligible: true,
        is_active: true,
      });
      if (error) throw error;
      toast.success("Combination created");
      setCreateOpen(false);
      setNewName("");
      setNewCodes("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create combination");
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Commercial combination engine"
          subtitle="Unlimited service combinations with per-combination discount, offer and incentive rules"
          showModuleLegend={false}
        />

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Combine className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">No combination is hardcoded</div>
            <div className="ph-muted text-xs mt-1">
              Combinations are composed from service primitives at runtime. Admins add new services and the engine
              resolves composed pricing via <code className="text-xs">fn_resolve_combination</code>.
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
          <Link to="/performance/incentives/plans" className="hover:underline" style={{ color: "var(--blue)" }}>
            Incentive plans →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            { module: "wallet", label: "Active combinations", value: String(kpis.total), hint: `${kpis.logical} logical` },
            { module: "offers", label: "Package mode", value: String(kpis.package), hint: "Custom pricing bundles" },
            { module: "cash", label: "With rules", value: String(kpis.withRules), hint: "D / O / I tags linked" },
          ]}
        />

        <div className="flex justify-end">
          {canEdit && (
            <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New combination
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-sm ph-muted">Loading combinations…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border ph-surface-card p-8 text-center space-y-3">
            <p className="text-sm ph-muted">
              No combinations yet. Apply migration <code className="text-xs">20260718120000</code> in Lovable Publish,
              then create logical combinations from service library codes.
            </p>
            {canEdit && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4 mr-1" /> Create first combination
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rows.map((row) => (
              <PerformanceCombinationCard key={row.id} row={row} onSelect={openDetail} />
            ))}
          </div>
        )}

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Layers className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Per-combination rules</div>
            <div className="ph-muted text-xs mt-1">
              Each combination carries its own discount ceiling, offer eligibility and incentive formula (D / O / I
              tags). Management creates unlimited combinations as data — no developer involvement.
            </div>
          </div>
        </div>

        <PerformanceCombinationDetail row={selected} open={detailOpen} onOpenChange={setDetailOpen} />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New logical combination</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="combo-name">Name</Label>
                <Input
                  id="combo-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Coaching + Study Abroad + Visa"
                />
              </div>
              <div>
                <Label htmlFor="combo-codes">Service codes (comma-separated)</Label>
                <Input
                  id="combo-codes"
                  value={newCodes}
                  onChange={(e) => setNewCodes(e.target.value)}
                  placeholder="library-uuid::canada, library-uuid::visa"
                />
                <p className="text-xs ph-muted mt-1">Use service library IDs from CRM registration flow.</p>
              </div>
              <div>
                <Label htmlFor="combo-max">Max discount %</Label>
                <Input
                  id="combo-max"
                  type="number"
                  value={newMaxPct}
                  onChange={(e) => setNewMaxPct(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createCombination} disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
