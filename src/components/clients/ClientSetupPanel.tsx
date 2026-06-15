import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  GitBranch,
  FileCheck,
  Receipt,
  Mail,
  ClipboardList,
} from "lucide-react";
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

type StepDef = {
  key: string;
  label: string;
  shortLabel: string;
  icon: typeof GitBranch;
  done: boolean;
  hint: string;
};

export function ClientSetupPanel({ clientId, libraryId, destinationCountry, onRefresh }: Props) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<SetupState | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

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

  const steps = useMemo<StepDef[]>(
    () => [
      {
        key: "pipeline",
        label: "Application pipeline assigned",
        shortLabel: "Pipeline",
        icon: GitBranch,
        done: !!state?.pipelineAssigned,
        hint: "Assign a stage pipeline below to track progress",
      },
      {
        key: "binder",
        label: "Document checklist linked",
        shortLabel: "Checklist",
        icon: FileCheck,
        done: !!state?.templateAssigned,
        hint: "Link a workflow template or enroll from Service Library",
      },
      {
        key: "invoice",
        label: "Invoice drafted or sent",
        shortLabel: "Invoice",
        icon: Receipt,
        done: !!state?.hasInvoice,
        hint: "Create an invoice in Client Invoices & Payments",
      },
      {
        key: "portal",
        label: "Client portal invited",
        shortLabel: "Portal",
        icon: Mail,
        done: !!state?.portalInvited,
        hint: "Send a portal invite from the sidebar",
      },
      ...(libraryId
        ? [
            {
              key: "assessment",
              label: "Eligibility assessment started",
              shortLabel: "Assessment",
              icon: ClipboardList,
              done: !!state?.hasAssessment,
              hint: "Use Eligibility Assessment in the header actions",
            },
          ]
        : []),
    ],
    [state, libraryId],
  );

  useEffect(() => {
    const firstPending = steps.find((s) => !s.done);
    setActiveKey(firstPending?.key ?? steps[0]?.key ?? null);
  }, [steps]);

  const doneCount = steps.filter((s) => s.done).length;
  const complete = doneCount === steps.length;
  const activeStep = steps.find((s) => s.key === activeKey) ?? steps[0];

  if (loading) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking setup…
      </Card>
    );
  }

  if (complete) return null;

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary/5 shadow-elev-sm">
      <div className="px-4 sm:px-5 py-3 border-b border-primary/10 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="size-4 text-primary shrink-0" />
            Complete client setup
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {doneCount}/{steps.length} done
            {destinationCountry ? ` · ${destinationCountry}` : ""}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {libraryId && (
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <Link
                to={`/service-library?id=${libraryId}${destinationCountry ? `&country=${encodeURIComponent(destinationCountry)}` : ""}`}
              >
                Service Library
              </Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void load().then(() => onRefresh?.())}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
          {steps.map((step) => {
            const Icon = step.icon;
            const active = activeKey === step.key;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveKey(step.key)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all border",
                  step.done
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                    : active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-foreground border-border hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="size-3.5 shrink-0" />
                ) : (
                  <Icon className="size-3.5 shrink-0" />
                )}
                <span>{step.shortLabel}</span>
                {!step.done && (
                  <Circle className={cn("size-2 shrink-0 fill-current", active ? "text-primary-foreground/60" : "text-muted-foreground/50")} />
                )}
              </button>
            );
          })}
        </div>

        {activeStep && (
          <div
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm",
              activeStep.done ? "border-emerald-500/20 bg-emerald-500/5" : "border-primary/20 bg-background",
            )}
          >
            <div className="flex items-start gap-2">
              {activeStep.done ? (
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="size-4 text-primary shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className={cn("font-medium", activeStep.done && "text-muted-foreground line-through")}>
                  {activeStep.label}
                </div>
                {!activeStep.done && <p className="text-xs text-muted-foreground mt-0.5">{activeStep.hint}</p>}
                {activeStep.done && <p className="text-xs text-emerald-700 mt-0.5">Completed</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
