import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, School, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { UpiInstitution } from "../types/upi";

export default function InstitutionsListPage() {
  const [items, setItems] = useState<UpiInstitution[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "partners" | "active" | "inactive">("all");
  const [stats, setStats] = useState({ total: 0, partners: 0, courses: 0, pending: 0 });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");

  const load = async () => {
    const { data } = await supabase.from("upi_institutions").select("*").order("name");
    setItems((data ?? []) as UpiInstitution[]);
    const [t, p, c, pr] = await Promise.all([
      supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_partner", true),
      supabase.from("upi_courses_staging").select("*", { count: "exact", head: true }).eq("review_status", "published"),
      supabase.from("upi_courses_staging").select("*", { count: "exact", head: true }).eq("review_status", "pending_review"),
    ]);
    setStats({ total: t.count ?? 0, partners: p.count ?? 0, courses: c.count ?? 0, pending: pr.count ?? 0 });
  };
  useEffect(() => { load(); }, []);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total institutions", value: stats.total },
            { label: "Partner institutions", value: stats.partners },
            { label: "Courses published", value: stats.courses },
            { label: "Pending review", value: stats.pending },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</div>
              <div className="text-2xl font-bold mt-1 tabular-nums">{s.value}</div>
            </Card>
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
          <Dialog open={open} onOpenChange={setOpen}>
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
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <Link key={i.id} to={`/institutions/${i.id}`}>
              <Card className="p-5 hover:shadow-elev-md transition-shadow h-full">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <School className="size-5 text-primary" />
                  </div>
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
          {filtered.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground py-12">No institutions yet.</div>}
        </div>
      </div>
    </AppLayout>
  );
}