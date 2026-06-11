import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SetupState = {
  pipelineAssigned: boolean;
  templateAssigned: boolean;
  hasInvoice: boolean;
  portalInvited: boolean;
  hasAssessment: boolean;
};

type Props = {
  clientId: string;
  libraryId?: string | null;
  destinationCountry?: string | null;
  onRefresh?: () => void;
};

export function ClientSetupPanel({ clientId, libraryId, destinationCountry, onRefresh }: Props) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<SetupState | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: client }, { count: invoiceCount }, { count: inviteCount }, { count: assessmentCount }] =
        await Promise.all([
          supabase
            .from("clients")
            .select("pipeline_id, template_id")
            .eq("id", clientId)
            .maybeSingle(),
          supabase
            .from("client_invoices")
            .select("id", { count: "exact", head: true })
            .eq("client_id", clientId)
            .is("archived_at", null),
          supabase
            .from("client_portal_invites")
            .select("id", { count: "exact", head: true })
            .eq("client_id", clientId),
          supabase
            .from("assessment_sessions")
            .select("id", { count: "exact", head: true })
            .eq("client_id", clientId),
        ]);

      setState({
        pipelineAssigned: !!client?.pipeline_id,
        templateAssigned: !!client?.template_id,
        hasInvoice: (invoiceCount ?? 0) > 0,
        portalInvited: (inviteCount ?? 0) > 0,
        hasAssessment: (assessmentCount ?? 0) > 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [clientId]);

  const steps = useMemo(
    () => [
      {
        key: "pipeline",
        label: "Application pipeline assigned",
        done: !!state?.pipelineAssigned,
        hint: "Assign a stage pipeline below to track progress",
      },
      {
        key: "binder",
        label: "Document checklist linked",
        done: !!state?.templateAssigned,
        hint: "Link a workflow template or enroll from Service Library",
      },
      {
        key: "invoice",
        label: "Invoice drafted or sent",
        done: !!state?.hasInvoice,
        hint: "Create an invoice in Client Invoices & Payments",
      },
      {
        key: "portal",
        label: "Client portal invited",
        done: !!state?.portalInvited,
        hint: "Send a portal invite from the sidebar",
      },
      ...(libraryId
        ? [
            {
              key: "assessment",
              label: "Eligibility assessment started",
              done: !!state?.hasAssessment,
              hint: "Use Eligibility Assessment in the header actions",
            },
          ]
        : []),
    ],
    [state, libraryId],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const complete = doneCount === steps.length;

  if (loading) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking setup…
      </Card>
    );
  }

  if (complete) return null;

  return (
    <Card className="p-4 space-y-3 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="size-4 text-primary" />
            Complete client setup
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {doneCount}/{steps.length} done
            {destinationCountry ? ` · ${destinationCountry}` : ""}
          </p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void load().then(() => onRefresh?.())}>
          Refresh
        </Button>
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-2 text-sm">
            {step.done ? (
              <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
            ) : (
              <Circle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className={cn(!step.done && "text-foreground")}>
              <div className={step.done ? "text-muted-foreground line-through" : "font-medium"}>{step.label}</div>
              {!step.done && <div className="text-xs text-muted-foreground">{step.hint}</div>}
            </div>
          </li>
        ))}
      </ul>
      {libraryId && (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/service-library?id=${libraryId}${destinationCountry ? `&country=${encodeURIComponent(destinationCountry)}` : ""}`}>
            Open Service Library
          </Link>
        </Button>
      )}
    </Card>
  );
}
