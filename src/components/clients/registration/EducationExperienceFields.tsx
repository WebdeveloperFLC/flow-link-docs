import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  ENGLISH_SECTIONS,
  OTHER_TEST_SECTIONS,
  SectionalInputs,
} from "@/lib/testSections";
import { LocationCascadeFields } from "@/components/shared/LocationCascadeFields";
import type { EducationEntry, ExperienceEntry } from "@/lib/clientRegistration";
import { useMasterItems } from "@/lib/masters";
import type { EnglishTestStatus } from "@/lib/leadBackground";
import { ENGLISH_TEST_STATUS_LABELS, englishTestEntryHasData, getEnglishTestsByType } from "@/lib/leadBackground";
import {
  buildEnglishScorePatch,
  buildEnglishStatusPatch,
  buildEnglishTestSwitchPatch,
  mergeEnglishSectionMetadata,
  readEnglishSectionMetadata,
  sectionalScoresOnly,
} from "@/lib/englishTestScores";
import type { IeltsTestType, IeltsVariant } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

const ENGLISH_TESTS = ["IELTS", "PTE", "TOEFL", "CELPIP", "Duolingo"];
const OTHER_TESTS = ["GRE", "GMAT", "SAT"];
const ENGLISH_STATUSES: EnglishTestStatus[] = ["not_taken", "scheduled", "taken", "waived"];

function normalizePassingYearInput(year?: string | null): string {
  if (!year?.trim()) return "";
  const v = year.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 4);
  return v.replace(/\D/g, "").slice(0, 4);
}

export interface EducationExperienceValue {
  education_history: EducationEntry[];
  english_test: string | null;
  english_test_status?: EnglishTestStatus | null;
  english_overall: string | null;
  english_test_date: string | null;
  english_test_expiry: string | null;
  english_sections: Record<string, unknown>;
  other_tests: Array<{ type: string; score?: string; date?: string; sections?: Record<string, string> }>;
  work_experience: ExperienceEntry[];
}

export type EducationExperienceSection = "english" | "academic" | "education" | "experience";

interface Props {
  value: EducationExperienceValue;
  onChange: (patch: Partial<EducationExperienceValue>) => void;
  onCommit?: () => void;
  compact?: boolean;
  visibleSections?: EducationExperienceSection[];
}

export const EducationExperienceFields = ({
  value,
  onChange,
  onCommit,
  compact,
  visibleSections = ["english", "academic", "education", "experience"],
}: Props) => {
  const qualificationLevels = useMasterItems("qualification_levels");
  const commit = () => onCommit?.();
  const englishTest = value.english_test ?? "";
  const englishStatus = value.english_test_status ?? null;
  const hideEnglishFields = englishStatus === "waived" || englishStatus === "not_taken";
  const hasEnglishTest = !!englishTest && englishTest !== "None";
  const show = (section: EducationExperienceSection) => visibleSections.includes(section);

  const education = value.education_history ?? [];
  const setEducation = (next: EducationEntry[]) => onChange({ education_history: next });
  const addEducation = () => { setEducation([...education, {}]); setTimeout(commit, 0); };
  const removeEducation = (i: number) => { setEducation(education.filter((_, idx) => idx !== i)); setTimeout(commit, 0); };
  const patchEducation = (i: number, p: Partial<EducationEntry>) => {
    const next = [...education];
    next[i] = { ...next[i], ...p };
    setEducation(next);
  };

  const otherTests = value.other_tests ?? [];
  const setOtherTests = (next: typeof otherTests) => onChange({ other_tests: next });

  const experience = value.work_experience ?? [];
  const setExperience = (next: ExperienceEntry[]) => onChange({ work_experience: next });
  const addExperience = () => { setExperience([...experience, { currently_working: false }]); setTimeout(commit, 0); };
  const removeExperience = (i: number) => { setExperience(experience.filter((_, idx) => idx !== i)); setTimeout(commit, 0); };
  const patchExperience = (i: number, p: Partial<ExperienceEntry>) => {
    const next = [...experience];
    next[i] = { ...next[i], ...p };
    setExperience(next);
  };

  const englishSecs = ENGLISH_SECTIONS[englishTest] ?? [];
  const englishSectionValues = sectionalScoresOnly(value.english_sections);
  const englishMetadata = readEnglishSectionMetadata(value.english_sections);
  const isIelts = englishTest === "IELTS";
  const patchEnglishMetadata = (meta: Partial<typeof englishMetadata>) => {
    onChange({
      english_sections: mergeEnglishSectionMetadata(value.english_sections ?? {}, {
        ...englishMetadata,
        ...meta,
      }),
    });
    setTimeout(commit, 0);
  };
  const patchEnglishScores = (
    patch: Partial<Pick<EducationExperienceValue, "english_overall" | "english_test_date" | "english_test_expiry" | "english_sections">>,
  ) => onChange(buildEnglishScorePatch(value, patch) as Partial<EducationExperienceValue>);

  const englishTestsByType = getEnglishTestsByType(value);

  const switchEnglishTest = (next: string | null) => {
    const patch = buildEnglishTestSwitchPatch(value, next);
    onChange({
      english_test: patch.english_test ?? null,
      english_test_status: patch.english_test_status ?? null,
      english_overall: patch.english_overall ?? null,
      english_test_date: patch.english_test_date ?? null,
      english_test_expiry: patch.english_test_expiry ?? null,
      english_sections: patch.english_sections ?? {},
    });
    setTimeout(commit, 0);
  };

  return (
    <div className="space-y-5">
      {show("education") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Education History</Label>
            <Button type="button" size="sm" variant="outline" onClick={addEducation}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          {education.length === 0 && (
            <div className="border border-dashed rounded-md p-4 text-center text-xs text-muted-foreground">
              No education entries yet.
            </div>
          )}
          {education.map((e, i) => (
            <div key={i} className="border rounded-md p-3 space-y-3 bg-muted/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {i === 0 ? "Most recent (primary)" : `Entry ${i + 1}`}
                </span>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeEducation(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className={`grid grid-cols-1 ${compact ? "md:grid-cols-2" : "md:grid-cols-3"} gap-3`}>
                <div className="space-y-1">
                  <Label className="text-xs">Level</Label>
                  <Select value={e.level ?? ""} onValueChange={(v) => { patchEducation(i, { level: v }); setTimeout(commit, 0); }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {qualificationLevels.map((q) => <SelectItem key={q.code} value={q.code}>{q.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Institution</Label>
                  <Input value={e.institution ?? ""} onChange={(ev) => patchEducation(i, { institution: ev.target.value })} onBlur={commit} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Year of Passing</Label>
                  <Input
                    type="number"
                    min={1950}
                    max={2100}
                    placeholder="e.g. 2024"
                    value={normalizePassingYearInput(e.year)}
                    onChange={(ev) =>
                      patchEducation(i, { year: ev.target.value ? String(ev.target.value) : null })
                    }
                    onBlur={commit}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Percentage / CGPA</Label>
                  <Input value={e.percentage_cgpa ?? ""} onChange={(ev) => patchEducation(i, { percentage_cgpa: ev.target.value })} onBlur={commit} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Specialization</Label>
                  <Input value={e.specialization ?? ""} onChange={(ev) => patchEducation(i, { specialization: ev.target.value })} onBlur={commit} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-3">
                <LocationCascadeFields
                  value={{
                    country: e.country,
                    state_province: e.state_province,
                    province_code: e.province_code,
                    city: e.city,
                  }}
                  onChange={(patch) => patchEducation(i, patch)}
                  onCommit={commit}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {show("english") && (
        <>
          <div className={`space-y-3 ${show("education") ? "border-t pt-4" : ""}`}>
            <Label className="text-sm font-semibold">English Test</Label>
            <div className="flex flex-wrap gap-1.5">
              {ENGLISH_TESTS.map((t) => {
                const entry = englishTestsByType[t];
                const filled = englishTestEntryHasData(entry);
                const active = englishTest === t;
                const scoreHint = entry?.overall?.trim();
                return (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={active ? "default" : filled ? "secondary" : "outline"}
                    className={cn(
                      "h-8 text-xs font-normal",
                      !active && filled && "border-primary/40",
                    )}
                    onClick={() => switchEnglishTest(t)}
                  >
                    {filled && !active && (
                      <span className="mr-1.5 size-1.5 rounded-full bg-primary shrink-0" aria-hidden />
                    )}
                    {t}
                    {scoreHint ? ` · ${scoreHint}` : ""}
                  </Button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
              <div className="space-y-1">
                <Label className="text-xs">Test type</Label>
                <Select
                  value={englishTest || "__none__"}
                  onValueChange={(v) => switchEnglishTest(v === "__none__" ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {ENGLISH_TESTS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasEnglishTest && (
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={englishStatus ?? ""}
                    onValueChange={(v) => {
                      const status = (v || null) as EnglishTestStatus | null;
                      const patch = buildEnglishStatusPatch(value, status);
                      onChange({
                        english_test_status: patch.english_test_status ?? null,
                        english_sections: patch.english_sections ?? value.english_sections,
                      });
                      setTimeout(commit, 0);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {ENGLISH_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{ENGLISH_TEST_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {hasEnglishTest && isIelts && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">IELTS variant</Label>
                    <Select
                      value={englishMetadata.ielts_variant ?? ""}
                      onValueChange={(v) =>
                        patchEnglishMetadata({ ielts_variant: (v || null) as IeltsVariant | null })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Academic">Academic</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Test Type</Label>
                    <Select
                      value={englishMetadata.ielts_test_type ?? ""}
                      onValueChange={(v) =>
                        patchEnglishMetadata({ ielts_test_type: (v || null) as IeltsTestType | null })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Select test type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CBT">CBT (Computer-Based Test)</SelectItem>
                        <SelectItem value="PBT">PBT (Paper-Based Test)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            {!hideEnglishFields && hasEnglishTest && (
              <div className="space-y-3 pt-1">
                {isIelts ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
                      <div className="space-y-1">
                        <Label className="text-xs">Test Date</Label>
                        <Input type="date" value={value.english_test_date ?? ""} onChange={(e) => patchEnglishScores({ english_test_date: e.target.value || null })} onBlur={commit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Expiry Date</Label>
                        <Input type="date" value={value.english_test_expiry ?? ""} onChange={(e) => patchEnglishScores({ english_test_expiry: e.target.value || null })} onBlur={commit} />
                      </div>
                    </div>
                    <div className="space-y-3" data-testid="ielts-scores-block">
                      <div className="space-y-1 max-w-xs">
                        <Label className="text-xs">Overall Score</Label>
                        <Input value={value.english_overall ?? ""} onChange={(e) => patchEnglishScores({ english_overall: e.target.value })} onBlur={commit} />
                      </div>
                      {englishSecs.length > 0 && (
                        <SectionalInputs
                          sections={englishSecs}
                          values={englishSectionValues}
                          onChange={(next) => patchEnglishScores({ english_sections: next })}
                          onBlur={commit}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Overall Score</Label>
                        <Input value={value.english_overall ?? ""} onChange={(e) => patchEnglishScores({ english_overall: e.target.value })} onBlur={commit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Test Date</Label>
                        <Input type="date" value={value.english_test_date ?? ""} onChange={(e) => patchEnglishScores({ english_test_date: e.target.value || null })} onBlur={commit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Expiry Date</Label>
                        <Input type="date" value={value.english_test_expiry ?? ""} onChange={(e) => patchEnglishScores({ english_test_expiry: e.target.value || null })} onBlur={commit} />
                      </div>
                    </div>
                    {englishSecs.length > 0 && (
                      <SectionalInputs
                        sections={englishSecs}
                        values={englishSectionValues}
                        onChange={(next) => patchEnglishScores({ english_sections: next })}
                        onBlur={commit}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {show("academic") && (
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-semibold">Academic Tests (optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {OTHER_TESTS.map((t) => {
                const sel = otherTests.find((x) => x.type === t);
                return (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={sel ? "default" : "outline"}
                    onClick={() => {
                      const next = sel
                        ? otherTests.filter((x) => x.type !== t)
                        : [...otherTests, { type: t, score: "", date: "", sections: {} }];
                      setOtherTests(next);
                      setTimeout(commit, 0);
                    }}
                  >
                    {t}
                  </Button>
                );
              })}
            </div>
            {otherTests.map((ot, idx) => {
              const secs = OTHER_TEST_SECTIONS[ot.type] ?? [];
              return (
                <div key={ot.type} className="border rounded-md p-3 space-y-3 bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="text-sm font-medium">{ot.type}</div>
                    <div className="space-y-1">
                      <Label className="text-xs">Overall Score</Label>
                      <Input
                        value={ot.score ?? ""}
                        onChange={(e) => {
                          const next = [...otherTests];
                          next[idx] = { ...ot, score: e.target.value };
                          setOtherTests(next);
                        }}
                        onBlur={commit}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Test Date</Label>
                      <Input
                        type="date"
                        value={ot.date ?? ""}
                        onChange={(e) => {
                          const next = [...otherTests];
                          next[idx] = { ...ot, date: e.target.value };
                          setOtherTests(next);
                          setTimeout(commit, 0);
                        }}
                      />
                    </div>
                  </div>
                  {secs.length > 0 && (
                    <SectionalInputs
                      sections={secs}
                      values={ot.sections}
                      onChange={(next) => {
                        const list = [...otherTests];
                        list[idx] = { ...ot, sections: next };
                        setOtherTests(list);
                      }}
                      onBlur={commit}
                    />
                  )}
                </div>
              );
            })}
          </div>
          )}
        </>
      )}

      {show("experience") && (
        <div className={`space-y-3 ${show("education") || show("english") || show("academic") ? "border-t pt-4" : ""}`}>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Work Experience</Label>
            <Button type="button" size="sm" variant="outline" onClick={addExperience}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          {experience.length === 0 && (
            <div className="border border-dashed rounded-md p-4 text-center text-xs text-muted-foreground">
              No experience entries yet.
            </div>
          )}
          {experience.map((x, i) => (
            <div key={i} className="border rounded-md p-3 space-y-3 bg-muted/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Entry {i + 1}</span>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeExperience(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className={`grid grid-cols-1 ${compact ? "md:grid-cols-2" : "md:grid-cols-3"} gap-3`}>
                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Input value={x.company ?? ""} onChange={(e) => patchExperience(i, { company: e.target.value })} onBlur={commit} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role / Title</Label>
                  <Input value={x.role ?? ""} onChange={(e) => patchExperience(i, { role: e.target.value })} onBlur={commit} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={x.start_date ?? ""} onChange={(e) => { patchExperience(i, { start_date: e.target.value || null }); setTimeout(commit, 0); }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={x.end_date ?? ""} disabled={!!x.currently_working} onChange={(e) => { patchExperience(i, { end_date: e.target.value || null }); setTimeout(commit, 0); }} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-3">
                <LocationCascadeFields
                  value={{
                    country: x.country,
                    state_province: x.state_province,
                    province_code: x.province_code,
                    city: x.city,
                  }}
                  onChange={(patch) => patchExperience(i, patch)}
                  onCommit={commit}
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-end gap-2 text-xs pb-2">
                  <Checkbox
                    checked={!!x.currently_working}
                    onCheckedChange={(c) => {
                      patchExperience(i, { currently_working: !!c, end_date: c ? null : x.end_date ?? null });
                      setTimeout(commit, 0);
                    }}
                  />
                  Currently working here
                </label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={x.description ?? ""} onChange={(e) => patchExperience(i, { description: e.target.value })} onBlur={commit} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};