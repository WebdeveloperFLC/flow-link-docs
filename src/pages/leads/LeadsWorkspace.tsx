import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  Upload,
  Loader2,
} from "lucide-react";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadsKanbanBoard } from "@/components/leads/LeadsKanbanBoard";
import { CrmSegmentControl } from "@/components/crm/CrmSegmentControl";
import { ImportColdLeadsDialog } from "@/components/leads/ImportColdLeadsDialog";
import {
  bulkUpdateLeads,
  fetchLeadBranches,
  fetchLeadsQuery,
  type FollowupDueFilter,
  type Lead,
  type LeadSegment,
  type LeadSortKey,
  type LeadStatus,
  type LeadTemperature,
} from "@/lib/leads";
import { fetchProfileNames } from "@/lib/leadAssignment";
import { loadStaffDirectory } from "@/lib/staffDirectory";
import { toast } from "sonner";

const PAGE_SIZE = 25;
const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "unqualified", "lost"];

type LeadsWorkspaceProps = {
  defaultSegment?: LeadSegment;
};

export default function LeadsWorkspace({ defaultSegment = "active" }: LeadsWorkspaceProps) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();

  const segment = (params.get("segment") as LeadSegment) || defaultSegment;
  const view = params.get("view") === "board" ? "board" : "table";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const sort = (params.get("sort") as LeadSortKey) || "created_at";
  const dir = (params.get("dir") as "asc" | "desc") || "desc";
  const statusFilter = params.get("status") ?? "";
  const branchFilter = params.get("branch") ?? "";
  const followupFilter = (params.get("followup") as FollowupDueFilter) || "any";
  const ownerFilter = params.get("owner") ?? "";
  const unassigned = params.get("unassigned") === "1";

  const [searchInput, setSearchInput] = useState(q);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<string[]>([]);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params);
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
      if (key !== "page") next.set("page", "1");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    const t = setTimeout(() => setParam("q", searchInput.trim() || null), 300);
    return () => clearTimeout(t);
  }, [searchInput, setParam]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, total: count } = await fetchLeadsQuery({
        segment,
        statuses: statusFilter ? [statusFilter as LeadStatus] : undefined,
        branch: branchFilter || undefined,
        assignedCounselorId: ownerFilter || undefined,
        unassignedOnly: unassigned,
        search: q || undefined,
        followupDue: followupFilter,
        sort,
        sortDir: dir,
        page,
        pageSize: PAGE_SIZE,
      });
      setLeads(rows);
      setTotal(count);
      const ids = rows.map((l) => l.assigned_counselor_id).filter(Boolean) as string[];
      const map = await fetchProfileNames(ids);
      setOwnerNames(Object.fromEntries(map));
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [segment, statusFilter, branchFilter, ownerFilter, unassigned, q, followupFilter, sort, dir, page, refreshTick]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetchLeadBranches().then(setBranches).catch(() => {});
    loadStaffDirectory()
      .then(({ staff }) => setOwners(staff.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showCampaign = segment === "cold" || segment === "all";

  const title = useMemo(() => {
    if (segment === "cold") return "Leads — Cold Pool";
    if (segment === "hot") return "Leads — Hot";
    if (segment === "warm") return "Leads — Warm";
    if (segment === "all") return "Leads — All";
    return "Leads";
  }, [segment]);

  const onSortChange = (key: LeadSortKey) => {
    if (sort === key) setParam("dir", dir === "asc" ? "desc" : "asc");
    else {
      setParam("sort", key);
      setParam("dir", key === "last_name" ? "asc" : "desc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkPatch = async (patch: Parameters<typeof bulkUpdateLeads>[1], label: string) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const result = await bulkUpdateLeads(ids, patch);
      if (result.failed.length) {
        toast.error(`${result.failed.length} update(s) failed`);
      }
      toast.success(`${label}: ${result.updated} lead(s)`);
      setRefreshTick((v) => v + 1);
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title={title}
        description="Search, filter, and manage leads in one workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            {segment === "cold" && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="size-4 mr-1" /> Import CSV
              </Button>
            )}
            <Button onClick={() => nav(segment === "cold" ? "/leads/new?mode=cold" : "/leads/new")} variant="cta">
              <Plus className="size-4 mr-1" /> {segment === "cold" ? "New Cold Lead" : "New Lead"}
            </Button>
          </div>
        }
      />
      <div className="p-6 sm:p-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <CrmSegmentControl value={segment} onChange={(s) => setParam("segment", s === defaultSegment ? null : s)} />
          <div className="inline-flex rounded-lg border bg-muted/40 p-1">
            <Button
              type="button"
              size="sm"
              variant={view === "table" ? "secondary" : "ghost"}
              onClick={() => setParam("view", null)}
            >
              <LayoutList className="size-4 mr-1" /> Table
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "board" ? "secondary" : "ghost"}
              onClick={() => setParam("view", "board")}
            >
              <LayoutGrid className="size-4 mr-1" /> Pipeline
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, email, phone, lead #…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setParam("status", v === "__all__" ? null : v)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={branchFilter || "__all__"} onValueChange={(v) => setParam("branch", v === "__all__" ? null : v)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All branches</SelectItem>
              {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={followupFilter} onValueChange={(v) => setParam("followup", v === "any" ? null : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Follow-up" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any follow-up</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due today</SelectItem>
              <SelectItem value="week">Due this week</SelectItem>
              <SelectItem value="none">No follow-up</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={unassigned ? "__unassigned__" : ownerFilter || "__all__"}
            onValueChange={(v) => {
              if (v === "__unassigned__") {
                setParam("owner", null);
                setParam("unassigned", "1");
              } else {
                setParam("unassigned", null);
                setParam("owner", v === "__all__" ? null : v);
              }
            }}
          >
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Owner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All owners</SelectItem>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => void bulkPatch({ lead_temperature: "hot" as LeadTemperature }, "Marked hot")}>
              Mark hot
            </Button>
            <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => void bulkPatch({ lead_temperature: "warm" as LeadTemperature }, "Marked warm")}>
              Mark warm
            </Button>
            <Select
              onValueChange={(v) => {
                if (!v) return;
                void bulkPatch({ assigned_counselor_id: v }, "Reassigned");
              }}
            >
              <SelectTrigger className="w-[180px] h-8" disabled={bulkBusy}>
                <SelectValue placeholder="Reassign to…" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        <Card className="overflow-hidden">
          {loading && leads.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm inline-flex items-center justify-center gap-2 w-full">
              <Loader2 className="size-4 animate-spin" /> Loading leads…
            </div>
          ) : view === "board" ? (
            <div className="p-4">
              <LeadsKanbanBoard leads={leads} ownerNames={ownerNames} onChanged={() => setRefreshTick((v) => v + 1)} />
            </div>
          ) : (
            <LeadsTable
              leads={leads}
              showCampaign={showCampaign}
              ownerNames={ownerNames}
              selectedIds={selected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={(checked) =>
                setSelected(checked ? new Set(leads.map((l) => l.id)) : new Set())
              }
              sort={{ key: sort, dir }}
              onSortChange={onSortChange}
              onRefresh={() => setRefreshTick((v) => v + 1)}
            />
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm">
            <div className="text-muted-foreground">
              {loading ? "Loading…" : total === 0 ? "0 results" : (
                <>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setParam("page", String(page - 1))}>
                <ChevronLeft className="size-4" aria-hidden="true" /> Previous
              </Button>
              <span className="text-xs tabular-nums">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setParam("page", String(page + 1))}>
                Next <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ImportColdLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => setRefreshTick((v) => v + 1)}
      />
    </AppLayout>
  );
}
