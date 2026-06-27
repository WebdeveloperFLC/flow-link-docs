import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit } from "lucide-react";
import { KNOWLEDGE_SOURCE_STATUSES } from "../types/officialResources";
import { mapPipelineToKnowledgeStatus } from "../lib/officialResources";

const STATUS_HINT: Record<(typeof KNOWLEDGE_SOURCE_STATUSES)[number], string> = {
  Pending: "Uploaded — awaiting AI processing",
  Processing: "AI extraction in progress (reserved)",
  Extracted: "Structured data extracted — review suggested fields",
  "Needs Review": "Human review required before use",
  Approved: "Approved for counselling workflows",
  Published: "Published and available downstream",
};

const SOURCE_TYPES = [
  "Emails",
  "PDFs",
  "Images",
  "Flyers",
  "Brochures",
  "Excel",
  "Word",
  "PowerPoint",
];

export function KnowledgeSourcesArchitecturePanel() {
  return (
    <Card className="p-4 mb-4 space-y-4 border-dashed bg-muted/20">
      <div>
        <div className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Knowledge Sources
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Uploaded files are knowledge sources — {SOURCE_TYPES.join(", ")}. AI extraction is reserved for a
          future sprint; existing upload and review flows remain unchanged.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {KNOWLEDGE_SOURCE_STATUSES.map((status) => (
          <div key={status} className="rounded-md border bg-background p-2.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{status}</span>
            <p className="text-[11px] text-muted-foreground leading-snug mt-1">{STATUS_HINT[status]}</p>
          </div>
        ))}
      </div>

      <Card className="p-3 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-2">
          <BrainCircuit className="size-4 text-primary mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold">AI Processing (architecture only)</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Slot for automated extraction, opportunity detection, and publish suggestions. No extraction
              runs in v1.0.
            </p>
          </div>
        </div>
      </Card>
    </Card>
  );
}

/** @deprecated Use KnowledgeSourcesArchitecturePanel */
export const KnowledgeInboxArchitecturePanel = KnowledgeSourcesArchitecturePanel;

export function knowledgeSourceStatusBadge(doc: {
  pipeline_status?: string | null;
  review_status?: string | null;
}) {
  return mapPipelineToKnowledgeStatus(doc.pipeline_status, doc.review_status);
}

/** @deprecated Use knowledgeSourceStatusBadge */
export const knowledgeInboxStatusBadge = knowledgeSourceStatusBadge;
