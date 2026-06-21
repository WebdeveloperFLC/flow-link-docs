import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CaseDocumentProgress } from "@/lib/documentWorkflow/types";

interface Props {
  progress: CaseDocumentProgress;
  templateName?: string | null;
}

export function DocumentsProgressSummary({ progress, templateName }: Props) {
  return (
    <Card className="p-4 shadow-elev-sm space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-sm">Documents Progress Summary</div>
          {templateName ? (
            <div className="text-xs text-muted-foreground mt-0.5">{templateName}</div>
          ) : null}
        </div>
        <div className="text-2xl font-bold tabular-nums text-primary">{progress.completionPct}%</div>
      </div>
      <Progress value={progress.completionPct} className="h-2" />
      <p className="text-[11px] text-muted-foreground">
        Progress counts <strong>required</strong> documents only. Optional items do not change these numbers.
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-muted/50 px-2 py-2">
          <div className="text-lg font-semibold tabular-nums">{progress.required}</div>
          <div className="text-[11px] text-muted-foreground">Required</div>
        </div>
        <div className="rounded-md bg-emerald-500/10 px-2 py-2">
          <div className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {progress.uploaded}
          </div>
          <div className="text-[11px] text-muted-foreground">Uploaded</div>
        </div>
        <div className="rounded-md bg-secondary/10 px-2 py-2">
          <div className="text-lg font-semibold tabular-nums text-secondary">{progress.missing}</div>
          <div className="text-[11px] text-muted-foreground">Missing</div>
        </div>
      </div>
    </Card>
  );
}
