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
import type { UpiInstitution } from "../types/upi";
import { useModulePermission } from "@/hooks/useModulePermission";
import { InstitutionLogo } from "../components/InstitutionLogo";

export default function InstitutionsListPage() {
  const navigate = useNavigate();
  const { canEdit } = useModulePermission("institutions");
  const [items, setItems] = useState<UpiInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "partners" | "active" | "inactive">("all");
  const [stats, setStats] = useState({ total: 0, partners: 0, courses: 0, pending: 0 });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [fetchingLogos, setFetchingLogos] = useState(false);

  const missingLogoCount = items.filter((i) => !i.logo_url && i.website_url?.trim()).length;

  const load = async () => {
    setLoading(true);
    setListError(null);
    const { data, error } = await supabase.from("upi_institutions").select("*").order("name");
    if (error) {
      setListError(error.message);
      toast.error(error.message);
      setItems([]);
    } else {
      setItems((data ?? []) as UpiInstitution[]);
    }
    const [t, p, c, pr] = await Promise.all([
      supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_partner", true),
      supabase.from("upi_courses_staging").select("*", { count: "exact", head: true }).eq("review_status", "published"),
      supabase.from("upi_courses_staging").select("*", { count: "exact", head: true }).eq("review_status", "pending_review"),
    ]);
    const statsError = [t, p, c, pr].find((r) => r.error)?.error;
    if (statsError) toast.error(statsError.message);
    else setStats({ total: t.count ?? 0, partners: p.count ?? 0, courses: c.count ?? 0, pending: pr.count ?? 0 });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fetchMissingLogos = async () => {
    if (!canEdit || fetchingLogos) return;
    setFetchingLogos(true);
    const t = toast.loading("Fetching missing logos…");
    try {
      const resp = await fetchMissingInstitutionLogos();
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
    const { error } = await supabase.from("upi_institutions").insert({
      name: name.trim(), country_name: country.trim() || null, website_url: website.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Institution created");
    setName(""); setCountry(""); setWebsite(""); setOpen(false); load();
  };

  const filtered = items.filter((i) => {
    if (filter === "partners" && !i.is_partner) return false;
    if (filter === "active" && !i.is_active) return false;
    if (filter === "inactive" && i.is_active) return false;
    if (q && !`${i.name} ${i.country_name ?? ""} ${i.institution_type ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

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
          <Input className="max-w-sm" placeholder="Search by name, country, type…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex gap-1">
            {(["all","partners","active","inactive"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
            ))}
          </div>
          <div className="flex-1" />
          {canEdit && missingLogoCount > 0 && (
            <Button size="sm" variant="outline" disabled={fetchingLogos} onClick={fetchMissingLogos}>
              {fetchingLogos ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
              Fetch missing logos ({missingLogoCount})
            </Button>
          )}
          {canEdit && <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4" /> Add institution</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add institution</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
                <Input placeholder="Website URL" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <Link key={i.id} to={`/institutions/${i.id}`}>
              <Card className="p-5 hover:shadow-elev-md transition-shadow h-full">
                <div className="flex items-start gap-3">
                  <InstitutionLogo url={i.logo_url} name={i.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{i.country_name ?? "—"} · {i.institution_type ?? "—"}</div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {i.is_partner && <Badge variant="default" className="text-[10px]">Partner</Badge>}
                      {!i.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                      {i.website_url && <Badge variant="outline" className="text-[10px] gap-1"><Globe className="size-3" /> Web</Badge>}
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
            <div className="col-span-full text-center text-sm text-muted-foreground py-12">No institutions yet.</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}