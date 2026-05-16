import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSuggestions } from "../hooks/useInstitutionData";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ALLOW_TEST_DELETIONS } from "../config";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const SEV_VARIANT = {
  critical: "destructive" as const,
  warning: "default" as const,
  info: "secondary" as const,
};

export function AiSuggestionsPanel({ institutionId }: { institutionId: string }) {
  const { data: suggestions, loading, reload } = useSuggestions(institutionId);
  const [busy, setBusy] = useState<string | null>(null);

  const updateStatus = async (id: string, status: "accepted" | "dismissed" | "deferred") => {
    setBusy(id);
    if (!id.startsWith("sug-")) {
      await supabase.from("upi_ai_suggestions").update({ status, reviewed_at: new Date().toISOString() } as any).eq("id", id);
    }
    setBusy(null);
    reload();
  };

  const deleteSuggestion = async (id: string, title: string) => {
    if (!confirm(`Delete suggestion "${title}"?`)) return;
    if (!id.startsWith("sug-")) {
      const { error } = await supabase.from("upi_ai_suggestions").delete().eq("id", id);
      if (error) return toast.error(error.message);
    }
    toast.success("Suggestion deleted");
    reload();
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading suggestions…</div>;
  if (suggestions.length === 0)
    return <Card className="p-8 text-center text-sm text-muted-foreground">No suggestions yet.</Card>;

  return (
    <div className="space-y-2">
      {suggestions.map((s: any) => {
        const sev = (s.severity ?? "info") as keyof typeof SEV_VARIANT;
        return (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={SEV_VARIANT[sev] ?? "secondary"}>{sev}</Badge>
                  <Badge variant="outline">{s.suggestion_type}</Badge>
                  {typeof s.confidence === "number" && (
                    <span className="text-xs text-muted-foreground">{s.confidence}% confidence</span>
                  )}
                </div>
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.description}</div>
                {s.affected_record && <div className="text-[10px] text-muted-foreground mt-1">Ref: {s.affected_record}</div>}
              </div>
              {s.status === "pending" ? (
                <div className="flex gap-1">
                  <Button size="sm" disabled={busy === s.id} onClick={() => updateStatus(s.id, "accepted")}>Accept</Button>
                  <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => updateStatus(s.id, "deferred")}>Defer</Button>
                  <Button size="sm" variant="ghost" disabled={busy === s.id} onClick={() => updateStatus(s.id, "dismissed")}>Dismiss</Button>
                </div>
              ) : (
                <Badge variant="secondary">{s.status}</Badge>
              )}
              {ALLOW_TEST_DELETIONS && (
                <Button size="sm" variant="ghost" onClick={() => deleteSuggestion(s.id, s.title)} className="text-destructive hover:text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}