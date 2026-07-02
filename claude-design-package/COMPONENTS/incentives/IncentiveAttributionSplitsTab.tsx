import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

interface Props {
  profiles: { id: string; full_name: string }[];
}

export function IncentiveAttributionSplitsTab({ profiles }: Props) {
  const { toast } = useToast();
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [counselorA, setCounselorA] = useState("");
  const [counselorB, setCounselorB] = useState("");
  const [shareA, setShareA] = useState("50");
  const [shareB, setShareB] = useState("50");
  const [notes, setNotes] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? id;

  async function searchClient() {
    const q = clientQuery.trim();
    if (q.length < 2) {
      toast({ title: "Enter at least 2 characters", variant: "destructive" });
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) {
        toast({ title: "No clients found" });
        return;
      }
      const pick = rows[0] as { id: string; full_name: string | null; email: string | null };
      setClientId(pick.id);
      setClientLabel(`${pick.full_name ?? "Client"} · ${pick.email ?? pick.id.slice(0, 8)}`);
      toast({ title: "Client selected", description: pick.full_name ?? pick.id });
    } catch (e: unknown) {
      toast({ title: "Search failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  async function saveSplit() {
    if (!clientId) {
      toast({ title: "Select a client first", variant: "destructive" });
      return;
    }
    if (!counselorA || !counselorB || counselorA === counselorB) {
      toast({ title: "Pick two different counselors", variant: "destructive" });
      return;
    }
    const pctA = Number(shareA);
    const pctB = Number(shareB);
    if (!pctA || !pctB || pctA + pctB !== 100) {
      toast({ title: "Shares must sum to 100%", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("fn_set_client_attribution_splits", {
        _client_id: clientId,
        _counselor_ids: [counselorA, counselorB],
        _share_pcts: [pctA, pctB],
        _notes: notes.trim() || null,
      });
      if (error) throw error;
      toast({
        title: "Split saved",
        description: `${nameOf(counselorA)} ${pctA}% / ${nameOf(counselorB)} ${pctB}%`,
      });
    } catch (e: unknown) {
      toast({ title: "Save failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function clearSplit() {
    if (!clientId) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("fn_clear_client_attribution_splits", { _client_id: clientId });
      if (error) throw error;
      toast({ title: "Split cleared — closer-wins attribution restored" });
    } catch (e: unknown) {
      toast({ title: "Clear failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Attribution splits (I4)</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Override closer-wins with an explicit revenue split (e.g. 50/50 handoff). Applies on the next incentive calculate run.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Find client</label>
          <div className="flex gap-2 mt-1">
            <Input value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} placeholder="Name or email" />
            <Button variant="outline" onClick={searchClient} disabled={searching}>
              {searching ? "…" : "Search"}
            </Button>
          </div>
          {clientLabel && <p className="text-xs text-muted-foreground mt-1">Selected: {clientLabel}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Counselor A</label>
          <select className={sel} value={counselorA} onChange={(e) => setCounselorA(e.target.value)}>
            <option value="">—</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Share A %</label>
          <Input className="mt-1" value={shareA} onChange={(e) => setShareA(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Counselor B</label>
          <select className={sel} value={counselorB} onChange={(e) => setCounselorB(e.target.value)}>
            <option value="">—</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Share B %</label>
          <Input className="mt-1" value={shareB} onChange={(e) => setShareB(e.target.value)} />
        </div>
        <div className="md:col-span-4">
          <label className="text-xs text-muted-foreground">Notes (optional)</label>
          <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Handoff reason" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={saveSplit} disabled={saving}>{saving ? "Saving…" : "Save 50/50 split"}</Button>
        <Button variant="outline" onClick={clearSplit} disabled={saving || !clientId}>Clear split</Button>
      </div>
    </Card>
  );
}
