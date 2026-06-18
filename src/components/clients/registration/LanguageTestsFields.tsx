import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OTHER_TEST_SECTIONS, SectionalInputs } from "@/lib/testSections";
import {
  CEFR_LEVELS,
  FRENCH_EXAMS,
  GERMAN_EXAMS,
  LANGUAGE_STATUS_LABELS,
  type LanguageCode,
  type LanguageTestBlock,
  type LanguageTestsValue,
  type LanguageTestStatus,
} from "@/lib/languageTests";

const STATUS_OPTIONS: LanguageTestStatus[] = ["not_taken", "scheduled", "taken", "waived"];

const BLOCK_META: Record<
  LanguageCode,
  { title: string; exams: string[]; sectionKey: (exam: string) => string }
> = {
  french: {
    title: "French",
    exams: FRENCH_EXAMS,
    sectionKey: (exam) => {
      if (["DELF", "DALF", "TCF", "TEF"].includes(exam)) return exam;
      return "DELF";
    },
  },
  german: {
    title: "German",
    exams: GERMAN_EXAMS,
    sectionKey: (exam) => {
      if (exam === "TestDaF") return "TestDaF";
      if (exam === "Goethe") return "Goethe";
      return "TestDaF";
    },
  },
};

interface Props {
  value: LanguageTestsValue;
  onChange: (patch: Partial<LanguageTestsValue>) => void;
  onCommit?: () => void;
}

function LanguageBlock({
  language,
  block,
  onChange,
  onCommit,
}: {
  language: LanguageCode;
  block: LanguageTestBlock | null | undefined;
  onChange: (next: LanguageTestBlock | null) => void;
  onCommit?: () => void;
}) {
  const meta = BLOCK_META[language];
  const commit = () => onCommit?.();
  const b = block ?? {};
  const status = b.status ?? null;
  const hideFields = status === "waived" || status === "not_taken";
  const exam = b.exam_type ?? "";
  const sectionKey = exam ? meta.sectionKey(exam) : "";
  const sections = OTHER_TEST_SECTIONS[sectionKey] ?? OTHER_TEST_SECTIONS.DELF ?? [];

  const patch = (p: Partial<LanguageTestBlock>) => onChange({ ...b, ...p });

  return (
    <div className="border rounded-md p-4 space-y-3 bg-muted/10">
      <Label className="text-sm font-semibold">{meta.title}</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={status ?? ""}
            onValueChange={(v) => {
              patch({ status: (v || null) as LanguageTestStatus | null });
              setTimeout(commit, 0);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{LANGUAGE_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CEFR level</Label>
          <Select
            value={b.cefr_level ?? ""}
            onValueChange={(v) => {
              patch({ cefr_level: (v || null) as LanguageTestBlock["cefr_level"] });
              setTimeout(commit, 0);
            }}
          >
            <SelectTrigger><SelectValue placeholder="A1 – C2" /></SelectTrigger>
            <SelectContent>
              {CEFR_LEVELS.map((lvl) => (
                <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hideFields && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Exam</Label>
            <div className="flex flex-wrap gap-1.5">
              {meta.exams.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={exam === t ? "default" : "outline"}
                  onClick={() => {
                    const next = t === exam ? null : t;
                    const p: Partial<LanguageTestBlock> = { exam_type: next };
                    if (next && !status) p.status = "taken";
                    patch(p);
                    setTimeout(commit, 0);
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          {exam && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Overall score</Label>
                  <Input
                    value={b.overall_score ?? ""}
                    onChange={(e) => patch({ overall_score: e.target.value })}
                    onBlur={commit}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Test date</Label>
                  <Input
                    type="date"
                    value={b.test_date ?? ""}
                    onChange={(e) => patch({ test_date: e.target.value || null })}
                    onBlur={commit}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expiry date</Label>
                  <Input
                    type="date"
                    value={b.expiry_date ?? ""}
                    onChange={(e) => patch({ expiry_date: e.target.value || null })}
                    onBlur={commit}
                  />
                </div>
              </div>
              {sections.length > 0 && (
                <SectionalInputs
                  sections={sections}
                  values={b.sections}
                  onChange={(next) => patch({ sections: next })}
                  onBlur={commit}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export function LanguageTestsFields({ value, onChange, onCommit }: Props) {
  return (
    <div className="space-y-4">
      <LanguageBlock
        language="french"
        block={value.french}
        onChange={(next) => onChange({ french: next })}
        onCommit={onCommit}
      />
      <LanguageBlock
        language="german"
        block={value.german}
        onChange={(next) => onChange({ german: next })}
        onCommit={onCommit}
      />
    </div>
  );
}
