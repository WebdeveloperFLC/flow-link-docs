import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  ArrowUpRight,
  Globe2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLIENT_FILE_NUMBER_LABEL } from "@/lib/clientIdentifiers";
import { useMasterItems } from "@/lib/masters";
import { resolveClientStatusLabel } from "@/lib/clientStatus";
import { toast } from "sonner";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

interface Client {
  id: string;
  full_name: string;
  application_id: string;
  registration_number?: string | null;
  country: string;
  application_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  email: string | null;
  phone: string | null;
}

const PAGE_SIZE = 25;
const ALL = "__all__";
type SortKey = "created_at" | "updated_at" | "full_name";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatAppType(raw: string | null | undefined, names: Record<string, string>): string {
  const value = (raw ?? "").trim();
  if (!value) return "—";
  const [head, tail] = value.split("::");
  if (UUID_RX.test(head)) {
    const name = names[head];
    if (name) return tail ? `${name} — ${tail}` : name;
    return tail || "—";
  }
  return value;
}

function downloadClientCsv(rows: Client[], serviceNames: Record<string, string>) {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Name", "File #", "Email", "Phone", "Country", "Status", "Application type"].join(",");
  const lines = rows.map((c) =>
    [
      esc(c.full_name),
      esc(c.application_id),
      esc(c.email ?? ""),
      esc(c.phone ?? ""),
      esc(c.country),
      esc(c.status),
      esc(formatAppType(c.application_type, serviceNames)),
    ].join(","),
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clients-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const Clients = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const sort = (params.get("sort") as SortKey) || "created_at";
  const dir = (params.get("dir") as "asc" | "desc") || "desc";
  const statusFilter = params.get("status") ?? ALL;
  const countryFilter = params.get("country") ?? ALL;

  const statusOptions = useMasterItems("client_statuses");

  const [clients, setClients] = useState<Client[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("clients")
      .select("country")
      .not("country", "is", null)
      .limit(500)
      .then(({ data }) => {
        const list = Array.from(
          new Set((data ?? []).map((r) => String((r as { country: string }).country).trim()).filter(Boolean)),
        ).sort();
        setCountries(list);
      });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchInput.trim()) next.set("q", searchInput.trim());
      else next.delete("q");
      next.set("page", "1");
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("clients")
      .select(
        "id,full_name,application_id,registration_number,country,application_type,status,created_at,updated_at,email,phone",
        { count: "exact" },
      )
      .order(sort, { ascending: dir === "asc" })
      .range(from, to);
    if (q) {
      const term = q.replace(/[%,()]/g, " ").trim();
      query = query.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,application_id.ilike.%${term}%,registration_number.ilike.%${term}%`,
      );
    }
    if (statusFilter !== ALL) query = query.eq("status", statusFilter);
    if (countryFilter !== ALL) query = query.eq("country", countryFilter);

    const { data, count } = await query;
    setClients((data ?? []) as Client[]);
    setTotal(count ?? 0);
    setLoading(false);
    setSelected(new Set());

    const ids = Array.from(
      new Set(
        (data ?? [])
          .map((r) => String((r as { application_type?: string }).application_type ?? "").split("::")[0])
          .filter((id) => UUID_RX.test(id) && !(id in serviceNames)),
      ),
    );
    if (ids.length) {
      const { data: svc } = await supabase.from("service_library").select("id,service,sub_service").in("id", ids);
      if (svc) {
        setServiceNames((prev) => {
          const next = { ...prev };
          for (const s of svc as { id: string; service: string; sub_service: string }[]) {
            next[s.id] = s.service;
          }
          return next;
        });
      }
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, sort, dir, statusFilter, countryFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setParams(next, { replace: true });
  };

  const pageIds = useMemo(() => clients.map((c) => c.id), [clients]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allPageSelected) setSelected(new Set());
    else setSelected(new Set(pageIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRows = clients.filter((c) => selected.has(c.id));

  const exportSelected = () => {
    if (!selectedRows.length) {
      toast.error("Select at least one client");
      return;
    }
    downloadClientCsv(selectedRows, serviceNames);
    toast.success(`Exported ${selectedRows.length} client(s)`);
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || !selected.size) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from("clients").update({ status: bulkStatus }).in("id", ids);
      if (error) throw error;
      for (const id of ids) {
        await appendClientActivityLog({
          clientId: id,
          action: "client_status_changed",
          summary: "Bulk status update",
          newValue: resolveClientStatusLabel(bulkStatus, statusOptions),
          metadata: { status: bulkStatus, bulk: true },
        }).catch(() => {});
      }
      toast.success(`Updated status for ${ids.length} client(s)`);
      setBulkStatus("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Clients" description="Manage applicant profiles and their document workspaces." />
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search by name, email, phone, ${CLIENT_FILE_NUMBER_LABEL}…`}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setParam("status", v)}>
            <SelectTrigger className="w-[180px]" aria-label="Filter by status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={(v) => setParam("country", v)}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by country">
              <SelectValue placeholder="Filter by country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created date</SelectItem>
              <SelectItem value="updated_at">Updated date</SelectItem>
              <SelectItem value="full_name">Name</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dir} onValueChange={(v) => setParam("dir", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <Card className="px-4 py-3 flex flex-wrap items-center gap-3 border-primary/30 bg-primary/5">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-[200px] h-8" aria-label="Set status for selected clients">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="secondary" disabled={!bulkStatus || bulkBusy} onClick={() => void applyBulkStatus()}>
              Apply to selected
            </Button>
            <Button size="sm" variant="outline" onClick={exportSelected} aria-label="Export selected clients as CSV">
              <Download className="size-3.5 mr-1" aria-hidden="true" /> Export CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              Clear
            </Button>
          </Card>
        )}

        <Card className="overflow-hidden shadow-elev-sm">
          <div className="grid grid-cols-12 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
            <div className="col-span-1 flex items-center">
              <Checkbox checked={allPageSelected} onCheckedChange={toggleAll} aria-label="Select all clients on this page" />
            </div>
            <div className="col-span-3">Client</div>
            <div className="col-span-2">{CLIENT_FILE_NUMBER_LABEL}</div>
            <div className="col-span-2">Country</div>
            <div className="col-span-3">Application Type</div>
            <div className="col-span-1 text-right">Open</div>
          </div>
          <div className="divide-y">
            {loading && clients.length === 0 && (
              <div className="divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 px-6 py-3.5 items-center animate-pulse">
                    <div className="col-span-1" />
                    <div className="col-span-3">
                      <div className="h-4 w-40 bg-muted rounded" />
                    </div>
                    <div className="col-span-2">
                      <div className="h-4 w-20 bg-muted rounded" />
                    </div>
                    <div className="col-span-2">
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                    <div className="col-span-3">
                      <div className="h-4 w-32 bg-muted rounded" />
                    </div>
                    <div className="col-span-1" />
                  </div>
                ))}
              </div>
            )}
            {!loading && clients.length === 0 && (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                {q || statusFilter !== ALL || countryFilter !== ALL
                  ? "No matches for your filters."
                  : "No clients yet. Register clients from Warm, Hot, or Cold leads."}
              </div>
            )}
            {clients.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-accent/40 transition-colors group"
              >
                <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleOne(c.id)}
                    aria-label={`Select ${c.full_name}`}
                  />
                </div>
                <Link to={`/clients/${c.id}`} className="col-span-3 font-medium truncate">
                  {c.full_name}
                </Link>
                <Link to={`/clients/${c.id}`} className="col-span-2 text-sm font-mono text-primary truncate">
                  {c.application_id}
                </Link>
                <Link to={`/clients/${c.id}`} className="col-span-2 text-sm flex items-center gap-1.5 truncate">
                  <Globe2 className="size-3.5 text-muted-foreground shrink-0" />
                  {c.country}
                </Link>
                <Link to={`/clients/${c.id}`} className="col-span-3 text-sm text-muted-foreground truncate">
                  {formatAppType(c.application_type, serviceNames)}
                </Link>
                <div className="col-span-1 text-right">
                  <Link to={`/clients/${c.id}`} className="inline-flex" aria-label={`Open ${c.full_name}`}>
                    <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20 text-sm">
            <div className="text-muted-foreground">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
                </span>
              ) : total === 0 ? (
                "0 results"
              ) : (
                <>
                  Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(page * PAGE_SIZE, total)}</strong> of{" "}
                  <strong>{total}</strong>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setParam("page", String(page - 1))}>
                <ChevronLeft className="size-4" aria-hidden="true" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setParam("page", String(page + 1))}>
                Next <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Clients;
