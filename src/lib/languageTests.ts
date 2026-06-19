import type { EnglishTestStatus } from "@/lib/leadBackground";

export type LanguageCode = "french" | "german";
export type LanguageTestStatus = EnglishTestStatus;
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface LanguageTestBlock {
  status?: LanguageTestStatus | null;
  cefr_level?: CefrLevel | null;
  exam_type?: string | null;
  overall_score?: string | null;
  test_date?: string | null;
  expiry_date?: string | null;
  sections?: Record<string, string>;
}

export interface LanguageTestsValue {
  french?: LanguageTestBlock | null;
  german?: LanguageTestBlock | null;
}

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const LANGUAGE_STATUS_LABELS: Record<LanguageTestStatus, string> = {
  not_taken: "Not taken",
  scheduled: "Scheduled",
  taken: "Taken",
  waived: "Waived",
};

export const FRENCH_EXAMS = ["DELF", "DALF", "TCF", "TEF"];
export const GERMAN_EXAMS = ["TestDaF", "Goethe", "DSH", "telc"];

export const EMPTY_LANGUAGE_TESTS: LanguageTestsValue = {
  french: null,
  german: null,
};

const FRENCH_LEGACY = new Set(["DELF", "DALF", "TCF", "TEF"]);
const GERMAN_LEGACY = new Set(["TESTDAF", "GOETHE", "DSH", "TELC"]);

function asBlock(raw: unknown): LanguageTestBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    status: (o.status as LanguageTestStatus | null | undefined) ?? null,
    cefr_level: (o.cefr_level as CefrLevel | null | undefined) ?? null,
    exam_type: (o.exam_type as string | null | undefined) ?? null,
    overall_score: (o.overall_score as string | null | undefined) ?? null,
    test_date: (o.test_date as string | null | undefined) ?? null,
    expiry_date: (o.expiry_date as string | null | undefined) ?? null,
    sections: (o.sections as Record<string, string> | undefined) ?? {},
  };
}

export function normalizeLanguageTests(raw: unknown): LanguageTestsValue {
  if (!raw || typeof raw !== "object") return { ...EMPTY_LANGUAGE_TESTS };
  const o = raw as Record<string, unknown>;
  return {
    french: asBlock(o.french),
    german: asBlock(o.german),
  };
}

type LegacyOtherTest = {
  type: string;
  score?: string;
  date?: string;
  sections?: Record<string, string>;
};

function legacyToBlock(type: string, row: LegacyOtherTest): LanguageTestBlock {
  return {
    status: row.score || row.date ? "taken" : "not_taken",
    exam_type: type,
    overall_score: row.score ?? null,
    test_date: row.date ?? null,
    sections: row.sections ?? {},
  };
}

/** Move DELF/TestDaF (etc.) out of other_tests into language_tests when loading legacy rows. */
export function absorbLegacyLanguageTests(
  languageTests: LanguageTestsValue,
  otherTests: LegacyOtherTest[] | undefined,
): { language_tests: LanguageTestsValue; other_tests: LegacyOtherTest[] } {
  let lt = normalizeLanguageTests(languageTests);
  const kept: LegacyOtherTest[] = [];
  for (const row of otherTests ?? []) {
    const t = (row.type ?? "").trim();
    const upper = t.toUpperCase();
    if (FRENCH_LEGACY.has(upper)) {
      if (!lt.french?.exam_type && !lt.french?.status) {
        lt = { ...lt, french: legacyToBlock(t, row) };
      }
      continue;
    }
    if (GERMAN_LEGACY.has(upper)) {
      if (!lt.german?.exam_type && !lt.german?.status) {
        lt = { ...lt, german: legacyToBlock(t === "TestDaF" ? "TestDaF" : t, row) };
      }
      continue;
    }
    kept.push(row);
  }
  return { language_tests: lt, other_tests: kept };
}

function summarizeBlock(label: string, block?: LanguageTestBlock | null): string | null {
  if (!block?.status && !block?.cefr_level && !block?.exam_type) return null;
  const status = block.status;
  if (status === "waived") return `${label}: waived`;
  if (status === "not_taken") return `${label}: not taken`;
  const parts: string[] = [label];
  if (block.cefr_level) parts.push(block.cefr_level);
  if (status === "scheduled") parts.push("scheduled");
  else if (status === "taken") parts.push("taken");
  if (block.exam_type) parts.push(block.exam_type);
  return parts.join(" · ");
}

export function summarizeLanguageTests(lt: LanguageTestsValue): string {
  const parts = [
    summarizeBlock("French", lt.french),
    summarizeBlock("German", lt.german),
  ].filter(Boolean) as string[];
  if (!parts.length) return "Not added";
  return parts.join("; ");
}

export function hasLanguageTestData(lt: LanguageTestsValue): boolean {
  return summarizeLanguageTests(lt) !== "Not added";
}

export type BackgroundDetailTab = "tests" | "education" | "experience" | "english" | "language";
