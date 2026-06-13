import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { useToast } from "@/hooks/use-toast";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { currentPeriodKey } from "@/lib/performanceHubTheme";
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  in_review: "default",
  approved: "outline",
  published: "outline",
  declined: "destructive",
};

export default function PerformancePromotionRequests() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposedDiscount, setProposedDiscount] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const canReview = hasRole(["admin", "administrator", "manager"]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
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

  async function submitRequest() {
    if (!user || !title.trim()) {
      toast({ title: "Enter a title", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("promotion_requests").insert({
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

  async function updateStatus(id: string, status: string, reviewNote?: string) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("promotion_requests")
        .update({
          status,
          review_note: reviewNote ?? null,
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

  const slaWarning = (sla: string) => {
    const hours = (new Date(sla).getTime() - Date.now()) / 3600000;
    return hours < 0 ? "SLA breached" : hours < 12 ? "Due soon" : null;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Promotion requests"
          subtitle="Field teams request new offers — MarCom reviews and publishes to the library"
          period={currentPeriodKey()}
          showModuleLegend={false}
        />

        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" className="gap-2" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> New request
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link to="/offers-admin" className="text-sm text-primary hover:underline ml-auto">
            Offers library →
          </Link>
        </div>

        {showForm && (
          <Card className="p-4 space-y-3 border-l-4 border-l-violet-500">
            <h3 className="font-semibold flex items-center gap-2">
              <Megaphone className="size-4" /> Submit promotion request
            </h3>
            <Input placeholder="Title (e.g. June IELTS enrolment push)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea
              placeholder="Context — branch, audience, timing…"
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

        <div className="space-y-3">
          {rows.map((row) => {
            const sla = slaWarning(row.sla_at);
            return (
              <Card key={row.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{row.title}</h3>
                      <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{row.status}</Badge>
                      {sla && row.status === "pending" && (
                        <Badge variant="destructive">{sla}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {row.requester?.full_name ?? "Staff"} · {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {row.description && <p className="text-sm mb-2">{row.description}</p>}
                {(row.proposed_discount_text || row.target_audience) && (
                  <p className="text-xs text-muted-foreground">
                    {row.proposed_discount_text && <>Discount: {row.proposed_discount_text}</>}
                    {row.target_audience && <> · Audience: {row.target_audience}</>}
                  </p>
                )}
                {canReview && ["pending", "in_review"].includes(row.status) && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => updateStatus(row.id, "in_review")}>
                      Mark in review
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => updateStatus(row.id, "approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => updateStatus(row.id, "declined")}>
                      Decline
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/offers-admin">Publish via library</Link>
                    </Button>
                  </div>
                )}
                {row.review_note && (
                  <p className="text-xs italic text-muted-foreground mt-2">Note: {row.review_note}</p>
                )}
              </Card>
            );
          })}
          {!loading && rows.length === 0 && (
            <Card className="p-6 text-center text-muted-foreground text-sm">No promotion requests yet.</Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
