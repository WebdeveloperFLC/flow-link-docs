import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { OfficialResourceLinks } from "../types/officialResources";

const FIELDS: { key: keyof OfficialResourceLinks; label: string }[] = [
  { key: "programUrl", label: "Official program URL" },
  { key: "admissionUrl", label: "Official admission URL" },
  { key: "tuitionUrl", label: "Official tuition URL" },
  { key: "scholarshipUrl", label: "Official scholarship URL" },
  { key: "brochureUrl", label: "Official brochure URL" },
];

export function OfficialResourcesPanel({
  title = "Official resources",
  description = "Reference institution pages — Future Link does not duplicate academic content.",
  resources,
  canEdit = false,
  onChange,
  onSave,
  className,
}: {
  title?: string;
  description?: string;
  resources: OfficialResourceLinks;
  canEdit?: boolean;
  onChange?: (patch: Partial<OfficialResourceLinks>) => void;
  onSave?: (patch: Partial<OfficialResourceLinks>) => void | Promise<void>;
  className?: string;
}) {
  const hasAny = FIELDS.some((f) => resources[f.key]?.trim());

  return (
    <Card className={`p-4 space-y-3 ${className ?? ""}`}>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {canEdit && onChange ? (
        <div className="space-y-3">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://"
                  value={resources[key] ?? ""}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                  onBlur={(e) => onSave?.({ [key]: e.target.value || null })}
                />
                {resources[key]?.trim() ? (
                  <Button asChild size="icon" variant="outline" title="Open">
                    <a href={resources[key]!} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {!hasAny ? (
            <p className="text-sm text-muted-foreground">No official URLs on file.</p>
          ) : (
            FIELDS.filter((f) => resources[f.key]?.trim()).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">{label}</span>
                <Button asChild size="sm" variant="link" className="h-auto p-0 truncate max-w-[60%]">
                  <a href={resources[key]!} target="_blank" rel="noreferrer">
                    Open <ExternalLink className="size-3 ml-1 inline" />
                  </a>
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
