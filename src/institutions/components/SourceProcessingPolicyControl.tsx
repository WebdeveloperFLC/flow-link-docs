import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PROCESSING_POLICIES,
  PROCESSING_POLICY_HINTS,
  PROCESSING_POLICY_LABELS,
  type ProcessingPolicy,
} from "@/institutions/types/knowledgeSources";
import {
  canSyncNow,
  readProcessingPolicy,
} from "@/institutions/lib/sourceProcessingPolicy";
import type { UpiSource } from "@/institutions/types/upi";

export function SourceProcessingPolicyBadge({ source }: { source: UpiSource }) {
  const policy = readProcessingPolicy(source);
  const variant =
    policy === "reference_only" ? "outline" : policy === "ai_extract_once" ? "secondary" : "default";
  return (
    <Badge variant={variant} className="text-[10px] shrink-0" title={PROCESSING_POLICY_HINTS[policy]}>
      {PROCESSING_POLICY_LABELS[policy]}
    </Badge>
  );
}

export function SourceProcessingPolicySelect({
  source,
  canEdit,
  onChange,
}: {
  source: UpiSource;
  canEdit: boolean;
  onChange: (policy: ProcessingPolicy) => void;
}) {
  const policy = readProcessingPolicy(source);
  const syncAllowed = canSyncNow(source);

  return (
    <div className="flex flex-col gap-1 min-w-[10rem]">
      <Select
        value={policy}
        disabled={!canEdit}
        onValueChange={(v) => onChange(v as ProcessingPolicy)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROCESSING_POLICIES.map((p) => (
            <SelectItem key={p} value={p} className="text-xs">
              {PROCESSING_POLICY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground leading-snug max-w-[14rem]">
        {PROCESSING_POLICY_HINTS[policy]}
        {!syncAllowed && policy !== "reference_only" ? " Extraction already completed." : null}
      </p>
    </div>
  );
}
