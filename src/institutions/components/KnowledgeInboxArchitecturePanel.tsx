import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BrainCircuit } from "lucide-react";
import { KNOWLEDGE_INBOX_STATUSES } from "../types/officialResources";
import { mapPipelineToKnowledgeStatus } from "../lib/officialResources";

const STATUS_HINT: Record<(typeof KNOWLEDGE_INBOX_STATUSES)[number], string> = {
  "Pending AI Review": "Uploaded — awaiting AI processing",
  Extracted: "Structured data extracted — review suggested fields",
  "Needs Approval": "Human review required before use",
  Published: "Approved and available for counselling / publish workflows",
};

export function KnowledgeInboxArchitecturePanel() {
  return (
    <Card className="p-4 mb-4 space-y-4 border-dashed bg-muted/20">
      <div>
        <div className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Knowledge Inbox
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Uploaded files are <strong>Knowledge Sources</strong> — emails, PDFs, flyers, brochures, scholarships,
          waivers, promotions, and Excel sheets. AI extraction is reserved for a future sprint.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {KNOWLEDGE_INBOX_STATUSES.map((status) => (
          <div key={status} className="rounded-md border bg-background p-2.5">
            <Badge variant="outline" className="text-[10px] mb-1">
              {status}
            </Badge>
            <p className="text-[11px] text-muted-foreground leading-snug">{STATUS_HINT[status]}</p>
          </div>
        ))}
      </div>

      <Card className="p-3 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-2">
          <BrainCircuit className="size-4 text-primary mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold">AI Processing (reserved)</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Architecture slot for automated extraction, opportunity detection, and publish suggestions.
              Existing upload and pipeline flows remain unchanged.
            </p>
          </div>
        </div>
      </Card>
    </Card>
  );
}

export function knowledgeInboxStatusBadge(doc: {
  pipeline_status?: string | null;
  review_status?: string | null;
}) {
  const label = mapPipelineToKnowledgeStatus(doc.pipeline_status, doc.review_status);
  return label;
}
