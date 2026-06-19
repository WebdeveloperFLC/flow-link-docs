import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OTHER_TEST_SECTIONS, LrwsScoreInputs, SectionalInputs } from "@/lib/testSections";
import { STANDARD_LRWS_SECTIONS } from "@/lib/profile/types";
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
  const hideAll = status === "waived";
  const hideScores = status === "waived" || status === "not_taken" || !status;
  const exam = b.exam_type ?? "";
  const sectionKey = exam ? meta.sectionKey(exam) : "";
  const sections = OTHER_TEST_SECTIONS[sectionKey] ?? OTHER_TEST_SECTIONS.DELF ?? [];

  const patch = (p: Partial<LanguageTestBlock>) => onChange({ ...b, ...p });

  if (hideAll) {
    return (
      <div className="border rounded-md p-4 space-y-3 bg-muted/10">
        <Label className="text-sm font-semibold">{meta.title}</Label>
        <div className="space-y-1 max-w-xs">
          <Label className="text-xs">Status</Label>
          <Select
            value={status ?? ""}
            onValueChange={(v) => patch({ status: (v || null) as LanguageTestStatus | null })}
          >
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{LANGUAGE_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 space-y-3 bg-muted/10">
      <Label className="text-sm font-semibold">{meta.title}</Label>

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
              }}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={status ?? ""}
            onValueChange={(v) => patch({ status: (v || null) as LanguageTestStatus | null })}
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
            onValueChange={(v) => patch({ cefr_level: (v || null) as LanguageTestBlock["cefr_level"] })}
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

      {!hideScores && exam && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          {STANDARD_LRWS_SECTIONS.every((key) => sections.includes(key)) ? (
            <LrwsScoreInputs
              showOverall
              overall={b.overall_score}
              onOverallChange={(value) => patch({ overall_score: value })}
              sections={sections}
              values={b.sections}
              onSectionsChange={(next) => patch({ sections: next })}
              onBlur={commit}
            />
          ) : (
            <>
              <div className="space-y-1 max-w-xs">
                <Label className="text-xs">Overall score</Label>
                <Input
                  value={b.overall_score ?? ""}
                  onChange={(e) => patch({ overall_score: e.target.value })}
                  onBlur={commit}
                />
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
