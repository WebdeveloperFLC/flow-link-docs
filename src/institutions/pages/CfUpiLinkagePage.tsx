import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  applyLinkageCandidates,
  fetchLinkageDashboardStats,
  listLinkageCandidates,
  runLinkageDryRun,
  setLinkageReview,
  type LinkageCandidate,
  type LinkageDashboardStats,
  type LinkageDryRunSummary,
} from "../lib/cfUpiLinkageApi";

const METHOD_FILTERS = [
  { value: "all", label: "All methods" },
  { value: "exact", label: "Exact" },
  { value: "normalized", label: "Normalized" },
  { value: "alias", label: "Alias" },
  { value: "unmatched", label: "Unmatched / ambiguous" },
];

function methodBadge(method: string, ambiguous: boolean) {
  if (ambiguous) return <Badge variant="destructive">ambiguous</Badge>;
  if (method === "exact") return <Badge>exact</Badge>;
  if (method === "normalized") return <Badge variant="secondary">normalized</Badge>;
  if (method === "alias") return <Badge variant="outline">alias</Badge>;
  if (method === "manual") return <Badge variant="outline">manual</Badge>;
  return <Badge variant="destructive">unmatched</Badge>;
}

export default function CfUpiLinkagePage() {
  const { canEdit } = useModulePermission("institutions");
  const [stats, setStats] = useState<LinkageDashboardStats | null>(null);
  const [summary, setSummary] = useState<LinkageDryRunSummary | null>(null);
  const [rows, setRows] = useState<LinkageCandidate[]>([]);
  const [methodFilter, setMethodFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        fetchLinkageDashboardStats(),
        listLinkageCandidates({
          matchMethod: methodFilter === "all" ? undefined : methodFilter === "unmatched" ? undefined : methodFilter,
          status: "pending_review",
        }),
      ]);
      setStats(s);
      let filtered = c;
      if (methodFilter === "unmatched") {
        filtered = c.filter((r) => r.match_method === "unmatched" || r.is_ambiguous);
      }
      setRows(filtered);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load linkage data");
    } finally {
      setLoading(false);
    }
  }, [methodFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const exact = rows.filter((r) => r.match_method === "exact" && !r.is_ambiguous);
    const normalized = rows.filter((r) => r.match_method === "normalized" && !r.is_ambiguous);
    const alias = rows.filter((r) => r.match_method === "alias" && !r.is_ambiguous);
    const ambiguous = rows.filter((r) => r.is_ambiguous);
    const unmatched = rows.filter((r) => r.match_method === "unmatched" && !r.is_ambiguous);
    return { exact, normalized, alias, ambiguous, unmatched };
  }, [rows]);

  const onDryRun = async () => {
    if (!canEdit) return toast.error("Edit access required");
    setBusy(true);
    try {
      const result = await runLinkageDryRun();
      setSummary(result);
      toast.success("Dry run complete — no links applied");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dry run failed");
    } finally {
      setBusy(false);
    }
  };

  const onApprove = async (row: LinkageCandidate) => {
    if (!canEdit) return;
    try {
      await setLinkageReview(row.id, "approved");
      toast.success(`Approved: ${row.cf_name}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    }
  };

  const onReject = async (row: LinkageCandidate) => {
    if (!canEdit) return;
    try {
      await setLinkageReview(row.id, "rejected");
      toast.success(`Rejected: ${row.cf_name}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    }
  };

  const onApply = async () => {
    if (!canEdit) return;
    if (!window.confirm("Apply all APPROVED links to cf_universities? This writes upi_institution_id.")) return;
    setBusy(true);
    try {
      const result = await applyLinkageCandidates();
      toast.success(`Applied ${result.applied} link(s)`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const renderTable = (title: string, items: LinkageCandidate[]) => {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          {title} ({items.length})
        </h3>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2">CF university</th>
                <th className="p-2">Country</th>
                <th className="p-2">Courses</th>
                <th className="p-2">Suggested UPI</th>
                <th className="p-2">Method</th>
                {canEdit && <th className="p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-medium">{r.cf_name}</td>
                  <td className="p-2">{r.cf_country_code}</td>
                  <td className="p-2">{r.cf_course_count}</td>
                  <td className="p-2">
                    {r.suggested_upi_name ?? (
                      r.is_ambiguous ? (
                        <span className="text-muted-foreground text-xs">
                          {JSON.stringify(r.ambiguous_candidates)}
                        </span>
                      ) : (
                        "—"
                      )
                    )}
                  </td>
                  <td className="p-2">{methodBadge(r.match_method, r.is_ambiguous)}</td>
                  {canEdit && (
                    <td className="p-2 space-x-1">
                      {!r.is_ambiguous && r.suggested_upi_institution_id && (
                        <Button size="sm" variant="outline" onClick={() => void onApprove(r)}>
                          Approve
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => void onReject(r)}>
                        Reject
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const lastSummary = summary ?? stats?.last_dry_run_summary;

  return (
    <AppLayout>
      <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="CF ↔ UPI Linkage"
          description="Dry-run matching for Course Finder universities. Review candidates before Apply — Mark Final requires upi_institution_id."
        />

        <Card className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="text-sm space-y-1">
            <div>
              Linked: <strong>{stats?.linked ?? "—"}</strong> / {stats?.cf_total ?? "—"} · Mark Final
              eligible: <strong>{stats?.mark_final_eligible_pct ?? 0}%</strong>
            </div>
            {lastSummary && (
              <div className="text-muted-foreground">
                Last dry run — exact {lastSummary.exact ?? summary?.exact ?? 0}, normalized{" "}
                {lastSummary.normalized ?? summary?.normalized ?? 0}, alias {lastSummary.alias ?? summary?.alias ?? 0},
                ambiguous {lastSummary.ambiguous ?? summary?.ambiguous ?? 0}, unmatched{" "}
                {lastSummary.unmatched ?? summary?.unmatched ?? 0}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="size-4 mr-1" />
              Refresh
            </Button>
            {canEdit && (
              <>
                <Button onClick={() => void onDryRun()} disabled={busy}>
                  {busy ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Play className="size-4 mr-1" />}
                  Run Dry Run
                </Button>
                <Button variant="secondary" onClick={() => void onApply()} disabled={busy || !stats?.approved_ready}>
                  Apply approved ({stats?.approved_ready ?? 0})
                </Button>
              </>
            )}
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No candidates yet. Run Dry Run to scan all cf_universities against the UPI master.
          </Card>
        ) : (
          <div className="space-y-6">
            {renderTable("Exact matches", grouped.exact)}
            {renderTable("Normalized matches", grouped.normalized)}
            {renderTable("Alias matches", grouped.alias)}
            {renderTable("Ambiguous matches", grouped.ambiguous)}
            {renderTable("Unmatched", grouped.unmatched)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
