import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  Duolingo: [],
  None: [],
};

export const OTHER_TEST_SECTIONS: Record<string, string[]> = {
  GRE: ["verbal", "quant", "awa"],
  GMAT: ["verbal", "quant", "ir", "awa"],
  SAT: ["math", "ebrw"],
  ACT: ["english", "math", "reading", "science"],
  DELF: ["listening", "reading", "writing", "speaking"],
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
  } as Record<string, string>)[s] ?? s.charAt(0).toUpperCase() + s.slice(1);

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