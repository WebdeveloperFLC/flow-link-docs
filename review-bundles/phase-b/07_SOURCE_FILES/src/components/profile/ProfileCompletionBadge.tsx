import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  filled: number;
  total: number;
  className?: string;
}

export function ProfileCompletionBadge({ filled, total, className }: Props) {
  if (total <= 0) return null;
  const complete = filled >= total;
  return (
    <Badge
      variant={complete ? "default" : "secondary"}
      className={cn("tabular-nums text-[10px] font-normal", className)}
    >
      {filled}/{total}
    </Badge>
  );
}
