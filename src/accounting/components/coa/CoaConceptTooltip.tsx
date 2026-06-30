import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COA_GROUP_DESCRIPTIONS, COA_TYPE_DESCRIPTIONS } from "../../lib/coaUxHelpers";

interface Props {
  kind: "group" | "type";
  code: string;
  label?: string;
  side?: "top" | "right" | "bottom" | "left";
  /** Native title in virtualized grids — Radix tooltips portal outside recycled cells. */
  inGrid?: boolean;
}

export default function CoaConceptTooltip({ kind, code, label, side = "top", inGrid = false }: Props) {
  const text =
    kind === "group"
      ? COA_GROUP_DESCRIPTIONS[code]
      : COA_TYPE_DESCRIPTIONS[code];
  if (!text) return label ? <span>{label}</span> : null;

  if (inGrid) {
    return (
      <span className="inline-flex items-center gap-1 cursor-help" title={text}>
        {label ?? code}
        <HelpCircle className="size-3 text-muted-foreground shrink-0" aria-hidden />
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {label ?? code}
          <HelpCircle className="size-3 text-muted-foreground shrink-0" />
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
