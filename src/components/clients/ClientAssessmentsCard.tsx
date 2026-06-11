import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ExternalLink, Loader2 } from "lucide-react";
import { assessmentRunPath } from "@/lib/service-eligibility/settleAbroadBridge";
import { formatDistanceToNow } from "date-fns";

type SessionRow = {
  id: string;
  status: string | null;
  assessment_kind: string | null;
  country: string | null;
  goal: string | null;
  library_id: string | null;
  submitted_at: string | null;
  updated_at: string | null;
  created_at: string;
};

export function ClientAssessmentsCard({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assessment_sessions")
      .select("id, status, assessment_kind, country, goal, library_id, submitted_at, updated_at, created_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(20);
    setRows((data ?? []) as SessionRow[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card className="p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading assessments…
      </Card>
    );
  }

  if (!rows.length) return null;

  const runHref = (row: SessionRow) => {
    if (row.assessment_kind === "settle_abroad" && row.library_id) {
      return assessmentRunPath(row.id, row.library_id);
    }
    return `/eligibility/run/${row.id}`;
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b flex items-center gap-2">
        <ClipboardCheck className="size-4 text-primary" />
        <div>
          <div className="font-semibold">Eligibility assessments</div>
          <div className="text-xs text-muted-foreground">{rows.length} session{rows.length === 1 ? "" : "s"}</div>
        </div>
      </div>
      <div className="divide-y">
        {rows.map((row) => (
          <div key={row.id} className="px-6 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {row.country ?? "Assessment"}
                {row.goal ? ` · ${row.goal.replace(/_/g, " ")}` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {row.assessment_kind?.replace(/_/g, " ") ?? "session"} ·{" "}
                {formatDistanceToNow(new Date(row.updated_at ?? row.created_at), { addSuffix: true })}
              </div>
            </div>
            <Badge variant={row.status === "submitted" ? "default" : "secondary"}>{row.status ?? "draft"}</Badge>
            <Button size="sm" variant="outline" className="h-7" asChild>
              <Link to={runHref(row)}>
                <ExternalLink className="size-3.5 mr-1" />
                Open
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
