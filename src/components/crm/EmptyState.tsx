import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type EmptyStateProps = {
  /** Optional icon rendered above the title. */
  icon?: LucideIcon;
  /** Primary message — what the user is looking at. */
  title: string;
  /** Optional supporting line with guidance or next steps. */
  description?: string;
  /** Optional primary action (e.g. "Clear filters", "Create lead"). */
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

/**
 * Consistent empty-state block for CRM lists, tables and cards.
 *
 * Centralises the spacing, typography and (optional) call-to-action so every
 * "nothing here yet" / "no matches" surface looks and behaves the same way.
 * Purely presentational — no data or business logic.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {Icon ? (
        <span
          className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
