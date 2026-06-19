import type { ProfileTestCategory, ProfileTestStatus } from "@/lib/profile/types";

export interface AttemptFormVisibility {
  showNotes: boolean;
  showPlannedMonth: boolean;
  showTargetIntake: boolean;
  showTestDate: boolean;
  showResultDate: boolean;
  showExpiryDate: boolean;
  showOverall: boolean;
  showSectionals: boolean;
  showDocuments: boolean;
  showVariant: boolean;
  showCountry: boolean;
  showExamCentre: boolean;
  showWaiverReason: boolean;
  showExamType: boolean;
  showCefr: boolean;
  showExpiredBanner: boolean;
}

const HIDDEN: AttemptFormVisibility = {
  showNotes: false,
  showPlannedMonth: false,
  showTargetIntake: false,
  showTestDate: false,
  showResultDate: false,
  showExpiryDate: false,
  showOverall: false,
  showSectionals: false,
  showDocuments: false,
  showVariant: false,
  showCountry: false,
  showExamCentre: false,
  showWaiverReason: false,
  showExamType: false,
  showCefr: false,
  showExpiredBanner: false,
};

/** Status-driven field visibility per Phase E governing spec. */
export function visibilityForAttemptStatus(
  status: ProfileTestStatus | null | undefined,
  category: ProfileTestCategory,
): AttemptFormVisibility {
  const s = status ?? "not_taken";
  const isLanguage = category === "language";

  switch (s) {
    case "not_taken":
      return { ...HIDDEN, showNotes: true };
    case "planned":
      return {
        ...HIDDEN,
        showPlannedMonth: true,
        showTargetIntake: true,
        showNotes: true,
        showTestDate: true,
      };
    case "scheduled":
      return {
        ...HIDDEN,
        showTestDate: true,
        showCountry: !isLanguage,
        showExamCentre: true,
        showNotes: true,
        showExamType: isLanguage,
        showVariant: false,
      };
    case "result_awaited":
      return {
        ...HIDDEN,
        showTestDate: true,
        showResultDate: true,
        showNotes: true,
        showExamType: isLanguage,
      };
    case "taken":
      return {
        ...HIDDEN,
        showTestDate: true,
        showExpiryDate: true,
        showOverall: true,
        showSectionals: true,
        showDocuments: true,
        showVariant: false,
        showCountry: !isLanguage,
        showExamType: isLanguage,
        showCefr: isLanguage,
        showNotes: true,
      };
    case "expired":
      return {
        ...HIDDEN,
        showTestDate: true,
        showExpiryDate: true,
        showOverall: true,
        showSectionals: true,
        showDocuments: true,
        showExpiredBanner: true,
        showVariant: false,
        showCountry: !isLanguage,
        showExamType: isLanguage,
        showCefr: isLanguage,
        showNotes: true,
      };
    case "waived":
      return {
        ...HIDDEN,
        showWaiverReason: true,
        showNotes: true,
        showExamType: isLanguage,
      };
    default:
      return { ...HIDDEN, showNotes: true };
  }
}

export function statusLabel(status: ProfileTestStatus | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

/** True when attempt already has score data saved (keep fields visible in edit). */
export function attemptHasStoredScores(attempt: {
  overall_score?: string | null;
  sections?: Readonly<Record<string, string>>;
}): boolean {
  return !!(
    (attempt.overall_score && attempt.overall_score.trim()) ||
    Object.values(attempt.sections ?? {}).some((v) => v?.trim())
  );
}

/** Edit mode: show score inputs when status allows OR existing scores must remain editable. */
export function editShowsScoreFields(
  status: ProfileTestStatus | null | undefined,
  attempt: { overall_score?: string | null; sections?: Readonly<Record<string, string>> },
): boolean {
  const vis = visibilityForAttemptStatus(status, "english");
  if (vis.showOverall || vis.showSectionals) return true;
  return attemptHasStoredScores(attempt);
}

/** @deprecated Use always-show variant in edit for IELTS instead. */
export function showIeltsVariant(
  testId: string,
  status: ProfileTestStatus | null | undefined,
): boolean {
  if (testId !== "ielts") return false;
  const s = status ?? "not_taken";
  return s === "taken" || s === "expired";
}
