import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = ["healthcare", "stem", "trades", "transport", "agriculture", "education"];

type Occ = {
  noc_code: string; title: string; teer: number; broad_category: string | null;
  keywords: string[]; is_active: boolean; notes: string | null;
  categories?: string[];
};
type Rule = any;
type PT = any;

export default function NocAdmin() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader title="NOC management" description="Admin only" />
        <div className="p-8"><Card className="p-12 text-center text-sm text-muted-foreground">Only administrators can manage the NOC database.</Card></div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <PageHeader
        title="NOC 2021 management"
        description="Maintain occupations, IRCC category-based-draw mappings, pathway eligibility rules, and provincial PNP targets."
      />
      <div className="p-8">
        <Tabs defaultValue="occupations">
          <TabsList>
            <TabsTrigger value="occupations">Occupations</TabsTrigger>
            <TabsTrigger value="rules">Pathway rules</TabsTrigger>
            <TabsTrigger value="provincial">Provincial targets</TabsTrigger>
          </TabsList>
          <TabsContent value="occupations"><OccupationsTab /></TabsContent>
          <TabsContent value="rules"><RulesTab /></TabsContent>
          <TabsContent value="provincial"><ProvincialTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/* ---------- Occupations ---------- */
function OccupationsTab() {
  const [rows, setRows] = useState<Occ[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Occ | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    let qry = supabase.from("noc_occupations").select("*").order("teer").order("title").limit(500);
    if (q.trim()) qry = qry.or(`title.ilike.%${q}%,noc_code.ilike.%${q}%`);
    const { data } = await qry;
    const codes = (data ?? []).map((r: any) => r.noc_code);
    const cats = codes.length
      ? (await supabase.from("noc_category_mappings").select("noc_code, category").in("noc_code", codes)).data ?? []
      : [];
    const byCode = new Map<string, string[]>();
    for (const c of cats) {
      const arr = byCode.get(c.noc_code) ?? [];
      arr.push(c.category); byCode.set(c.noc_code, arr);
    }
    setRows((data ?? []).map((r: any) => ({ ...r, categories: byCode.get(r.noc_code) ?? [] })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (r: Occ) => {
    if (!confirm(`Delete NOC ${r.noc_code} — ${r.title}?`)) return;
    const { error } = await supabase.from("noc_occupations").delete().eq("noc_code", r.noc_code);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };
  const onToggle = async (r: Occ) => {
    await supabase.from("noc_occupations").update({ is_active: !r.is_active }).eq("noc_code", r.noc_code);
    load();
  };

  return (
    <Card className="mt-4">
      <div className="flex items-center gap-2 p-3 border-b">
        <Input placeholder="Search by title or NOC code…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} className="max-w-md" />
        <Button onClick={load} variant="outline" size="sm">Search</Button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4 mr-1.5" /> Add occupation</Button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-3 py-2">NOC</th><th className="text-left px-3 py-2">Title</th><th className="text-left px-3 py-2">TEER</th><th className="text-left px-3 py-2">Categories</th><th className="text-left px-3 py-2">Active</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground"><Loader2 className="size-4 animate-spin inline" /></td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No occupations.</td></tr>}
            {rows.map((r) => (
              <tr key={r.noc_code} className="border-b hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{r.noc_code}</td>
                <td className="px-3 py-2 font-medium">{r.title}<div className="text-xs text-muted-foreground">{r.broad_category}</div></td>
                <td className="px-3 py-2">{r.teer}</td>
                <td className="px-3 py-2 text-xs">{(r.categories ?? []).join(", ") || <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2"><Switch checked={r.is_active} onCheckedChange={() => onToggle(r)} /></td>
                <td className="px-3 py-2 text-right">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onDelete(r)}><Trash2 className="size-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OccDialog open={open} onOpenChange={setOpen} item={editing} onSaved={load} />
    </Card>
  );
}

function OccDialog({ open, onOpenChange, item, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; item: Occ | null; onSaved: () => void }) {
  const [code, setCode] = useState(""); const [title, setTitle] = useState(""); const [teer, setTeer] = useState(1);
  const [broad, setBroad] = useState(""); const [keywords, setKeywords] = useState(""); const [cats, setCats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setCode(item?.noc_code ?? ""); setTitle(item?.title ?? ""); setTeer(item?.teer ?? 1);
      setBroad(item?.broad_category ?? ""); setKeywords((item?.keywords ?? []).join(", "));
      setCats(item?.categories ?? []);
    }
  }, [open, item]);
  const save = async () => {
    if (!code.trim() || !title.trim()) { toast.error("NOC code and title required"); return; }
    setBusy(true);
    try {
      const payload = {
        noc_code: code.trim(), title: title.trim(), teer, broad_category: broad.trim() || null,
        keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const op = item
        ? supabase.from("noc_occupations").update(payload).eq("noc_code", item.noc_code)
        : supabase.from("noc_occupations").insert(payload as any);
      const { error } = await op; if (error) throw error;
      await supabase.from("noc_category_mappings").delete().eq("noc_code", payload.noc_code);
      if (cats.length) {
        await supabase.from("noc_category_mappings").insert(cats.map((c) => ({ noc_code: payload.noc_code, category: c })));
      }
      toast.success("Saved"); onOpenChange(false); onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{item ? "Edit occupation" : "Add occupation"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>NOC code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} disabled={!!item} placeholder="21231" /></div>
            <div><Label>TEER *</Label>
              <select className="w-full border rounded-md h-9 px-2 text-sm" value={teer} onChange={(e) => setTeer(Number(e.target.value))}>
                {[0,1,2,3,4,5].map((t) => <option key={t} value={t}>TEER {t}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Broad category</Label><Input value={broad} onChange={(e) => setBroad(e.target.value)} placeholder="Natural and applied sciences" /></div>
          <div><Label>Keywords (comma separated)</Label><Textarea rows={2} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="software engineer, SDE, backend" /></div>
          <div>
            <Label>IRCC categories</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CATEGORIES.map((c) => {
                const on = cats.includes(c);
                return <button type="button" key={c} onClick={() => setCats((a) => on ? a.filter((x) => x !== c) : [...a, c])}
                  className={`text-xs px-2.5 py-1 rounded-full border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>{c}</button>;
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Pathway rules ---------- */
function RulesTab() {
  const [rows, setRows] = useState<Rule[]>([]);
  const load = async () => {
    const { data } = await supabase.from("pathway_rules").select("*").order("sort_order");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("pathway_rules").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  return (
    <Card className="mt-4 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2">Pathway</th><th className="text-left px-3 py-2">Allowed TEERs</th>
            <th className="text-left px-3 py-2">Foreign yrs</th><th className="text-left px-3 py-2">Canadian yrs</th>
            <th className="text-left px-3 py-2">Min CLB</th><th className="text-left px-3 py-2">Job offer</th>
            <th className="text-left px-3 py-2">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="px-3 py-2 font-medium">{r.label}<div className="text-xs text-muted-foreground">{r.pathway}</div></td>
              <td className="px-3 py-2"><Input className="h-8 w-32" defaultValue={(r.allowed_teers ?? []).join(",")} onBlur={(e) => update(r.id, { allowed_teers: e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n)) })} /></td>
              <td className="px-3 py-2"><Input type="number" className="h-8 w-20" defaultValue={r.min_foreign_experience_years ?? ""} onBlur={(e) => update(r.id, { min_foreign_experience_years: e.target.value === "" ? null : Number(e.target.value) })} /></td>
              <td className="px-3 py-2"><Input type="number" className="h-8 w-20" defaultValue={r.min_canadian_experience_years ?? ""} onBlur={(e) => update(r.id, { min_canadian_experience_years: e.target.value === "" ? null : Number(e.target.value) })} /></td>
              <td className="px-3 py-2"><Input type="number" className="h-8 w-20" defaultValue={r.min_clb ?? ""} onBlur={(e) => update(r.id, { min_clb: e.target.value === "" ? null : Number(e.target.value) })} /></td>
              <td className="px-3 py-2"><Switch checked={r.requires_job_offer} onCheckedChange={(v) => update(r.id, { requires_job_offer: v })} /></td>
              <td className="px-3 py-2"><Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ---------- Provincial targets ---------- */
function ProvincialTab() {
  const [rows, setRows] = useState<PT[]>([]);
  const [form, setForm] = useState({ province_code: "", province_name: "", stream_name: "", noc_code: "", teer: "", category: "", notes: "" });
  const load = async () => {
    const { data } = await supabase.from("provincial_noc_targets").select("*").order("province_code").order("stream_name");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!form.province_code || !form.province_name || !form.stream_name) { toast.error("Province + stream required"); return; }
    const payload: any = {
      province_code: form.province_code.trim().toUpperCase(),
      province_name: form.province_name.trim(),
      stream_name: form.stream_name.trim(),
      noc_code: form.noc_code.trim() || null,
      teer: form.teer === "" ? null : Number(form.teer),
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error } = await supabase.from("provincial_noc_targets").insert(payload);
    if (error) toast.error(error.message); else { setForm({ province_code: "", province_name: "", stream_name: "", noc_code: "", teer: "", category: "", notes: "" }); load(); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete this stream target?")) return;
    await supabase.from("provincial_noc_targets").delete().eq("id", id); load();
  };
  return (
    <Card className="mt-4">
      <div className="p-3 grid grid-cols-2 md:grid-cols-7 gap-2 border-b">
        <Input placeholder="Code (ON)" value={form.province_code} onChange={(e) => setForm({ ...form, province_code: e.target.value })} />
        <Input placeholder="Province" value={form.province_name} onChange={(e) => setForm({ ...form, province_name: e.target.value })} />
        <Input placeholder="Stream name" value={form.stream_name} onChange={(e) => setForm({ ...form, stream_name: e.target.value })} className="md:col-span-2" />
        <Input placeholder="NOC (opt)" value={form.noc_code} onChange={(e) => setForm({ ...form, noc_code: e.target.value })} />
        <Input placeholder="TEER" value={form.teer} onChange={(e) => setForm({ ...form, teer: e.target.value })} />
        <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <div className="md:col-span-7 flex gap-2">
          <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={add}><Plus className="size-4 mr-1.5" /> Add</Button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-3 py-2">Prov</th><th className="text-left px-3 py-2">Stream</th><th className="text-left px-3 py-2">NOC</th><th className="text-left px-3 py-2">TEER</th><th className="text-left px-3 py-2">Cat</th><th className="text-left px-3 py-2">Notes</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-3 py-2 font-mono text-xs">{r.province_code}</td>
                <td className="px-3 py-2">{r.stream_name}<div className="text-xs text-muted-foreground">{r.province_name}</div></td>
                <td className="px-3 py-2 font-mono text-xs">{r.noc_code ?? "—"}</td>
                <td className="px-3 py-2">{r.teer ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.category ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.notes ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => del(r.id)}><Trash2 className="size-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}