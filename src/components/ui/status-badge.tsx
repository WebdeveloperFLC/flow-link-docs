import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusVariants = {
  success: 'border-transparent bg-success/15 text-success hover:bg-success/20',
  warning: 'border-transparent bg-warning/15 text-warning hover:bg-warning/20',
  destructive: 'border-transparent bg-destructive/15 text-destructive hover:bg-destructive/20',
  muted: 'border-transparent bg-muted text-muted-foreground',
  primary: 'border-transparent bg-primary/15 text-primary hover:bg-primary/20',
} as const;

export type StatusBadgeVariant = keyof typeof statusVariants;

export const LEAD_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  hot: 'destructive',
  warm: 'warning',
  cold: 'primary',
  not_interested: 'muted',
  converted: 'success',
};

export function leadStatusVariant(status: string): StatusBadgeVariant {
  return LEAD_STATUS_VARIANT[status] ?? 'muted';
}

export function StatusBadge({
  variant = 'muted',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: StatusBadgeVariant }) {
  return (
    <Badge
      className={cn(statusVariants[variant], className)}
      {...props}
    />
  );
}

export { statusVariants };
