import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";

type Sugg = any;

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

export default function AiSuggestionsPage() {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState<Sugg[]>([]);
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    let q = supabase.from("upi_ai_suggestions").select("*").order("created_at", { ascending: false }).limit(500);
    if (tab !== "all") q = q.eq("status", tab);
    const { data } = await q;
    setItems((data ?? []) as Sugg[]);
    setSelected(new Set());
  };
  useEffect(() => {
    supabase.from("upi_institutions").select("id,name").then(({ data }) => setInstitutions((data ?? []) as any));
  }, []);
  useEffect(() => { load(); }, [tab]);

  const instName = useMemo(() => {
    const m = new Map(institutions.map((i) => [i.id, i.name]));
    return (id: string | null) => (id ? m.get(id) ?? "Unknown" : "Global");
  }, [institutions]);

  const setStatus = async (ids: string[], status: string) => {
    if (!ids.length) return;
    const { error } = await supabase.from("upi_ai_suggestions").update({ status } as any).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} → ${status}`);
    load();
  };

  const grouped = useMemo(() => {
    const g = new Map<string, Sugg[]>();
    for (const it of items) {
      const key = it.institution_id ?? "__global__";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(it);
    }
    return Array.from(g.entries());
  }, [items]);

  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const selIds = Array.from(selected);

  return (
    <AppLayout>
      <PageHeader title="AI Suggestions" description="Cross-institution AI insights awaiting your review." />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>{STATUS_TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}</TabsList>
          </Tabs>
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Badge variant="secondary">{selected.size} selected</Badge>
              <Button size="sm" onClick={() => setStatus(selIds, "accepted")}><Check className="size-4 mr-1" /> Accept</Button>
              <Button size="sm" variant="destructive" onClick={() => setStatus(selIds, "dismissed")}><X className="size-4 mr-1" /> Dismiss</Button>
            </div>
          )}
        </div>

        {grouped.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No suggestions in this view.</Card>
        )}

        {grouped.map(([instId, list]) => (
          <Card key={instId} className="p-4 space-y-3">
            <div className="font-semibold text-sm flex items-center gap-2">
              {instName(instId === "__global__" ? null : instId)}
              <Badge variant="outline">{list.length}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {list.map((s) => (
                <Card key={s.id} className="p-4 space-y-2 border-l-4 border-l-primary/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                      <Badge variant="secondary">{s.suggestion_type}</Badge>
                      <Badge variant="outline">{Math.round((s.confidence ?? 0))}%</Badge>
                      <Badge>{s.status}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="font-medium">{s.title ?? "(untitled)"}</div>
                  {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                  {s.suggestion_data && Object.keys(s.suggestion_data).length > 0 && (
                    <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-40">{JSON.stringify(s.suggestion_data, null, 2)}</pre>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="default" onClick={() => setStatus([s.id], "accepted")}><Check className="size-3 mr-1" /> Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus([s.id], "dismissed")}><X className="size-3 mr-1" /> Dismiss</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus([s.id], "deferred")}><Clock className="size-3 mr-1" /> Defer</Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}