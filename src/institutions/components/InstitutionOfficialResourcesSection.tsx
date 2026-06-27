import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UpiInstitution } from "../types/upi";
import {
  buildInstitutionOfficialResourcesPatch,
  readInstitutionOfficialResources,
} from "../lib/officialResources";
import type { InstitutionOfficialResources } from "../types/officialResources";

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

type Props = {
  inst: UpiInstitution;
  canEdit: boolean;
  onChange: (patch: Partial<UpiInstitution>) => void;
  onSave: (patch: Partial<UpiInstitution>) => Promise<void>;
};

export function InstitutionOfficialResourcesSection({ inst, canEdit, onChange, onSave }: Props) {
  const resources = readInstitutionOfficialResources(inst);

  const update = (patch: Partial<InstitutionOfficialResources>) => {
    const merged = { ...resources, ...patch };
    const dbPatch = buildInstitutionOfficialResourcesPatch(inst, merged);
    onChange(dbPatch);
  };

  const save = async (patch: Partial<InstitutionOfficialResources>) => {
    const merged = { ...resources, ...patch };
    await onSave(buildInstitutionOfficialResourcesPatch(inst, merged));
  };

  const field = (
    label: string,
    value: string,
    key: keyof Pick<
      InstitutionOfficialResources,
      | "websiteUrl"
      | "internationalStudentUrl"
      | "programListingUrl"
      | "scholarshipPageUrl"
      | "tuitionPageUrl"
      | "admissionPageUrl"
    >,
  ) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        placeholder="https://"
        disabled={!canEdit}
        value={value}
        onChange={(e) => update({ [key]: e.target.value })}
        onBlur={(e) => void save({ [key]: e.target.value || null })}
      />
    </div>
  );

  const dateField = (
    label: string,
    value: string | null | undefined,
    key: keyof Pick<
      InstitutionOfficialResources,
      "lastVerifiedAt" | "lastAiSyncAt" | "lastChangeDetectedAt"
    >,
  ) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="date"
        disabled={!canEdit}
        value={dateInputValue(value)}
        onChange={(e) => {
          const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : null;
          update({ [key]: v });
        }}
        onBlur={(e) => {
          const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : null;
          void save({ [key]: v });
        }}
      />
    </div>
  );

  return (
    <Card className="p-6 space-y-4 max-w-3xl">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Official resources
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Link to institution-maintained pages. Future Link stores references only — not duplicated website content.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {field("Institution website", resources.websiteUrl ?? "", "websiteUrl")}
        {field("International student page", resources.internationalStudentUrl ?? "", "internationalStudentUrl")}
        {field("Program listing URL", resources.programListingUrl ?? "", "programListingUrl")}
        {field("Scholarship page", resources.scholarshipPageUrl ?? "", "scholarshipPageUrl")}
        {field("Tuition page", resources.tuitionPageUrl ?? "", "tuitionPageUrl")}
        {field("Admission page", resources.admissionPageUrl ?? "", "admissionPageUrl")}
      </div>

      <div className="grid md:grid-cols-3 gap-3 pt-2 border-t">
        {dateField("Last verified", resources.lastVerifiedAt, "lastVerifiedAt")}
        {dateField("Last AI sync", resources.lastAiSyncAt, "lastAiSyncAt")}
        {dateField("Last change detected", resources.lastChangeDetectedAt, "lastChangeDetectedAt")}
      </div>
    </Card>
  );
}
