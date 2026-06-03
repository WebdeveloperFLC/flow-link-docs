import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, ExternalLink, Star, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  listClientPrograms,
  finalizeClientProgram,
  removeShortlistedProgram,
  setPrimaryClientProgram,
  groupProgramsByCountry,
  type ClientProgramEnriched,
} from "@/lib/clientPrograms";

const fmtMoney = (n: number | null, c: string | null) => {
  if (n == null) return "—";
  return `${c ?? ""} ${n.toLocaleString()}`.trim();
};

function ProgramRow({
  p,
  canEdit,
  onFinalize,
  onRemove,
  onSetPrimary,
}: {
  p: ClientProgramEnriched;
  canEdit: boolean;
  onFinalize: (p: ClientProgramEnriched) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const { course: c } = p;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 rounded-lg border p-3 bg-background">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{c.country.flag_emoji}</span>
          <span className="font-medium text-sm truncate">{c.name}</span>
          {p.status === "final" && p.is_primary && (
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
          {p.status === "final" && (
            <Badge className="bg-emerald-600/90 text-[10px]">Final</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{c.university.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {c.study_level} · {fmtMoney(c.tuition_fee, c.currency)}
          {c.intake_months.length > 0 && ` · ${c.intake_months.join(", ")} ${c.intake_year ?? ""}`}
        </p>
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="gap-1" asChild>
            <Link to={`/course-finder?clientId=${p.client_id}`}>
              <ExternalLink className="size-3.5" />
              Finder
            </Link>
          </Button>
          {p.status === "shortlisted" && (
            <>
              <Button size="sm" onClick={() => onFinalize(p)}>
                <CheckCircle2 className="size-3.5 mr-1" />
                Mark final
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onRemove(p.id)} aria-label="Remove">
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
          {p.status === "final" && !p.is_primary && (
            <Button size="sm" variant="outline" onClick={() => onSetPrimary(p.id)}>
              Set primary
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ClientProgramsCard({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [programs, setPrograms] = useState<ClientProgramEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizeTarget, setFinalizeTarget] = useState<ClientProgramEnriched | null>(null);
  const [setPrimaryOnFinalize, setSetPrimaryOnFinalize] = useState(true);
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

  const confirmFinalize = async () => {
    if (!finalizeTarget) return;
    setBusy(true);
    try {
      await finalizeClientProgram(finalizeTarget.id, { setPrimary: setPrimaryOnFinalize });
      toast.success("Program added to client file permanently");
      setFinalizeTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not finalize");
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
                Shortlist options while exploring; mark final to lock onto the client file.
              </p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/course-finder?clientId=${clientId}`}>Find courses</Link>
            </Button>
          )}
        </div>

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
                        canEdit={canEdit}
                        onFinalize={(row) => {
                          setSetPrimaryOnFinalize(true);
                          setFinalizeTarget(row);
                        }}
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
                        canEdit={canEdit}
                        onFinalize={() => {}}
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

      <AlertDialog open={!!finalizeTarget} onOpenChange={(o) => !o && setFinalizeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark program as final?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently attaches the program to the client file. Shortlisted entries can be removed; final
              programs stay on the record (admin can remove if needed).
            </AlertDialogDescription>
          </AlertDialogHeader>
          {finalizeTarget && (
            <p className="text-sm font-medium px-1">
              {finalizeTarget.course.university.name} — {finalizeTarget.course.name}
            </p>
          )}
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="set-primary"
              checked={setPrimaryOnFinalize}
              onCheckedChange={(v) => setSetPrimaryOnFinalize(!!v)}
            />
            <Label htmlFor="set-primary" className="text-sm font-normal cursor-pointer">
              Set as primary for {finalizeTarget?.course.country.name ?? "this country"} (updates portal course
              summary)
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalize} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Mark as final"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
