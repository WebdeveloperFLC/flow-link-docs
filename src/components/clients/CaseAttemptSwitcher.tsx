import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientServiceCase } from "@/lib/clientServiceCase";
import { OUTCOME_BADGE } from "@/lib/caseOutcomeStyles";

type Props = {
  attempts: ClientServiceCase[];
  activeCaseId: string | null | undefined;
  onSelect: (caseId: string) => void;
};

function attemptOptionLabel(c: ClientServiceCase): string {
  let label = `Attempt ${c.attemptNumber}`;
  if (c.status === "closed" && c.outcome && OUTCOME_BADGE[c.outcome]) {
    label += ` · ${OUTCOME_BADGE[c.outcome].label}`;
  } else if (c.status === "open") {
    label += " · Active";
  }
  return label;
}

/** Switch between Attempt 1, 2, … for the same service on one client. */
export function CaseAttemptSwitcher({ attempts, activeCaseId, onSelect }: Props) {
  if (attempts.length <= 1) return null;

  const active = attempts.find((a) => a.id === activeCaseId) ?? attempts[attempts.length - 1];

  return (
    <>
      <span>·</span>
      <Select value={active.id} onValueChange={onSelect}>
        <SelectTrigger
          className="h-7 w-auto min-w-[9.5rem] max-w-[14rem] text-xs font-medium border-dashed px-2 gap-1"
          aria-label="Switch application attempt"
        >
          <SelectValue>{attemptOptionLabel(active)}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {attempts.map((c) => (
            <SelectItem key={c.id} value={c.id} className="text-xs">
              {attemptOptionLabel(c)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
