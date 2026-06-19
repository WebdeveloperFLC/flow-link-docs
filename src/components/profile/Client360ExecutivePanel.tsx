import { Badge } from "@/components/ui/badge";
import { summarizeProfileFor360 } from "@/lib/profile/summarizeProfile";
import { Client360RegistryPanel } from "@/components/profile/Client360RegistryPanel";
import { CLIENT_360_SECTIONS } from "@/lib/profile/client360Sections";
import type { ProfileViewModel } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

interface Props {
  viewModel: ProfileViewModel;
  className?: string;
}

/**
 * Client 360 executive summary — read-only layer only.
 * No forms, inputs, edit/save, or document actions.
 */
export function Client360ExecutivePanel({ viewModel, className }: Props) {
  const summary = summarizeProfileFor360(viewModel);

  return (
    <div className={cn("space-y-4", className)} data-testid="profile-section-client360">
      {summary.highlights.length > 0 && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <p className="text-sm font-semibold">Highlights</p>
          <div className="flex flex-wrap gap-1.5">
            {summary.highlights.map((h) => (
              <Badge key={h} variant="secondary" className="text-xs font-normal">
                {h}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold">Profile summary</p>
        {summary.sections.map((section) => (
          <div key={section.section} className="rounded-lg border p-3">
            <p className="text-sm font-medium">{section.headline}</p>
            {section.lines.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {section.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No details captured yet</p>
            )}
          </div>
        ))}
      </div>

      <Client360RegistryPanel sections={CLIENT_360_SECTIONS} />
    </div>
  );
}
