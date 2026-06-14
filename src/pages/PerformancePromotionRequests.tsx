import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformancePromotionWorkflowStrip } from "@/components/performance/PerformancePromotionWorkflowStrip";
import { PerformancePromotionRequestCard } from "@/components/performance/PerformancePromotionRequestCard";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { useToast } from "@/hooks/use-toast";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import {
  filterPromotionCards,
  mapPromotionRequest,
  promotionWorkflowCounts,
  type PromotionWorkflowStep,
} from "@/incentives/lib/promotionRequestLogic";
import { Megaphone, Plus, RefreshCw } from "lucide-react";

interface PromoRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  funding_source: string;
  proposed_discount_text: string | null;
  target_audience: string | null;
  sla_at: string;
  created_at: string;
  review_note: string | null;
  requester?: { full_name: string | null } | null;
}

export default function PerformancePromotionRequests() {
  const { user, hasRole } = useAuth();
  const { canEdit: canEditOffers } = useModulePermission("offers");
  const { period } = usePerformancePeriod();
  const { toast } = useToast();
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepFilter, setStepFilter] = useState<PromotionWorkflowStep | "all">("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposedDiscount, setProposedDiscount] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const canReview = hasRole(["admin", "administrator", "manager"]) || canEditOffers;

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      // @ts-expect-error promotion_requests not in generated types yet (PH-R-016)
      .from("promotion_requests")
      .select(
        `
        id, title, description, status, funding_source, proposed_discount_text,
        target_audience, sla_at, created_at, review_note,
        requester:profiles!promotion_requests_requested_by_fkey(full_name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Could not load requests",
        description: formatSupabaseError(error, "Load failed"),
        variant: "destructive",
      });
      setRows([]);
    } else {
      setRows((data ?? []) as PromoRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const cards = useMemo(() => rows.map(mapPromotionRequest), [rows]);
  const workflowCounts = useMemo(() => promotionWorkflowCounts(cards), [cards]);
  const filteredCards = useMemo(
    () => filterPromotionCards(cards, stepFilter),
    [cards, stepFilter],
  );

  async function submitRequest() {
    if (!user || !title.trim()) {
      toast({ title: "Enter a title", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        // @ts-expect-error promotion_requests not in generated types yet (PH-R-016)
        .from("promotion_requests")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          proposed_discount_text: proposedDiscount.trim() || null,
          target_audience: targetAudience.trim() || null,
          requested_by: user.id,
          funding_source: "future_link",
        });
      if (error) throw error;
      toast({ title: "Promotion request submitted", description: "MarCom will review within 48h SLA." });
      setTitle("");
      setDescription("");
      setProposedDiscount("");
      setTargetAudience("");
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      toast({
        title: "Could not submit",
        description: formatSupabaseError(e, "Submit failed"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function publishRequest(id: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_publish_promotion_from_request", {
        _request_id: id,
      });
      if (error) throw error;
      const result = data as { ok?: boolean; offer_id?: string };
      if (!result?.ok) throw new Error("Publish failed");
      toast({
        title: "Draft offer created",
        description: "Open Offers library to activate and schedule.",
      });
      await load();
    } catch (e: unknown) {
      toast({
        title: "Publish failed",
        description: formatSupabaseError(e, "Could not publish"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setBusy(true);
    try {
      const { error } = await supabase
        // @ts-expect-error promotion_requests not in generated types yet (PH-R-016)
        .from("promotion_requests")
        .update({
          status,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast({ title: `Marked ${status.replace("_", " ")}` });
      await load();
    } catch (e: unknown) {
      toast({
        title: "Update failed",
        description: formatSupabaseError(e, "Could not update"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <PerformanceHubHeader
          title="Promotion request system"
          subtitle="Counselors and managers submit proposals with budget, forecast and ROI. MarCom reviews, approves and launches."
          period={period}
          showModuleLegend={false}
        />

        <PerformancePeriodBar showBranch={false} compact />

        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" className="gap-2" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Submit proposal
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link
            to="/performance/offers/library"
            className="text-sm hover:underline ml-auto"
            style={{ color: "var(--blue)" }}
          >
            Offers library →
          </Link>
        </div>

        <PerformancePromotionWorkflowStrip
          active={stepFilter}
          counts={workflowCounts}
          onSelect={setStepFilter}
        />

        {showForm && (
          <Card className="p-4 space-y-3 ph-surface-card border-l-4 ph-module-offers">
            <h3 className="font-semibold flex items-center gap-2 ph-heading">
              <Megaphone className="size-4" /> Submit promotion request
            </h3>
            <Input
              placeholder="Title (e.g. Gujarat French→Canada funnel)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Context — branch, audience, timing, forecast revenue…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                placeholder="Proposed discount (e.g. 10% off coaching)"
                value={proposedDiscount}
                onChange={(e) => setProposedDiscount(e.target.value)}
              />
              <Input
                placeholder="Target audience (e.g. IELTS leads, no payment yet)"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={submitRequest}>
                Submit for review
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <Card className="p-6 text-center ph-muted text-sm">Loading promotion requests…</Card>
        ) : filteredCards.length === 0 ? (
          <Card className="p-6 text-center ph-muted text-sm">No promotion requests in this view.</Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredCards.map((card) => (
              <PerformancePromotionRequestCard
                key={card.id}
                card={card}
                canReview={canReview}
                busy={busy}
                onApprove={(id) => updateStatus(id, "approved")}
                onDecline={(id) => updateStatus(id, "declined")}
                onInReview={(id) => updateStatus(id, "in_review")}
                onPublish={publishRequest}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
