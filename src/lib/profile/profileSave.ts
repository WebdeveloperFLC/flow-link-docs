import { supabase } from "@/integrations/supabase/client";
import { PROFILE_FIELDS } from "@/lib/extractedFields";
import { ensureClientProfileSynced } from "@/lib/clientProfileSync";
import { syncAllProfileDocumentRefsIfAvailable } from "@/lib/profile/clientDocumentRefs";
import { formatProfileSaveError } from "@/lib/profile/profileSaveError";
import { syncEducationHistoryToClientEducation } from "@/lib/clientBackgroundSync";
import { getProfileViewModel } from "@/lib/profile/getProfileViewModel";
import {
  educationRecordsToJson,
  experienceRecordsToJson,
} from "@/lib/profile/normalizeProfile";
import {
  attemptsToLegacyMirror,
  attemptsToStoragePayload,
} from "@/lib/profile/testAttempts";
import {
  educationRefKey,
  experienceRefKey,
  testAttemptRefKey,
} from "@/lib/profile/profileRecordIds";
import type { ProfileEditState, ProfileSectionId, ProfileViewModel } from "@/lib/profile/types";
import { syncLastEducationFromBackground, yearOfPassingForDb } from "@/lib/leadBackground";

type ProfileField = (typeof PROFILE_FIELDS)[number];

const IDENTITY_PROFILE_KEYS: ProfileField[] = [
  "date_of_birth",
  "gender",
  "nationality",
  "place_of_birth",
  "marital_status",
  "spouse_name",
  "passport_number",
  "passport_country",
  "passport_issue_date",
  "passport_expiry",
];

const CONTACT_PROFILE_KEYS: ProfileField[] = [
  "phone_alt",
  "email_alt",
  "address_line1",
  "address_city",
  "address_state",
  "address_country",
  "address_postal",
  "emergency_contact_name",
  "emergency_contact_phone",
];

function pickProfilePatch(
  state: ProfileEditState,
  keys: ProfileField[],
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    const val =
      key in state.identity
        ? (state.identity as Record<string, unknown>)[key]
        : (state.contact as Record<string, unknown>)[key];
    patch[key] = val ?? null;
  }
  return patch;
}

type RefSyncEntry = {
  ref_key: string;
  linked_documents: { document_id: string; slot: string; label: string; linked_at?: string | null }[];
};

function collectRefSyncEntriesForSections(
  state: ProfileEditState,
  sections: Set<ProfileSectionId>,
): RefSyncEntry[] {
  const entries: RefSyncEntry[] = [];

  if (sections.has("tests")) {
  for (const a of state.tests.attempts) {
    entries.push({
      ref_key: testAttemptRefKey(a.test_id, a.attempt_id),
      linked_documents: a.linked_documents.map((d) => ({
        document_id: d.document_id,
        slot: d.slot,
        label: d.label,
        linked_at: d.linked_at,
      })),
    });
  }
  }

  if (sections.has("education")) {
  for (const edu of state.education) {
    entries.push({
      ref_key: educationRefKey(edu.id),
      linked_documents: edu.linked_documents.map((d) => ({
        document_id: d.document_id,
        slot: d.slot,
        label: d.label,
        linked_at: d.linked_at,
      })),
    });
  }
  }

  if (sections.has("experience")) {
  for (const exp of state.experience) {
    entries.push({
      ref_key: experienceRefKey(exp.id),
      linked_documents: exp.linked_documents.map((d) => ({
        document_id: d.document_id,
        slot: d.slot,
        label: d.label,
        linked_at: d.linked_at,
      })),
    });
  }
  }

  return entries;
}

function throwSaveError(step: string, error: unknown): never {
  throw new Error(formatProfileSaveError(error, step));
}

export interface ProfileSaveOptions {
  /** When set, only persist the given section(s). Default: all sections. */
  sections?: ProfileSectionId[];
}

export interface ProfileSaveResult {
  viewModel: ProfileViewModel;
}

/**
 * Persist ProfileEditState to clients + client_profile + client_document_refs.
 * Returns refreshed immutable ProfileViewModel.
 */
export async function profileSave(
  state: ProfileEditState,
  options: ProfileSaveOptions = {},
): Promise<ProfileSaveResult> {
  const clientId = state.clientId;
  const sections = new Set(options.sections ?? ["identity", "contact", "tests", "education", "experience"]);

  if (sections.has("identity") || sections.has("contact")) {
    const profilePatch: Record<string, unknown> = {};
    if (sections.has("identity")) Object.assign(profilePatch, pickProfilePatch(state, IDENTITY_PROFILE_KEYS));
    if (sections.has("contact")) Object.assign(profilePatch, pickProfilePatch(state, CONTACT_PROFILE_KEYS));

    const { error: profileErr } = await supabase
      .from("client_profile")
      .upsert({ client_id: clientId, ...profilePatch }, { onConflict: "client_id" });
    if (profileErr) throwSaveError("client_profile", profileErr);
  }

  const clientPatch: Record<string, unknown> = {};

  if (sections.has("identity")) {
    clientPatch.first_name = state.identity.first_name;
    clientPatch.middle_name = state.identity.middle_name;
    clientPatch.last_name = state.identity.last_name;
    if (state.identity.first_name || state.identity.last_name) {
      const parts = [state.identity.first_name, state.identity.middle_name, state.identity.last_name]
        .map((p) => (p ?? "").trim())
        .filter(Boolean);
      if (parts.length) clientPatch.full_name = parts.join(" ");
    }
    clientPatch.date_of_birth = state.identity.date_of_birth;
    clientPatch.gender = state.identity.gender;
    clientPatch.country_of_citizenship = state.identity.nationality;
    clientPatch.marital_status = state.identity.marital_status;
    clientPatch.passport_number = state.identity.passport_number;
    clientPatch.passport_expiry = state.identity.passport_expiry;
    clientPatch.intake = state.identity.intake;
  }

  if (sections.has("contact")) {
    clientPatch.phone = state.contact.phone_primary;
    clientPatch.phone_alternate = state.contact.phone_alt;
    clientPatch.email = state.contact.email_primary;
    clientPatch.email_alternate = state.contact.email_alt;
    clientPatch.country_code = state.contact.country_code;
    clientPatch.country_of_residence = state.contact.address_country;
  }

  if (sections.has("tests")) {
    const storage = attemptsToStoragePayload(
      state.tests.attempts,
      state.tests.active_attempt_ids,
    );
    const legacyMirror = attemptsToLegacyMirror(
      state.tests.attempts,
      state.tests.active_attempt_ids,
    );

    clientPatch.test_attempts = storage.test_attempts;
    clientPatch.active_attempt_ids = storage.active_attempt_ids;
    Object.assign(clientPatch, legacyMirror);
  }

  if (sections.has("education")) {
    const eduJson = educationRecordsToJson(state.education);
    clientPatch.education_history = eduJson;
    const sync = syncLastEducationFromBackground(
      { education_history: eduJson },
      eduJson[0]?.level ?? null,
    );
    Object.assign(clientPatch, sync);
    if (eduJson[0]) {
      clientPatch.institution_name = eduJson[0].institution_name ?? eduJson[0].institution ?? null;
      clientPatch.percentage_cgpa = eduJson[0].percentage_cgpa ?? eduJson[0].score ?? null;
      if (eduJson[0].year) clientPatch.year_of_passing = yearOfPassingForDb(String(eduJson[0].year));
    }
  }

  if (sections.has("experience")) {
    clientPatch.work_experience = experienceRecordsToJson(state.experience);
  }

  if (Object.keys(clientPatch).length > 0) {
    const { error: clientErr } = await supabase.from("clients").update(clientPatch).eq("id", clientId);
    if (clientErr) throwSaveError("clients", clientErr);
  }

  if (sections.has("education")) {
    const eduJson = educationRecordsToJson(state.education);
    void syncEducationHistoryToClientEducation(clientId, eduJson).catch((e) =>
      console.warn("[profileSave] client_education sync failed", e),
    );
  }

  const refSections = (["tests", "education", "experience"] as ProfileSectionId[]).filter((s) =>
    sections.has(s),
  );
  if (refSections.length > 0) {
    const refEntries = collectRefSyncEntriesForSections(state, sections);
    const refResult = await syncAllProfileDocumentRefsIfAvailable(clientId, refEntries);
    if (!refResult.synced && refResult.skippedReason) {
      console.warn("[profileSave] document ref sync skipped:", refResult.skippedReason);
    }
  }

  const needsProfileSync = sections.has("identity") || sections.has("contact");
  if (needsProfileSync) {
    await ensureClientProfileSynced(clientId).catch((e) =>
      console.warn("[profileSave] profile sync failed", e),
    );
  }

  const viewModel = await getProfileViewModel(clientId);
  return { viewModel };
}
