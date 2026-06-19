import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProfileServicesSummary } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

interface Props {
  services: ProfileServicesSummary;
  className?: string;
}

export function ProfileServicesBlock({ services, className }: Props) {
  if (services.total_count === 0) return null;

  return (
    <div className={cn("rounded-lg border bg-muted/20 p-3 space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Services</span>
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          {services.total_count}
        </Badge>
        {services.primary_label && (
          <span className="text-xs text-muted-foreground">Primary: {services.primary_label}</span>
        )}
      </div>
      {services.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {services.items.map((item) => (
            <Badge key={item.service_code} variant="outline" className="text-[10px] font-normal">
              {item.label}
            </Badge>
          ))}
        </div>
      )}
      {services.pipeline && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{services.pipeline.stage_label ?? "Pipeline"}</span>
            {services.pipeline.progress_percent != null && (
              <span className="tabular-nums">{services.pipeline.progress_percent}%</span>
            )}
          </div>
          {services.pipeline.progress_percent != null && (
            <Progress value={services.pipeline.progress_percent} className="h-1.5" />
          )}
        </div>
      )}
    </div>
  );
}
