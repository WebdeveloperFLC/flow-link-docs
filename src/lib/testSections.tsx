import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Sectional score definitions for every test we collect at the client stage.
 * Field names are reused as-is between primary applicant and co-applicants —
 * the form, the JSON payload and the DB column all share the same names.
 */
export const ENGLISH_SECTIONS: Record<string, string[]> = {
  IELTS: ["listening", "reading", "writing", "speaking"],
  PTE: ["listening", "reading", "writing", "speaking"],
  TOEFL: ["listening", "reading", "writing", "speaking"],
  CELPIP: ["listening", "reading", "writing", "speaking"],
  Duolingo: ["literacy", "comprehension", "conversation", "production"],
  None: [],
};

export const OTHER_TEST_SECTIONS: Record<string, string[]> = {
  GRE: ["verbal", "quant", "awa"],
  GMAT: ["quant", "verbal", "data_insights"],
  SAT: ["math", "ebrw"],
  ACT: ["english", "math", "reading", "science"],
  DELF: ["listening", "reading", "writing", "speaking"],
  DALF: ["listening", "reading", "writing", "speaking"],
  TestDaF: ["listening", "reading", "writing", "speaking"],
  Goethe: ["listening", "reading", "writing", "speaking"],
  TCF: ["listening", "reading", "writing", "speaking"],
  TEF: ["listening", "reading", "writing", "speaking"],
};

const labelCase = (s: string) =>
  ({
    awa: "AWA",
    ir: "IR",
    ebrw: "EBRW",
    data_insights: "Data Insights",
  } as Record<string, string>)[s] ?? s.charAt(0).toUpperCase() + s.slice(1);

interface LrwsScoreInputsProps {
  showOverall: boolean;
  overall: string | null | undefined;
  onOverallChange: (value: string | null) => void;
  sections: readonly string[];
  values: Record<string, string> | undefined;
  onSectionsChange: (next: Record<string, string>) => void;
  onBlur?: () => void;
}

/** Overall score first, then Listening / Reading / Writing / Speaking. */
export const LrwsScoreInputs = ({
  showOverall,
  overall,
  onOverallChange,
  sections,
  values,
  onSectionsChange,
  onBlur,
}: LrwsScoreInputsProps) => {
  const v = values ?? {};
  const cols = showOverall ? sections.length + 1 : sections.length;
  const gridClass =
    cols >= 5 ? "grid-cols-2 md:grid-cols-5" : cols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2";

  return (
    <div className={cn("grid gap-3", gridClass)}>
      {showOverall && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Overall score</Label>
          <Input
            value={overall ?? ""}
            onChange={(e) => onOverallChange(e.target.value || null)}
            onBlur={onBlur}
          />
        </div>
      )}
      {sections.map((s) => (
        <div key={s} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{labelCase(s)}</Label>
          <Input
            value={v[s] ?? ""}
            onChange={(e) => onSectionsChange({ ...v, [s]: e.target.value })}
            onBlur={onBlur}
          />
        </div>
      ))}
    </div>
  );
};

interface SectionalInputsProps {
  sections: string[];
  values: Record<string, string> | undefined;
  onChange: (next: Record<string, string>) => void;
  onBlur?: () => void;
}

export const SectionalInputs = ({ sections, values, onChange, onBlur }: SectionalInputsProps) => {
  if (!sections.length) return null;
  const v = values ?? {};
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {sections.map((s) => (
        <div key={s} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{labelCase(s)}</Label>
          <Input
            value={v[s] ?? ""}
            onChange={(e) => onChange({ ...v, [s]: e.target.value })}
            onBlur={onBlur}
          />
        </div>
      ))}
    </div>
  );
};