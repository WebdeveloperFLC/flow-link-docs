import { useMasterItems } from "@/lib/masters";

/** A letter kind code is now any string defined in the `letter_kinds` master list. */
export type LetterKind = string;

export interface LetterKindDef {
  kind: LetterKind;
  label: string;
  description: string;
}

/** Hardcoded fallback used until the masters cache loads (avoids an empty UI flash). */
export const FALLBACK_LETTER_KINDS: LetterKindDef[] = [
  { kind: "cover", label: "Applicant Cover Letter", description: "Letter of explanation written in the client's voice." },
  { kind: "rcic", label: "RCIC Submission Letter", description: "Submission letter signed by the RCIC on the firm's letterhead." },
  { kind: "statdec", label: "Statutory Declaration", description: "Sworn declaration by sponsor / family member in Canadian legal format." },
];

/** React hook — returns letter kinds from the `letter_kinds` master list. */
export function useLetterKinds(): LetterKindDef[] {
  const items = useMasterItems("letter_kinds" as never);
  if (!items.length) return FALLBACK_LETTER_KINDS;
  return items.map((it) => ({
    kind: it.code,
    label: it.label,
    description: (it.metadata as { description?: string } | null)?.description ?? "",
  }));
}