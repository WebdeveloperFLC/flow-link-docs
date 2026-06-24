import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountrySelect } from "@/components/leads/CountrySelect";
import { InstitutionLogoField } from "./InstitutionLogoField";
import type { ProfileSourceType, UpiInstitution } from "../types/upi";
import {
  useInstitutionContactCountries,
} from "../lib/institutionContactCountries";
import { isInstitutionCanada, resolveInstitutionCountryFromLabel, fetchUpiCountryIso } from "../lib/institutionCountry";
import { cn } from "@/lib/utils";

const INSTITUTION_TYPES = [
  "Public College",
  "Polytechnic",
  "University",
  "Private College",
  "Language School",
  "Other",
] as const;

const PROFILE_SOURCE_TYPES: ProfileSourceType[] = [
  "WEBSITE",
  "LOA",
  "PARTNER_PORTAL",
  "EMAIL",
  "MANUAL",
  "AGREEMENT",
  "OTHER",
];

const SUGGESTED_INTAKES = ["Fall", "Winter", "Spring", "Summer"] as const;

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-3 pt-4 border-t first:border-t-0 first:pt-0", className)}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
      {children}
    </div>
  );
}

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

type Props = {
  institutionId: string;
  inst: UpiInstitution;
  canEdit: boolean;
  onChange: (patch: Partial<UpiInstitution>) => void;
  onSave: (patch: Partial<UpiInstitution>) => Promise<void>;
};

export function InstitutionProfileOverview({ institutionId, inst, canEdit, onChange, onSave }: Props) {
  const countries = useInstitutionContactCountries();
  const [countryIso, setCountryIso] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchUpiCountryIso(inst.country_id).then((iso) => {
      if (alive) setCountryIso(iso);
    });
    return () => {
      alive = false;
    };
  }, [inst.country_id]);

  const isCanada = useMemo(
    () => isInstitutionCanada(inst.country_name, countries, countryIso),
    [inst.country_name, countries, countryIso],
  );

  const intakes = inst.main_intakes ?? [];

  const saveCountry = async (label: string) => {
    if (!canEdit) return;
    try {
      const resolved = await resolveInstitutionCountryFromLabel(label, countries);
      await onSave(resolved);
    } catch (e) {
      throw e;
    }
  };

  const toggleIntake = (intake: string) => {
    const next = intakes.includes(intake)
      ? intakes.filter((i) => i !== intake)
      : [...intakes, intake];
    onChange({ main_intakes: next });
    void onSave({ main_intakes: next });
  };

  return (
    <Card className="p-6 space-y-1 max-w-3xl">
      <div className="text-sm font-medium mb-2">Institution profile</div>

      <Section title="Branding">
        <InstitutionLogoField
          institutionId={institutionId}
          institutionName={inst.name}
          logoUrl={inst.logo_url}
          websiteUrl={inst.website_url}
          canEdit={canEdit}
          onUpdated={(logo_url) => onChange({ logo_url })}
        />
      </Section>

      <Section title="Core identity">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={inst.name}
              disabled={!canEdit}
              onChange={(e) => onChange({ name: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <CountrySelect
              value={inst.country_name ?? ""}
              onChange={(v) => {
                onChange({ country_name: v });
                void saveCountry(v);
              }}
              placeholder="Select country"
              className={!canEdit ? "pointer-events-none opacity-60" : undefined}
            />
          </div>
          <div className="space-y-1">
            <Label>Institution type</Label>
            <Select
              disabled={!canEdit}
              value={inst.institution_type ?? ""}
              onValueChange={(v) => {
                onChange({ institution_type: v });
                void onSave({ institution_type: v });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick institution type" />
              </SelectTrigger>
              <SelectContent>
                {INSTITUTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Official website</Label>
            <Input
              placeholder="https://"
              disabled={!canEdit}
              value={inst.website_url ?? ""}
              onChange={(e) => onChange({ website_url: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ website_url: e.target.value || null })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                disabled={!canEdit}
                value={inst.email ?? ""}
                onChange={(e) => onChange({ email: e.target.value })}
                onBlur={(e) => canEdit && void onSave({ email: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                disabled={!canEdit}
                value={inst.phone ?? ""}
                onChange={(e) => onChange({ phone: e.target.value })}
                onBlur={(e) => canEdit && void onSave({ phone: e.target.value || null })}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Location">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>City</Label>
            <Input
              disabled={!canEdit}
              value={inst.city ?? ""}
              onChange={(e) => onChange({ city: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ city: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Province / state</Label>
            <Input
              disabled={!canEdit}
              value={inst.state_province ?? ""}
              onChange={(e) => onChange({ state_province: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ state_province: e.target.value || null })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Address</Label>
          <Textarea
            disabled={!canEdit}
            className="min-h-[72px]"
            value={inst.address ?? ""}
            onChange={(e) => onChange({ address: e.target.value })}
            onBlur={(e) => canEdit && void onSave({ address: e.target.value || null })}
          />
        </div>
      </Section>

      <Section title="URLs & portals">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>International student page</Label>
            <Input
              placeholder="https://"
              disabled={!canEdit}
              value={inst.international_student_url ?? ""}
              onChange={(e) => onChange({ international_student_url: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ international_student_url: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Application portal (institution default)</Label>
            <Input
              placeholder="https://"
              disabled={!canEdit}
              value={inst.application_portal_url ?? ""}
              onChange={(e) => onChange({ application_portal_url: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ application_portal_url: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              Partnership routes inherit this URL when their portal override is left blank.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Deposit policy URL</Label>
            <Input
              placeholder="https://"
              disabled={!canEdit}
              value={inst.deposit_policy_url ?? ""}
              onChange={(e) => onChange({ deposit_policy_url: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ deposit_policy_url: e.target.value || null })}
            />
          </div>
        </div>
      </Section>

      {isCanada && (
        <Section title="Compliance (Canada)">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>DLI number</Label>
              <Input
                disabled={!canEdit}
                value={inst.dli_number ?? ""}
                onChange={(e) => onChange({ dli_number: e.target.value })}
                onBlur={(e) => canEdit && void onSave({ dli_number: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>PGWP eligible</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                    { label: "Unknown", value: null },
                  ] as const
                ).map(({ label, value }) => (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant={inst.pgwp_eligible === value ? "default" : "outline"}
                    disabled={!canEdit}
                    onClick={() => {
                      onChange({ pgwp_eligible: value });
                      void onSave({ pgwp_eligible: value });
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                disabled={!canEdit}
                checked={inst.pal_required === true}
                onCheckedChange={(v) => {
                  onChange({ pal_required: v });
                  void onSave({ pal_required: v });
                }}
              />
              <Label>PAL required for international students</Label>
            </div>
          </div>
        </Section>
      )}

      <Section title="Recruitment profile">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Main intakes</Label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_INTAKES.map((intake) => (
                <Button
                  key={intake}
                  type="button"
                  size="sm"
                  variant={intakes.includes(intake) ? "default" : "outline"}
                  disabled={!canEdit}
                  onClick={() => toggleIntake(intake)}
                >
                  {intake}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Processing time</Label>
            <Input
              placeholder="e.g. 4–6 weeks for LOA"
              disabled={!canEdit}
              value={inst.processing_time ?? ""}
              onChange={(e) => onChange({ processing_time: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ processing_time: e.target.value || null })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Application pathways (direct tie-up, aggregators, student direct) are managed in Catalog &amp; partnerships above.
          </p>
          <div className="space-y-1">
            <Label>Public description</Label>
            <Textarea
              placeholder="Counselor-facing institution summary"
              disabled={!canEdit}
              className="min-h-[88px]"
              value={inst.institution_description ?? ""}
              onChange={(e) => onChange({ institution_description: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ institution_description: e.target.value || null })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Approximate tuition range</Label>
              <Input
                placeholder="e.g. Approx. CAD 15,000–22,000/year"
                disabled={!canEdit}
                value={inst.approximate_tuition_range ?? ""}
                onChange={(e) => onChange({ approximate_tuition_range: e.target.value })}
                onBlur={(e) => canEdit && void onSave({ approximate_tuition_range: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label>Approximate deposit range</Label>
              <Input
                placeholder="e.g. Approx. CAD 2,000–5,000"
                disabled={!canEdit}
                value={inst.approximate_deposit_range ?? ""}
                onChange={(e) => onChange({ approximate_deposit_range: e.target.value })}
                onBlur={(e) => canEdit && void onSave({ approximate_deposit_range: e.target.value || null })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Guidance ranges are informational only. Official fees are managed on the Fee Schedule tab.
          </p>
        </div>
      </Section>

      <Section title="Profile verification">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Last LOA verified</Label>
            <Input
              type="date"
              disabled={!canEdit}
              value={dateInputValue(inst.last_loa_verified_at)}
              onChange={(e) => {
                const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : null;
                onChange({ last_loa_verified_at: v });
                void onSave({ last_loa_verified_at: v });
              }}
            />
          </div>
          <div className="space-y-1">
            <Label>Primary source URL</Label>
            <Input
              placeholder="https://"
              disabled={!canEdit}
              value={inst.profile_source_url ?? ""}
              onChange={(e) => onChange({ profile_source_url: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ profile_source_url: e.target.value || null })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Source type</Label>
              <Select
                disabled={!canEdit}
                value={inst.profile_source_type ?? ""}
                onValueChange={(v) => {
                  onChange({ profile_source_type: v as ProfileSourceType });
                  void onSave({ profile_source_type: v as ProfileSourceType });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Verification method</Label>
              <Select
                disabled={!canEdit}
                value={inst.human_verification_method ?? ""}
                onValueChange={(v) => {
                  onChange({ human_verification_method: v as ProfileSourceType });
                  void onSave({ human_verification_method: v as ProfileSourceType });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Source reference</Label>
            <Input
              disabled={!canEdit}
              value={inst.profile_source_reference ?? ""}
              onChange={(e) => onChange({ profile_source_reference: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ profile_source_reference: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Source notes</Label>
            <Textarea
              disabled={!canEdit}
              className="min-h-[60px]"
              value={inst.profile_source_notes ?? ""}
              onChange={(e) => onChange({ profile_source_notes: e.target.value })}
              onBlur={(e) => canEdit && void onSave({ profile_source_notes: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Last human verified</Label>
            <Input
              type="date"
              disabled={!canEdit}
              value={dateInputValue(inst.last_human_verified_at)}
              onChange={(e) => {
                const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : null;
                onChange({ last_human_verified_at: v });
                void onSave({ last_human_verified_at: v });
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Fee-level verification is managed on the Fee Schedule tab.
          </p>
        </div>
      </Section>

      <Section title="Internal notes">
        <div className="space-y-1">
          <Label>Staff notes (internal)</Label>
          <Textarea
            placeholder="Internal staff notes — not shown to counselors as public copy"
            disabled={!canEdit}
            className="min-h-[72px]"
            value={inst.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            onBlur={(e) => canEdit && void onSave({ notes: e.target.value || null })}
          />
        </div>
      </Section>
    </Card>
  );
}
