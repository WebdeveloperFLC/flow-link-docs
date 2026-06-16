import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ExternalLink, Loader2, Plus } from "lucide-react";
import { assessmentRunPath } from "@/lib/service-eligibility/settleAbroadBridge";
import { startClientEligibilityAssessment } from "@/lib/service-eligibility/startClientAssessment";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

export function EligibilityAssessmentDialog({
  open,
  onOpenChange,
  clientId,
  libraryId,
  country,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  libraryId?: string | null;
  country?: string | null;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

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
    if (open) void load();
  }, [open, load]);

  const runHref = (row: SessionRow) => {
    if (row.assessment_kind === "settle_abroad" && row.library_id) {
      return assessmentRunPath(row.id, row.library_id);
    }
    return `/eligibility/run/${row.id}`;
  };

  const startNew = async () => {
    if (!libraryId) {
      toast.error("Assign or select a client service before starting a new assessment.");
      return;
    }
    setStarting(true);
    try {
      const { path } = await startClientEligibilityAssessment({ libraryId, clientId });
      onOpenChange(false);
      navigate(path);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not start assessment");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-primary" />
            Eligibility assessment
          </DialogTitle>
          <DialogDescription>
            Open an existing session to review or continue, or start a new assessment for this client.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading assessments…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <ClipboardCheck className="size-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No assessments yet for this client.
            </p>
          </div>
        ) : (
          <div className="border rounded-md divide-y max-h-[50vh] overflow-y-auto">
            {rows.map((row) => (
              <div key={row.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {row.country ?? country ?? "Assessment"}
                    {row.goal ? ` · ${row.goal.replace(/_/g, " ")}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.assessment_kind?.replace(/_/g, " ") ?? "session"} ·{" "}
                    {formatDistanceToNow(new Date(row.updated_at ?? row.created_at), { addSuffix: true })}
                  </div>
                </div>
                <Badge variant={row.status === "submitted" ? "default" : "secondary"}>
                  {row.status ?? "draft"}
                </Badge>
                <Button size="sm" variant="outline" className="h-7 shrink-0" asChild>
                  <Link to={runHref(row)} onClick={() => onOpenChange(false)}>
                    <ExternalLink className="size-3.5 mr-1" />
                    {row.status === "submitted" ? "View" : "Continue"}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/assessment" onClick={() => onOpenChange(false)}>
              Assessment hub
            </Link>
          </Button>
          <Button type="button" onClick={startNew} disabled={starting || !libraryId}>
            {starting ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Plus className="size-4 mr-1.5" />
            )}
            New assessment
          </Button>
        </DialogFooter>
        {!libraryId && (
          <p className="text-xs text-muted-foreground -mt-2">
            Link a service on the Profile tab to enable starting a new assessment.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
