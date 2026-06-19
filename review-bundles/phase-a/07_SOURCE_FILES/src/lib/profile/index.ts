/**
 * Public profile domain API — single entry for consumers (hooks/UI in Phase B+).
 */
export { getProfileViewModel } from "@/lib/profile/getProfileViewModel";
export { toEditState } from "@/lib/profile/toEditState";
export { profileSave } from "@/lib/profile/profileSave";
export { computeCompletion, completionForSection } from "@/lib/profile/profileCompletion";
export { summarizeProfile, summarizeProfileSection, summarizeProfileFor360 } from "@/lib/profile/summarizeProfile";
export { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
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
} from "@/lib/profile/types";
