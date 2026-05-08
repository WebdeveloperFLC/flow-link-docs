import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, ArrowUpRight, Globe2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Client {
  id: string;
  full_name: string;
  application_id: string;
  country: string;
  application_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  email: string | null;
  phone: string | null;
}

const PAGE_SIZE = 25;
type SortKey = "created_at" | "updated_at" | "full_name";

const Clients = () => {
  const { canCreateClient } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const sort = (params.get("sort") as SortKey) || "created_at";
  const dir = (params.get("dir") as "asc" | "desc") || "desc";

  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(q);

  // Debounce search input → URL
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchInput.trim()) next.set("q", searchInput.trim()); else next.delete("q");
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
      .select("id,full_name,application_id,country,application_type,status,created_at,updated_at,email,phone", { count: "exact" })
      .order(sort, { ascending: dir === "asc" })
      .range(from, to);
    if (q) {
      const term = q.replace(/[%,()]/g, " ").trim();
      // OR across name, email, phone, application id
      query = query.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,application_id.ilike.%${term}%`
      );
    }
    const { data, count } = await query;
    setClients((data ?? []) as Client[]);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, page, sort, dir]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setParams(next, { replace: true });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Clients"
        description="Manage applicant profiles and their document workspaces."
        actions={
          canCreateClient && (
            <Button onClick={() => setOpen(true)} className="gradient-brand text-primary-foreground">
              <Plus className="size-4 mr-1.5" /> New client
            </Button>
          )
        }
      />
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, phone, App ID…"
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created date</SelectItem>
              <SelectItem value="updated_at">Updated date</SelectItem>
              <SelectItem value="full_name">Name</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dir} onValueChange={(v) => setParam("dir", v)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden shadow-elev-sm">
          <div className="grid grid-cols-12 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
            <div className="col-span-4">Client</div>
            <div className="col-span-2">App ID</div>
            <div className="col-span-2">Country</div>
            <div className="col-span-3">Application Type</div>
            <div className="col-span-1 text-right">Open</div>
          </div>
          <div className="divide-y">
            {loading && clients.length === 0 && (
              <div className="divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 px-6 py-3.5 items-center animate-pulse">
                    <div className="col-span-4"><div className="h-4 w-40 bg-muted rounded" /></div>
                    <div className="col-span-2"><div className="h-4 w-20 bg-muted rounded" /></div>
                    <div className="col-span-2"><div className="h-4 w-16 bg-muted rounded" /></div>
                    <div className="col-span-3"><div className="h-4 w-32 bg-muted rounded" /></div>
                    <div className="col-span-1" />
                  </div>
                ))}
              </div>
            )}
            {!loading && clients.length === 0 && (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                {q ? "No matches." : "No clients yet."}
              </div>
            )}
            {clients.map((c) => (
              <Link key={c.id} to={`/clients/${c.id}`} className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-accent/40 transition-colors">
                <div className="col-span-4 font-medium">{c.full_name}</div>
                <div className="col-span-2 text-sm font-mono text-primary">{c.application_id}</div>
                <div className="col-span-2 text-sm flex items-center gap-1.5"><Globe2 className="size-3.5 text-muted-foreground" />{c.country}</div>
                <div className="col-span-3 text-sm text-muted-foreground">{c.application_type}</div>
                <div className="col-span-1 text-right"><ArrowUpRight className="size-4 inline text-muted-foreground" /></div>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20 text-sm">
            <div className="text-muted-foreground">
              {loading ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading…</span>
              ) : total === 0 ? (
                "0 results"
              ) : (
                <>Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(page * PAGE_SIZE, total)}</strong> of <strong>{total}</strong></>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setParam("page", String(page - 1))}>
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setParam("page", String(page + 1))}>
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <NewClientDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </AppLayout>
  );
};

export default Clients;