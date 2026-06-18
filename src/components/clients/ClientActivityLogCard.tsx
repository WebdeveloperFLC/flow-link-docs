import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listClientActivityLog,
  subscribeClientActivityLog,
  formatActivityAction,
  type ClientActivityLogRow,
} from "@/lib/clientActivityLog";
import { supabase } from "@/integrations/supabase/client";
import { History, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PAGE_SIZE = 50;

const FILTER_GROUPS: Array<{ key: string; label: string; actions: string[] }> = [
  { key: "all", label: "All", actions: [] },
  {
    key: "lead",
    label: "Lead",
    actions: [
      "lead_created",
      "lead_updated",
      "lead_converted",
      "lead_followup_scheduled",
      "lead_followup_completed",
    ],
  },
  {
    key: "profile",
    label: "Profile",
    actions: ["profile_updated", "contact_updated", "client_created"],
  },
  {
    key: "services",
    label: "Services",
    actions: ["services_updated", "pipeline_assigned"],
  },
  {
    key: "stage",
    label: "Stage",
    actions: [
      "stage_completed",
      "stage_uncompleted",
      "stage_note_cleared",
      "stage_entered",
      "stage_changed",
      "client_status_changed",
      "internal_sub_status_changed",
    ],
  },
  {
    key: "documents",
    label: "Documents",
    actions: ["document.uploaded", "document.trashed", "document.purged", "document.restored"],
  },
  {
    key: "tasks",
    label: "Tasks",
    actions: ["task_created", "task_assigned", "task_reassigned", "task_completed"],
  },
  {
    key: "finance",
    label: "Finance",
    actions: [
      "invoice_created",
      "invoice_modified",
      "invoice_approved",
      "payment_recorded",
      "payment_verified",
      "payment_submitted",
      "payment_awaiting_verification",
      "receipt_generated",
      "receipt_approved",
    ],
  },
  {
    key: "team",
    label: "Team",
    actions: [
      "handoff",
      "client.access_granted",
      "client.access_changed",
      "client.access_revoked",
      "client.ownership_transferred",
      "portal_invitation_sent",
    ],
  },
  { key: "notes", label: "Notes", actions: ["note_added", "remark"] },
];

function formatLogDate(iso: string): string {
  try {
    return format(new Date(iso), "dd-MMM-yyyy h:mm a");
  } catch {
    return iso;
  }
}

function roleLabel(role: string | null): string {
  if (!role) return "Staff";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function ClientActivityLogCard({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<ClientActivityLogRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listClientActivityLog(clientId, limit + 1)
      .then((r) => {
        if (!alive) return;
        setHasMore(r.length > limit);
        setRows(r.slice(0, limit));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    const off = subscribeClientActivityLog(clientId, (row) => {
      setRows((prev) => (prev.some((x) => x.id === row.id) ? prev : [row, ...prev]));
    });
    return () => {
      alive = false;
      off();
    };
  }, [clientId, limit]);

  useEffect(() => {
    const ids = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])).filter(
      (id) => !names[id],
    );
    if (!ids.length) return;
    supabase
      .from("profiles")
      .select("id,full_name,email")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        setNames((prev) => {
          const next = { ...prev };
          for (const r of data) next[r.id] = r.full_name || r.email || r.id.slice(0, 6);
          return next;
        });
      });
  }, [rows, names]);

  const filtered = useMemo(() => {
    const allowed = FILTER_GROUPS.find((f) => f.key === filter)?.actions ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (allowed.length && !allowed.includes(r.action)) return false;
      if (
        q &&
        !(
          (r.summary ?? "").toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          (r.previous_value ?? "").toLowerCase().includes(q) ||
          (r.new_value ?? "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  return (
    <Card className="overflow-hidden shadow-elev-sm" id="client-activity-log">
      <div className="px-6 py-4 border-b">
        <div className="font-semibold flex items-center gap-2">
          <History className="size-4" /> Activity log
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            {filtered.length} event{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Complete audit trail — lead history, profile, stages, documents, tasks, payments, and team changes.
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {FILTER_GROUPS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider font-semibold transition",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto min-w-[180px]">
            <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>
      </div>
      <div className="divide-y max-h-[560px] overflow-y-auto">
        {filtered.length === 0 && !loading && (
          <div className="p-6 text-sm text-muted-foreground text-center">No activity matches your filters.</div>
        )}
        {filtered.map((row) => {
          const actorName = row.actor_id ? (names[row.actor_id] ?? "…") : "System";
          const actionLabel = row.summary?.trim() || formatActivityAction(row.action);
          return (
            <div key={row.id} className="px-6 py-4 space-y-2">
              <div className="text-[11px] text-muted-foreground">{formatLogDate(row.created_at)}</div>
              <div className="text-sm font-medium">{actorName}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {roleLabel(row.actor_role)}
              </div>
              <div className="text-sm font-semibold text-foreground">{actionLabel}</div>
              {(row.previous_value || row.new_value) && (
                <div className="grid sm:grid-cols-2 gap-3 mt-2 text-xs">
                  {row.previous_value && (
                    <div className="rounded-md border bg-muted/30 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                        Previous
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-foreground/90">{row.previous_value}</pre>
                    </div>
                  )}
                  {row.new_value && (
                    <div className="rounded-md border bg-primary/5 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                        New
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-foreground/90">{row.new_value}</pre>
                    </div>
                  )}
                </div>
              )}
              {row.lead_id && (
                <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300">
                  Lead history
                </span>
              )}
            </div>
          );
        })}
        {hasMore && (
          <div className="p-3 text-center">
            <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + PAGE_SIZE)} disabled={loading}>
              <ChevronDown className="size-3.5 mr-1" /> Load more
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
