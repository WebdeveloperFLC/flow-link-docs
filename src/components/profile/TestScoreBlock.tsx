import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  testIdToLegacyAptitude,
  testIdToLegacyEnglish,
  testLabel,
} from "@/lib/profile/profileTestCatalog";
import { ENGLISH_SECTIONS, OTHER_TEST_SECTIONS, SectionalInputs } from "@/lib/testSections";
import type {
  IeltsVariant,
  ProfileAptitudeTestEntry,
  ProfileEnglishTestEntry,
  ProfileLanguageTestEntry,
  ProfileTestStatus,
} from "@/lib/profile/types";
import { cn } from "@/lib/utils";

const STATUSES: ProfileTestStatus[] = [
  "not_taken",
  "planned",
  "scheduled",
  "result_awaited",
  "taken",
  "expired",
  "waived",
];

interface Props {
  mode: "view" | "edit";
  english?: ProfileEnglishTestEntry | null;
  aptitude?: ProfileAptitudeTestEntry | null;
  language?: ProfileLanguageTestEntry | null;
  onEnglishChange?: (patch: Partial<ProfileEnglishTestEntry>) => void;
  onAptitudeChange?: (patch: Partial<ProfileAptitudeTestEntry>) => void;
  onLanguageChange?: (patch: Partial<ProfileLanguageTestEntry>) => void;
  className?: string;
}

function ScoreChips({ sections }: { sections: Record<string, string> }) {
  const entries = Object.entries(sections).filter(([, v]) => v?.trim());
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {entries.map(([label, value]) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs"
        >
          <span className="text-muted-foreground capitalize">{label}</span>
          <span className="font-medium tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  );
}

export function TestScoreBlock({
  mode,
  english,
  aptitude,
  language,
  onEnglishChange,
  onAptitudeChange,
  onLanguageChange,
  className,
}: Props) {
  if (english) {
    const label = testLabel(english.test_id);
    const legacyKey = testIdToLegacyEnglish(english.test_id);
    const sectionKeys = ENGLISH_SECTIONS[legacyKey] ?? [];

    if (mode === "view") {
      return (
        <div className={cn("rounded-lg border p-3", className)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{label}</span>
            {english.ielts_variant && (
              <Badge variant="outline" className="text-[10px]">
                {english.ielts_variant}
              </Badge>
            )}
            {english.status && <Badge variant="secondary">{english.status}</Badge>}
            {english.overall && (
              <span className="text-sm">
                Overall <span className="font-semibold tabular-nums">{english.overall}</span>
              </span>
            )}
          </div>
          <ScoreChips sections={english.sections} />
        </div>
      );
    }
    return (
      <div className={cn("rounded-lg border p-3 space-y-3", className)}>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={english.status ?? ""}
              onValueChange={(v) => onEnglishChange?.({ status: v as ProfileTestStatus })}
            >
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {english.test_id === "ielts" && (
            <div className="space-y-1">
              <Label>IELTS variant</Label>
              <Select
                value={english.ielts_variant ?? ""}
                onValueChange={(v) =>
                  onEnglishChange?.({ ielts_variant: (v || null) as IeltsVariant | null })
                }
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue placeholder="Variant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Overall</Label>
            <Input
              className="h-8 w-24"
              value={english.overall ?? ""}
              onChange={(e) => onEnglishChange?.({ overall: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Test date</Label>
            <Input
              type="date"
              className="h-8 w-36"
              value={english.test_date ?? ""}
              onChange={(e) => onEnglishChange?.({ test_date: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Expiry</Label>
            <Input
              type="date"
              className="h-8 w-36"
              value={english.test_expiry ?? ""}
              onChange={(e) => onEnglishChange?.({ test_expiry: e.target.value || null })}
            />
          </div>
        </div>
        {sectionKeys.length > 0 && (
          <SectionalInputs
            sections={sectionKeys}
            values={english.sections}
            onChange={(next) => onEnglishChange?.({ sections: next })}
          />
        )}
      </div>
    );
  }

  if (aptitude) {
    const label = testLabel(aptitude.test_id);
    const legacyKey = testIdToLegacyAptitude(aptitude.test_id);
    const sectionKeys = OTHER_TEST_SECTIONS[legacyKey] ?? [];

    if (mode === "view") {
      return (
        <div className={cn("rounded-lg border p-3", className)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{label}</span>
            {aptitude.status && <Badge variant="secondary">{aptitude.status}</Badge>}
            {aptitude.overall && (
              <span className="text-sm font-semibold tabular-nums">{aptitude.overall}</span>
            )}
          </div>
          <ScoreChips sections={aptitude.sections} />
        </div>
      );
    }
    return (
      <div className={cn("rounded-lg border p-3 space-y-3", className)}>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={aptitude.status ?? ""}
              onValueChange={(v) => onAptitudeChange?.({ status: v as ProfileTestStatus })}
            >
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{label} overall</Label>
            <Input
              className="h-8 w-24"
              value={aptitude.overall ?? ""}
              onChange={(e) => onAptitudeChange?.({ overall: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Test date</Label>
            <Input
              type="date"
              className="h-8 w-36"
              value={aptitude.test_date ?? ""}
              onChange={(e) => onAptitudeChange?.({ test_date: e.target.value || null })}
            />
          </div>
        </div>
        {sectionKeys.length > 0 && (
          <SectionalInputs
            sections={sectionKeys}
            values={aptitude.sections}
            onChange={(next) => onAptitudeChange?.({ sections: next })}
          />
        )}
      </div>
    );
  }

  if (language) {
    const label = testLabel(language.test_id);
    if (mode === "view") {
      return (
        <div className={cn("rounded-lg border p-3", className)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{label}</span>
            {language.exam_type && <Badge variant="outline">{language.exam_type}</Badge>}
            {language.status && <Badge variant="secondary">{language.status}</Badge>}
          </div>
          <ScoreChips sections={language.sections} />
        </div>
      );
    }
    return (
      <div className={cn("rounded-lg border p-3 space-y-3", className)}>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label>Exam type</Label>
            <Input
              className="h-8 max-w-xs"
              value={language.exam_type ?? ""}
              onChange={(e) => onLanguageChange?.({ exam_type: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>CEFR level</Label>
            <Input
              className="h-8 w-24"
              value={language.cefr_level ?? ""}
              onChange={(e) => onLanguageChange?.({ cefr_level: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Overall score</Label>
            <Input
              className="h-8 w-24"
              value={language.overall_score ?? ""}
              onChange={(e) => onLanguageChange?.({ overall_score: e.target.value || null })}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
