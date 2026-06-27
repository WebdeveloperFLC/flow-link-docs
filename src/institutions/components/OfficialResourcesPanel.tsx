import { ExternalLink, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { InstitutionOfficialResources, OfficialResourceLinks } from "@/institutions/types/officialResources";

const PROGRAM_FIELDS: { key: keyof OfficialResourceLinks; label: string }[] = [
  { key: "programUrl", label: "Official program URL" },
  { key: "admissionUrl", label: "Official admission URL" },
  { key: "tuitionUrl", label: "Official tuition URL" },
  { key: "scholarshipUrl", label: "Official scholarship URL" },
  { key: "brochureUrl", label: "Official brochure URL" },
];

const INSTITUTION_FIELDS: {
  key: keyof Pick<
    InstitutionOfficialResources,
    | "websiteUrl"
    | "internationalStudentUrl"
    | "programListingUrl"
    | "admissionPageUrl"
    | "tuitionPageUrl"
    | "scholarshipPageUrl"
  >;
  label: string;
}[] = [
  { key: "websiteUrl", label: "Institution website" },
  { key: "internationalStudentUrl", label: "International student page" },
  { key: "programListingUrl", label: "Program listing URL" },
  { key: "admissionPageUrl", label: "Admission URL" },
  { key: "tuitionPageUrl", label: "Tuition URL" },
  { key: "scholarshipPageUrl", label: "Scholarship URL" },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

type BaseProps = {
  title?: string;
  description?: string;
  className?: string;
};

/** Program-level official URLs (Course Finder, Program Workspace). */
export function OfficialResourcesPanel({
  title = "Official resources",
  description = "Reference institution-maintained pages — Future Link does not duplicate academic content.",
  resources,
  canEdit = false,
  onChange,
  onSave,
  className,
}: BaseProps & {
  resources: OfficialResourceLinks;
  canEdit?: boolean;
  onChange?: (patch: Partial<OfficialResourceLinks>) => void;
  onSave?: (patch: Partial<OfficialResourceLinks>) => void | Promise<void>;
}) {
  const hasAny = PROGRAM_FIELDS.some((f) => resources[f.key]?.trim());
  const primaryUrl = resources.programUrl?.trim() || resources.admissionUrl?.trim();

  return (
    <Card className={`p-4 space-y-3 ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {primaryUrl ? (
          <Button asChild size="sm" variant="outline">
            <a href={primaryUrl} target="_blank" rel="noreferrer">
              <Globe className="size-4 mr-1" /> Open program page
            </a>
          </Button>
        ) : null}
      </div>

      {canEdit && onChange ? (
        <div className="space-y-3">
          {PROGRAM_FIELDS.map(({ key, label }) => (
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
            <p className="text-sm text-muted-foreground">No official URLs on file — open institution pages for full details.</p>
          ) : (
            PROGRAM_FIELDS.filter((f) => resources[f.key]?.trim()).map(({ key, label }) => (
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

/** Institution-level official URLs with verification dates. */
export function InstitutionOfficialResourcesPanel({
  title = "Official resources",
  description = "Reference institution-maintained pages — Future Link does not duplicate academic content.",
  institutionResources: r,
  canEdit = false,
  onInstitutionChange,
  onInstitutionSave,
  className,
}: BaseProps & {
  institutionResources: InstitutionOfficialResources;
  canEdit?: boolean;
  onInstitutionChange?: (patch: Partial<InstitutionOfficialResources>) => void;
  onInstitutionSave?: (patch: Partial<InstitutionOfficialResources>) => void | Promise<void>;
}) {
  const hasWebsite = Boolean(r.websiteUrl?.trim());

  return (
    <Card className={`p-4 space-y-3 ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {hasWebsite ? (
          <Button asChild size="sm" variant="outline">
            <a href={r.websiteUrl!} target="_blank" rel="noreferrer">
              <Globe className="size-4 mr-1" /> Open website
            </a>
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        {INSTITUTION_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://"
                disabled={!canEdit}
                value={r[key] ?? ""}
                onChange={(e) => onInstitutionChange?.({ [key]: e.target.value })}
                onBlur={(e) => void onInstitutionSave?.({ [key]: e.target.value || null })}
              />
              {r[key]?.trim() ? (
                <Button asChild size="icon" variant="outline" title="Open">
                  <a href={r[key]!} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t text-xs">
        <div>
          <span className="text-muted-foreground">Last verified: </span>
          {canEdit ? (
            <Input
              type="date"
              className="mt-1 h-8"
              disabled={!canEdit}
              value={r.lastVerifiedAt?.slice(0, 10) ?? ""}
              onChange={(e) => {
                const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : null;
                onInstitutionChange?.({ lastVerifiedAt: v });
              }}
              onBlur={(e) => {
                const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : null;
                void onInstitutionSave?.({ lastVerifiedAt: v });
              }}
            />
          ) : (
            <span className="font-medium">{formatDate(r.lastVerifiedAt)}</span>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">Last AI review: </span>
          {canEdit ? (
            <Input
              type="date"
              className="mt-1 h-8"
              disabled={!canEdit}
              value={r.lastAiSyncAt?.slice(0, 10) ?? ""}
              onChange={(e) => {
                const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : null;
                onInstitutionChange?.({ lastAiSyncAt: v });
              }}
              onBlur={(e) => {
                const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : null;
                void onInstitutionSave?.({ lastAiSyncAt: v });
              }}
            />
          ) : (
            <span className="font-medium">{formatDate(r.lastAiSyncAt)}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
