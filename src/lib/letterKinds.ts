export type LetterKind = "cover" | "rcic" | "statdec";

export const LETTER_KINDS: { kind: LetterKind; label: string; description: string }[] = [
  { kind: "cover", label: "Applicant Cover Letter", description: "Letter of explanation written in the client's voice." },
  { kind: "rcic", label: "RCIC Submission Letter", description: "Submission letter signed by the RCIC on the firm's letterhead." },
  { kind: "statdec", label: "Statutory Declaration", description: "Sworn declaration by sponsor / family member in Canadian legal format." },
];

export const KIND_BY: Record<LetterKind, { label: string; description: string }> =
  Object.fromEntries(LETTER_KINDS.map((l) => [l.kind, { label: l.label, description: l.description }])) as never;