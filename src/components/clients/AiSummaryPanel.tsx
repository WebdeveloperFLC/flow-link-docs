import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, Loader2, RefreshCw, Flame, Thermometer, Snowflake } from "lucide-react";
import { listSummaries, generateSummary, approveSummary, rejectSummary, subscribeSummaries, type AiSummary } from "@/lib/aiSummaries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const URGENCY_ICON = { hot: Flame, warm: Thermometer, cold: Snowflake } as const;

export function AiSummaryPanel({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<AiSummary[]>([]);
  const [generating, setGenerating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const refresh = async () => { try { setItems(await listSummaries(clientId)); } catch {} };
  useEffect(() => { refresh(); }, [clientId]);
  useEffect(() => subscribeSummaries(clientId, refresh), [clientId]);

  const onGenerate = async () => {
    setGenerating(true);
    try {
      await generateSummary({ clientId, scope: "client_overview" });
      toast.success("Summary generated");
      refresh();
    } catch (e) {
      const msg = String((e as Error).message ?? e);
      if (msg.includes("429")) toast.error("AI rate limit reached, try again shortly");
      else if (msg.includes("402")) toast.error("AI credits exhausted — please top up");
      else toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const approved = items.find((s) => s.status === "approved" || s.status === "edited");
  const suggested = items.filter((s) => s.status === "suggested");

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <div className="font-semibold">AI Summary</div>
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <RefreshCw className="size-3.5 mr-1" />}
            Generate
          </Button>
        </div>
      </div>

      {approved && (
        <div className="px-6 py-4 border-b bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Badge>Active</Badge>
            <span className="font-semibold text-sm">{approved.title}</span>
            <UrgencyChip u={approved.urgency} />
          </div>
          <div className="text-sm whitespace-pre-wrap">{approved.summary_md}</div>
          {approved.next_action && (
            <div className="mt-2 text-xs"><span className="font-semibold">Next:</span> {approved.next_action} {approved.follow_up_role && approved.follow_up_role !== "none" && <Badge variant="secondary" className="ml-1 text-[10px]">{approved.follow_up_role}</Badge>}</div>
          )}
        </div>
      )}

      <div className="divide-y max-h-[360px] overflow-y-auto">
        {items.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No summaries yet. Click Generate.</div>}
        {suggested.map((s) => (
          <div key={s.id} className="px-6 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">Suggested</Badge>
              <span className="font-medium text-sm">{s.title}</span>
              <UrgencyChip u={s.urgency} />
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" disabled={actionId === s.id} onClick={async () => { setActionId(s.id); try { await approveSummary(s.id); toast.success("Approved"); refresh(); } catch (e) { toast.error(String(e)); } finally { setActionId(null); } }}>
                  <Check className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" disabled={actionId === s.id} onClick={async () => { setActionId(s.id); try { await rejectSummary(s.id); refresh(); } catch (e) { toast.error(String(e)); } finally { setActionId(null); } }}>
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="text-sm mt-1 whitespace-pre-wrap">{s.summary_md}</div>
            {Array.isArray(s.key_points) && s.key_points.length > 0 && (
              <ul className="mt-2 text-xs list-disc pl-5 text-muted-foreground space-y-0.5">
                {s.key_points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
            {s.next_action && <div className="mt-2 text-xs"><span className="font-semibold">Next:</span> {s.next_action}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function UrgencyChip({ u }: { u: string | null }) {
  if (!u) return null;
  const Icon = URGENCY_ICON[u as keyof typeof URGENCY_ICON];
  if (!Icon) return null;
  const cls = u === "hot" ? "text-destructive" : u === "warm" ? "text-amber-600" : "text-sky-600";
  return <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", cls)}><Icon className="size-3" />{u}</span>;
}