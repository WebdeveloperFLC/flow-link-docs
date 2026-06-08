import { Plus, Download, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";
type Props = {
  view: AcademyViewModel;
  onSelectRelated?: (libraryId: string) => void;
  onDownloadChecklist?: () => void;
  onNewApplication?: () => void;
};

export function ServiceLibraryRightRail({
  view,
  onSelectRelated,
  onDownloadChecklist,
  onNewApplication,
}: Props) {
  const sections = [
    { label: "Overview", done: true },
    { label: "Red flags", done: view.redFlags.length > 0 },
    { label: "Checklist", done: view.checklist.completed > 0 },
    { label: "Process", done: view.process.length > 0 },
  ];
  const sectionsRead = sections.filter((s) => s.done).length;
  const sectionsTotal = sections.length;
  const percent = sectionsTotal ? Math.round((sectionsRead / sectionsTotal) * 100) : 0;

  return (
    <aside className="w-full xl:w-[280px] shrink-0 space-y-4">
      <Card className="p-4 shadow-elev-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Service health
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Status</dt>
            <dd className={cn("font-medium", view.needsReview ? "text-warning" : "text-success")}>
              {view.needsReview ? "Needs review" : "Active"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Version</dt>
            <dd className="font-medium font-mono text-xs">{view.version}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4 shadow-elev-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          My training progress
        </div>
        <div className="flex items-center gap-4">
          <div
            className="relative size-16 shrink-0 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${percent * 3.6}deg, hsl(var(--muted)) 0deg)`,
            }}
          >
            <div className="size-12 rounded-full bg-card flex items-center justify-center text-sm font-bold">
              {percent}%
            </div>
          </div>
          <div className="text-sm">
            <div className="font-medium">
              {sectionsRead} of {sectionsTotal} sections read
            </div>
            <Progress value={percent} className="h-1.5 mt-2" />
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {sections.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-xs">
              {s.done ? (
                <CheckCircle2 className="size-3.5 text-success shrink-0" />
              ) : (
                <Circle className="size-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={cn(!s.done && "text-muted-foreground")}>{s.label}</span>
            </li>
          ))}
        </ul>
      </Card>

      {view.approvalFactors.length > 0 && (
        <Card className="p-4 shadow-elev-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Approval factors
          </div>
          <div className="space-y-4">
            {view.approvalFactors.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium">{f.ours}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${f.ours}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Benchmark {f.benchmark}%</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view.relatedServices.length > 0 && (
        <Card className="p-4 shadow-elev-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Related services
          </div>
          <ul className="space-y-1">
            {view.relatedServices.map((s) => (
              <li key={s.id || s.label}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-sm py-1.5 px-1 rounded-md hover:bg-muted/50 text-left text-primary disabled:opacity-50"
                  disabled={!s.id}
                  onClick={() => s.id && onSelectRelated?.(s.id)}
                >
                  {s.label}
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4 shadow-elev-sm space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Quick actions
        </div>
        <Button
          className="w-full bg-success hover:bg-success/90 text-success-foreground"
          size="sm"
          onClick={onNewApplication}
          disabled={!onNewApplication}
        >
          <Plus className="size-4 mr-1.5" />
          New application
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={onDownloadChecklist} disabled={!onDownloadChecklist}>
          <Download className="size-4 mr-1.5" />
          Download checklist
        </Button>
      </Card>
    </aside>
  );
}
