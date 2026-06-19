/**
 * Public profile domain API — single entry for consumers (hooks/UI in Phase B+).
 */
export { getProfileViewModel } from "@/lib/profile/getProfileViewModel";
export { toEditState } from "@/lib/profile/toEditState";
export { profileSave } from "@/lib/profile/profileSave";
export { computeCompletion, completionForSection } from "@/lib/profile/profileCompletion";
export { summarizeProfile, summarizeProfileSection, summarizeProfileFor360 } from "@/lib/profile/summarizeProfile";
export { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
export { buildProfileServicesSummary } from "@/lib/profile/profileServicesSummary";
export {
  CLIENT_360_SECTIONS,
  getClient360Section,
  getClient360Sections,
} from "@/lib/profile/client360Sections";
export type { Client360SectionDefinition, Client360SectionId } from "@/lib/profile/client360Sections";
export {
  testLabel,
  legacyEnglishToTestId,
  testIdToLegacyEnglish,
  legacyAptitudeToTestId,
  testIdToLegacyAptitude,
} from "@/lib/profile/profileTestCatalog";
export type {
  ProfileViewModel,
  ProfileEditState,
  ProfileSectionId,
  ProfileCompletionResult,
  ProfileSectionSummary,
  ProfileLinkedDocument,
  ProfileEducationRecord,
  ProfileExperienceRecord,
  ProfileTestStatus,
  ProfileTestId,
  ProfileEnglishTestId,
  ProfileAptitudeTestId,
  ProfileLanguageTestId,
  ProfileServicesSummary,
  ProfileViewModelMeta,
  TestAttempt,
} from "@/lib/profile/types";
export {
  migrateLegacyToAttempts,
  mergeLegacyEditsIntoAttempts,
  attemptsToLegacyMirror,
  attemptsToStoragePayload,
  buildProfileTests,
  deriveLegacyTestsFromAttempts,
  createEmptyAttempt,
  attemptsForTestId,
  formatAttemptSummary,
  defaultAttemptIdForTest,
} from "@/lib/profile/testAttempts";
export { visibilityForAttemptStatus, statusLabel, attemptHasStoredScores, editShowsScoreFields } from "@/lib/profile/testAttemptFormRules";
export { ensureAttemptId, testAttemptRefKey } from "@/lib/profile/profileRecordIds";
