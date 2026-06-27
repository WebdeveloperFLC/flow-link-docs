import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, Sparkles, Loader2 } from "lucide-react";
import { fetchMissingInstitutionLogos } from "../lib/fetchInstitutionLogo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { InstitutionStatus, UpiInstitution } from "../types/upi";
import { useModulePermission } from "@/hooks/useModulePermission";
import { InstitutionLogo } from "../components/InstitutionLogo";
import { InstitutionStatusBadge } from "../components/InstitutionStatusBadge";
import { CountrySelect } from "@/components/leads/CountrySelect";
import { useInstitutionContactCountries } from "../lib/institutionContactCountries";
import { resolveInstitutionCountryFromLabel } from "../lib/institutionCountry";
import {
  PartnershipChannelBadges,
  type InstitutionRouteBadge,
} from "../components/PartnershipChannelBadges";
import { findDuplicateInstitution } from "../lib/institutionDedup";
import { ExportMenu } from "@/components/export/ExportMenu";
import { WorkspaceToolbar } from "@/components/workspace/WorkspaceToolbar";
import { useExportDataset } from "@/components/export/useExportDataset";
import { INSTITUTION_EXPORT_COLUMNS } from "../lib/institutionExportColumns";

const LIST_COLUMNS =
  "id,name,country_name,country_id,institution_type,institution_status,is_partner,is_active,website_url,logo_url,completeness_score,catalog_status" as const;

type ListFilter = "all" | "partners" | InstitutionStatus;

function supabaseErrMsg(error: { message?: string; details?: string; code?: string } | null): string {
  if (!error) return "Request failed";
  return error.message?.trim() || error.details?.trim() || error.code || "Request failed";
}

async function fetchCourseReviewStats(): Promise<{ courses: number; pending: number }> {
  const { data, error } = await supabase.rpc("upi_course_review_counts");
  if (!error && data && typeof data === "object") {
    const row = data as { published?: number; pending_review?: number };
    return { courses: row.published ?? 0, pending: row.pending_review ?? 0 };
  }

  const [publishedRes, pendingRes] = await Promise.all([
    supabase
      .from("upi_courses_staging")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "published"),
    supabase
      .from("upi_courses_staging")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "pending_review"),
  ]);

  return {
    courses: publishedRes.error ? 0 : (publishedRes.count ?? 0),
    pending: pendingRes.error ? 0 : (pendingRes.count ?? 0),
  };
}

const STATUS_FILTERS: ListFilter[] = ["all", "partners", "Draft", "Review", "Active", "Inactive", "Archived"];

export default function InstitutionsListPage() {
  const navigate = useNavigate();
  const { canEdit } = useModulePermission("institutions");
  const countries = useInstitutionContactCountries();
  const [items, setItems] = useState<UpiInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const [stats, setStats] = useState({ total: 0, partners: 0, courses: 0, pending: 0 });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [fetchingLogos, setFetchingLogos] = useState(false);
  const [routesByInst, setRoutesByInst] = useState<Map<string, InstitutionRouteBadge[]>>(new Map());

  const missingLogoCount = items.filter((i) => !i.logo_url && i.website_url?.trim()).length;

  const load = async () => {
    setLoading(true);
    setListError(null);

    const [{ data, error }, courseStats, routesRes] = await Promise.all([
      supabase.from("upi_institutions").select(LIST_COLUMNS).order("name"),
      fetchCourseReviewStats(),
      supabase
        .from("upi_partnership_routes")
        .select("id, institution_id, channel_type, status, upi_aggregators(name, short_code)")
        .in("status", ["active", "draft"]),
    ]);

    if (error) {
      const msg = supabaseErrMsg(error);
      setListError(msg);
      toast.error(msg);
      setItems([]);
      setRoutesByInst(new Map());
      setStats({ total: 0, partners: 0, courses: 0, pending: 0 });
    } else {
      const list = (data ?? []) as UpiInstitution[];
      const routeMap = new Map<string, InstitutionRouteBadge[]>();
      for (const row of routesRes.data ?? []) {
        const r = row as Record<string, unknown>;
        const instId = String(r.institution_id);
        const agg = r.upi_aggregators as InstitutionRouteBadge["aggregator"] | null;
        const { upi_aggregators: _, ...rest } = r;
        const route = { ...rest, aggregator: agg ?? null } as InstitutionRouteBadge;
        if (!routeMap.has(instId)) routeMap.set(instId, []);
        routeMap.get(instId)!.push(route);
      }
      setItems(list);
      setRoutesByInst(routeMap);
      setStats({
        total: list.length,
        partners: list.filter((i) => i.is_partner).length,
        courses: courseStats.courses,
        pending: courseStats.pending,
      });
    }

    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fetchMissingLogos = async () => {
    if (!canEdit || fetchingLogos) return;
    setFetchingLogos(true);
    const t = toast.loading("Fetching missing logos… 0%");
    try {
      const resp = await fetchMissingInstitutionLogos({
        onProgress: (done, total) => {
          toast.loading(`Fetching missing logos… ${Math.round((done / total) * 100)}%`, { id: t });
        },
      });
      toast.dismiss(t);
      const fetched = resp.fetched ?? 0;
      const failed = resp.failed ?? 0;
      if (fetched > 0) {
        toast.success(`Fetched ${fetched} logo${fetched === 1 ? "" : "s"} from institution websites`);
        load();
      } else if (failed > 0) {
        toast.warning(`No logos found for ${failed} institution${failed === 1 ? "" : "s"} — upload manually`);
      } else {
        toast.info("All institutions with websites already have logos");
      }
    } catch (e) {
      toast.dismiss(t);
      toast.error(e instanceof Error ? e.message : "Logo fetch failed");
    } finally {
      setFetchingLogos(false);
    }
  };

  const create = async () => {
    if (!name.trim()) return toast.error("Name required");
    if (!country.trim()) return toast.error("Country is required — same institution name can exist in different countries");
    const dup = findDuplicateInstitution(items, name.trim(), country.trim());
    if (dup) {
      toast.error(`Institution already exists: ${dup.name}`);
      navigate(`/institutions/${dup.id}`);
      return;
    }
    let countryPatch: { country_name: string; country_id: string | null };
    try {
      countryPatch = await resolveInstitutionCountryFromLabel(country.trim(), countries);
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Could not resolve country");
    }
    const { error } = await supabase.from("upi_institutions").insert({
      name: name.trim(),
      country_name: countryPatch.country_name,
      country_id: countryPatch.country_id,
      website_url: website.trim() || null,
      institution_status: "Draft",
    });
    if (error) {
      if (error.code === "23505") {
        return toast.error("An institution with this name and country already exists");
      }
      return toast.error(error.message);
    }
    toast.success("Institution created");
    setName("");
    setCountry("");
    setWebsite("");
    setOpen(false);
    load();
  };

  const filtered = items.filter((i) => {
    if (filter === "partners" && !i.is_partner) return false;
    if (filter !== "all" && filter !== "partners" && (i.institution_status ?? "Draft") !== filter) return false;
    if (q && !`${i.name} ${i.country_name ?? ""} ${i.institution_type ?? ""} ${i.institution_status ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const exportProps = useExportDataset({
    rows: filtered,
    getRowId: (r) => r.id,
    fetchAll: async () => items,
    columns: INSTITUTION_EXPORT_COLUMNS,
    filenameBase: "institutions",
    canExportAll: canEdit,
  });

  const filterLabel = (f: ListFilter) => {
    if (f === "all") return "All";
    if (f === "partners") return "Partners";
    return f;
  };

  return (
    <AppLayout>
      <PageHeader title="Institutions" description="Manage partner and prospect institutions" />
      <div className="p-8 space-y-6">
        {listError && (
          <Card className="p-4 border-destructive/50 bg-destructive/5 text-sm text-destructive">
            Could not load institutions: {listError}
          </Card>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total institutions", value: stats.total, onClick: () => setFilter("all") },
            { label: "Partner institutions", value: stats.partners, onClick: () => setFilter("partners") },
            { label: "Courses published", value: stats.courses, onClick: () => navigate("/institutions/review?status=published") },
            { label: "Pending review", value: stats.pending, onClick: () => navigate("/institutions/review?status=pending_review") },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={s.onClick}
              className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <Card className="p-4 cursor-pointer hover:shadow-elev-md hover:border-primary/50 transition-all h-full">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</div>
                <div className="text-2xl font-bold mt-1 tabular-nums">{s.value}</div>
              </Card>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input className="max-w-sm" placeholder="Search by name, country, type, status…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {filterLabel(f)}
              </Button>
            ))}
          </div>
          <WorkspaceToolbar className="flex-1 justify-end">
            <ExportMenu {...exportProps} disabled={loading} />
            {canEdit && missingLogoCount > 0 && (
              <Button size="sm" variant="outline" disabled={fetchingLogos} onClick={fetchMissingLogos}>
                {fetchingLogos ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
                Fetch missing logos ({missingLogoCount})
              </Button>
            )}
            {canEdit && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="size-4" /> Add institution
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add institution</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} />
                  <CountrySelect value={country} onChange={setCountry} placeholder="Country *" />
                  <Input placeholder="Website URL" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={create}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          </WorkspaceToolbar>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <Link key={i.id} to={`/institutions/${i.id}`}>
              <Card className="p-5 hover:shadow-elev-md transition-shadow h-full">
                <div className="flex items-start gap-3">
                  <InstitutionLogo url={i.logo_url} name={i.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {i.country_name ?? "—"} · {i.institution_type ?? "—"}
                    </div>
                    <PartnershipChannelBadges
                      routes={routesByInst.get(i.id) ?? []}
                      legacyDirectPartner={i.is_partner}
                    />
                    <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                      <InstitutionStatusBadge status={i.institution_status ?? "Draft"} />
                      <Badge variant="outline" className="text-[10px] tabular-nums">
                        {Math.round(Number(i.completeness_score ?? 0))}%
                      </Badge>
                      {i.website_url && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Globe className="size-3" /> Web
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {loading && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-12">Loading institutions…</div>
          )}
          {!loading && filtered.length === 0 && !listError && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-12">No institutions match this filter.</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
