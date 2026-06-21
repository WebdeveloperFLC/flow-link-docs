import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { GraduationCap, Loader2, ExternalLink, Star, Trash2, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  listClientPrograms,
  markFinalAndCreateApplication,
  removeShortlistedProgram,
  setPrimaryClientProgram,
  groupProgramsByCountry,
  programCodeDisplay,
  applicationStatusLabel,
  type ClientProgramEnriched,
} from "@/lib/clientPrograms";
import { MarkFinalProgramDialog } from "./MarkFinalProgramDialog";

function ProgramRow({
  p,
  clientId,
  canEdit,
  caseId,
  onMarkFinal,
  onRemove,
  onSetPrimary,
}: {
  p: ClientProgramEnriched;
  clientId: string;
  canEdit: boolean;
  caseId: string | undefined;
  onMarkFinal: (p: ClientProgramEnriched) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const { course: c } = p;
  const code = programCodeDisplay(p);
  const intake = p.selected_intake_term ?? (c.intake_months.length > 0
    ? `${c.intake_months.join(", ")}${c.intake_year ? ` ${c.intake_year}` : ""}`
    : null);
  const campus = p.selected_campus ?? (c.campus_names.length ? c.campus_names.join(", ") : null);
  const isFinal = p.status === "final";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 rounded-lg border p-3 bg-background">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{c.country.flag_emoji}</span>
          <span className="font-medium text-sm">{c.name}</span>
          {isFinal && p.is_primary && (
            <Badge className="gap-1 text-[10px]">
              <Star className="size-3 fill-current" />
              Primary
            </Badge>
          )}
          {p.status === "shortlisted" && (
            <Badge variant="secondary" className="text-[10px]">
              Shortlisted
            </Badge>
          )}
          {isFinal && (
            <StatusBadge variant="success" className="text-[10px]">Final</StatusBadge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{c.university.name}</p>
        {isFinal ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-1">
            <div>
              <span className="text-muted-foreground">Program code: </span>
              <span className="font-mono">{code ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Campus: </span>
              <span>{campus ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Intake: </span>
              <span>{intake ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Application: </span>
              <span>{applicationStatusLabel(p)}</span>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            {c.study_level}
            {code ? ` · ${code}` : ""}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="gap-1" asChild>
            <Link to={`/course-finder?clientId=${clientId}`}>
              <ExternalLink className="size-3.5" />
              Finder
            </Link>
          </Button>
          {p.status === "shortlisted" && (
            <>
              <Button
                size="sm"
                onClick={() => onMarkFinal(p)}
                disabled={!caseId}
                title={caseId ? undefined : "Select an active service case first"}
              >
                <CheckCircle2 className="size-3.5 mr-1" />
                Mark final
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onRemove(p.id)} aria-label="Remove">
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
          {isFinal && p.qualification_id && (
            <Button size="sm" className="gap-1" asChild>
              <Link to={`/clients/${clientId}?tab=qualification&applicationId=${p.qualification_id}`}>
                <FileText className="size-3.5" />
                Open application
              </Link>
            </Button>
          )}
          {isFinal && !p.is_primary && (
            <Button size="sm" variant="outline" onClick={() => onSetPrimary(p.id)}>
              Set primary
            </Button>
          )}
        </div>
      )}
      {!canEdit && isFinal && p.qualification_id && (
        <Button size="sm" variant="outline" className="gap-1 shrink-0" asChild>
          <Link to={`/clients/${clientId}?tab=qualification&applicationId=${p.qualification_id}`}>
            <FileText className="size-3.5" />
            Open application
          </Link>
        </Button>
      )}
    </div>
  );
}

export function ClientProgramsCard({
  clientId,
  caseId,
  canEdit,
  onChanged,
  onApplicationCreated,
}: {
  clientId: string;
  caseId: string | undefined;
  canEdit: boolean;
  onChanged?: () => void;
  onApplicationCreated?: (qualificationId: string) => void;
}) {
  const [programs, setPrograms] = useState<ClientProgramEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizeTarget, setFinalizeTarget] = useState<ClientProgramEnriched | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listClientPrograms(clientId);
      setPrograms(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = groupProgramsByCountry(programs);
  const hasAny = programs.length > 0;

  const handleMarkFinalConfirm = async (values: {
    intakeTerm: string;
    campusName: string;
    ownerUserId: string;
    setPrimary: boolean;
  }) => {
    if (!finalizeTarget || !caseId) return;
    setBusy(true);
    try {
      const { qualificationId } = await markFinalAndCreateApplication({
        programId: finalizeTarget.id,
        caseId,
        intakeTerm: values.intakeTerm,
        campusName: values.campusName || null,
        ownerUserId: values.ownerUserId,
        setPrimary: values.setPrimary,
      });
      toast.success("Program marked final — application created");
      setFinalizeTarget(null);
      await load();
      onChanged?.();
      onApplicationCreated?.(qualificationId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark final");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (id: string) => {
    try {
      await removeShortlistedProgram(id);
      toast.success("Removed from shortlist");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  };

  const onSetPrimary = async (id: string) => {
    try {
      await setPrimaryClientProgram(id);
      toast.success("Set as primary program for this country");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update primary");
    }
  };

  return (
    <>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            <div>
              <h3 className="font-semibold">Study programs</h3>
              <p className="text-xs text-muted-foreground">
                Shortlist in Course Finder, then Mark final to create an application on the Applications tab.
              </p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/course-finder?clientId=${clientId}`}>Find courses</Link>
            </Button>
          )}
        </div>

        {!caseId && canEdit && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
            Select an active service case in the header before marking a program final.
          </p>
        )}

        {loading ? (
          <div className="py-8 grid place-items-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !hasAny ? (
          <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
            No programs yet.{" "}
            {canEdit ? (
              <Link to={`/course-finder?clientId=${clientId}`} className="text-primary hover:underline">
                Browse Course Finder
              </Link>
            ) : (
              "Ask your counselor to add options."
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([code, bucket]) => (
              <div key={code}>
                <h4 className="text-sm font-medium mb-2">
                  {bucket.country.flag_emoji} {bucket.country.name}
                </h4>
                {bucket.shortlisted.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Shortlisted</p>
                    {bucket.shortlisted.map((p) => (
                      <ProgramRow
                        key={p.id}
                        p={p}
                        clientId={clientId}
                        canEdit={canEdit}
                        caseId={caseId}
                        onMarkFinal={setFinalizeTarget}
                        onRemove={onRemove}
                        onSetPrimary={onSetPrimary}
                      />
                    ))}
                  </div>
                )}
                {bucket.final.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Final (on file)</p>
                    {bucket.final.map((p) => (
                      <ProgramRow
                        key={p.id}
                        p={p}
                        clientId={clientId}
                        canEdit={canEdit}
                        caseId={caseId}
                        onMarkFinal={setFinalizeTarget}
                        onRemove={onRemove}
                        onSetPrimary={onSetPrimary}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <MarkFinalProgramDialog
        open={!!finalizeTarget}
        onOpenChange={(o) => !busy && !o && setFinalizeTarget(null)}
        program={finalizeTarget}
        onConfirm={handleMarkFinalConfirm}
      />
    </>
  );
}
