import type { ClientRow, EducationEntry, ExperienceEntry } from "@/lib/clientRegistration";
import { clientToProfileFallback } from "@/lib/clientProfileSync";
import { leadToBackgroundState } from "@/lib/leadBackground";
import {
  ENGLISH_SCORES_BY_TEST_KEY,
  hydrateScoresByTest,
  parseScoresByTest,
  scoresForTest,
  type EnglishScoresByTest,
} from "@/lib/englishTestScores";
import { normalizeLanguageTests } from "@/lib/languageTests";
import { slotLabel } from "@/lib/profile/profileDocumentSlots";
import { buildProfileTests } from "@/lib/profile/testAttempts";
import {
  educationRefKey,
  ensureEducationId,
  ensureExperienceId,
  aptitudeTestRefKey,
  englishTestRefKey,
  experienceRefKey,
  languageTestRefKey,
} from "@/lib/profile/profileRecordIds";
import { buildProfileServicesSummary, type ProfilePipelineSnapshot } from "@/lib/profile/profileServicesSummary";
import {
  ENGLISH_TEST_IDS,
  legacyAptitudeToTestId,
  legacyEnglishToTestId,
  testIdToLegacyAptitude,
  testIdToLegacyEnglish,
} from "@/lib/profile/profileTestCatalog";
import type {
  ClientDocumentRefRow,
  IeltsVariant,
  ProfileAptitudeTestEntry,
  ProfileAptitudeTestId,
  ProfileContact,
  ProfileEducationRecord,
  ProfileEnglishTestEntry,
  ProfileEnglishTestId,
  ProfileExperienceRecord,
  ProfileIdentity,
  ProfileLanguageTestEntry,
  ProfileLanguageTestId,
  ProfileLinkedDocument,
  ProfileServicesSummary,
  ProfileTestStatus,
  ProfileTests,
  ProfileViewModel,
  ProfileViewModelMeta,
} from "@/lib/profile/types";
import type { ServiceCatalogueItem } from "@/lib/leads";

type ProfileRow = Record<string, unknown>;

type RawLinkedDoc = {
  document_id?: string;
  slot?: string;
  label?: string;
  linked_at?: string | null;
};

type RawEducation = EducationEntry & {
  id?: string;
  qualification_type?: string;
  institution_name?: string;
  field_of_study?: string;
  major?: string;
  start_year?: string;
  end_year?: string;
  status?: string;
  grade_type?: string;
  score?: string;
  backlogs?: string;
  notes?: string;
  linked_documents?: RawLinkedDoc[];
};

type RawExperience = ExperienceEntry & {
  id?: string;
  designation?: string;
  department?: string;
  employment_type?: string;
  notes?: string;
  linked_documents?: RawLinkedDoc[];
};

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function coerceTestStatus(raw: unknown): ProfileTestStatus | null {
  const s = str(raw);
  if (!s) return null;
  const allowed: ProfileTestStatus[] = [
    "not_taken",
    "planned",
    "scheduled",
    "result_awaited",
    "taken",
    "expired",
    "waived",
  ];
  return allowed.includes(s as ProfileTestStatus) ? (s as ProfileTestStatus) : "not_taken";
}

function mergeLinkedDocs(
  jsonbDocs: RawLinkedDoc[] | undefined,
  refs: ClientDocumentRefRow[],
  refKey: string,
): ProfileLinkedDocument[] {
  const byKey = new Map<string, ProfileLinkedDocument>();
  for (const d of jsonbDocs ?? []) {
    const document_id = str(d.document_id);
    const slot = str(d.slot);
    if (!document_id || !slot) continue;
    const key = `${document_id}::${slot}`;
    byKey.set(key, {
      document_id,
      slot,
      label: str(d.label) ?? slotLabel(slot),
      linked_at: d.linked_at ?? null,
    });
  }
  for (const r of refs.filter((x) => x.ref_key === refKey)) {
    const key = `${r.document_id}::${r.slot}`;
    byKey.set(key, {
      document_id: r.document_id,
      slot: r.slot,
      label: r.label ?? slotLabel(r.slot),
      linked_at: r.linked_at,
      file_name: r.file_name ?? null,
    });
  }
  return [...byKey.values()];
}

function normalizeIdentity(client: Partial<ClientRow>, profile: ProfileRow): ProfileIdentity {
  const fb = clientToProfileFallback(client as ClientRow);
  return {
    first_name: str(client.first_name) ?? null,
    middle_name: str(client.middle_name) ?? null,
    last_name: str(client.last_name) ?? null,
    full_name: str(client.full_name) ?? null,
    date_of_birth: str(profile.date_of_birth) ?? str(client.date_of_birth) ?? fb.date_of_birth ?? null,
    gender: str(profile.gender) ?? str(client.gender) ?? fb.gender ?? null,
    nationality: str(profile.nationality) ?? str(client.country_of_citizenship) ?? fb.nationality ?? null,
    place_of_birth: str(profile.place_of_birth) ?? fb.place_of_birth ?? null,
    marital_status: str(profile.marital_status) ?? str(client.marital_status) ?? fb.marital_status ?? null,
    spouse_name: str(profile.spouse_name) ?? fb.spouse_name ?? null,
    passport_number: str(profile.passport_number) ?? str(client.passport_number) ?? fb.passport_number ?? null,
    passport_country: str(profile.passport_country) ?? fb.passport_country ?? null,
    passport_issue_date: str(profile.passport_issue_date) ?? fb.passport_issue_date ?? null,
    passport_expiry: str(profile.passport_expiry) ?? str(client.passport_expiry) ?? fb.passport_expiry ?? null,
  };
}

function normalizeContact(client: Partial<ClientRow>, profile: ProfileRow): ProfileContact {
  const fb = clientToProfileFallback(client as ClientRow);
  return {
    phone_primary: str(client.phone) ?? null,
    phone_alt: str(profile.phone_alt) ?? str(client.phone_alternate) ?? fb.phone_alt ?? null,
    email_primary: str(client.email) ?? null,
    email_alt: str(profile.email_alt) ?? str(client.email_alternate) ?? fb.email_alt ?? null,
    address_line1: str(profile.address_line1) ?? fb.address_line1 ?? null,
    address_city: str(profile.address_city) ?? fb.address_city ?? null,
    address_state: str(profile.address_state) ?? fb.address_state ?? null,
    address_country:
      str(profile.address_country) ?? str(client.country_of_residence) ?? fb.address_country ?? null,
    address_postal: str(profile.address_postal) ?? fb.address_postal ?? null,
    country_code: str(client.country_code) ?? str(client.phone_country_code) ?? null,
    emergency_contact_name: str(profile.emergency_contact_name) ?? fb.emergency_contact_name ?? null,
    emergency_contact_phone: str(profile.emergency_contact_phone) ?? fb.emergency_contact_phone ?? null,
  };
}

function normalizeMeta(
  client: Partial<ClientRow>,
  profile: ProfileRow,
  loadedAt: string,
  enrich?: ProfileViewModelEnrichment,
): ProfileViewModelMeta {
  const statusCode = str((client as { status?: string }).status) ?? "in_progress";
  return {
    client_id: str(client.id) ?? "",
    loaded_at: loadedAt,
    source_client_updated_at: str((client as { updated_at?: string }).updated_at),
    source_profile_updated_at: str(profile.updated_at),
    registration_number: str(client.registration_number),
    branch: str(client.branch),
    assigned_counselor_id: str(client.assigned_counselor_id),
    assigned_counselor_name: enrich?.assigned_counselor_name ?? null,
    client_status: statusCode,
    client_status_label: enrich?.client_status_label ?? statusCode.replace(/_/g, " "),
    lead_source: str(client.lead_source),
    created_at: str((client as { created_at?: string }).created_at),
  };
}

function readIeltsVariant(sections: Record<string, unknown>): IeltsVariant | null {
  const v = str(sections.ielts_variant) ?? str(sections.variant);
  if (v === "Academic" || v === "General") return v;
  return null;
}

function buildEnglishEntries(
  client: Partial<ClientRow>,
  refs: ClientDocumentRefRow[],
): { active: ProfileEnglishTestId | null; entries: ProfileEnglishTestEntry[] } {
  const bg = leadToBackgroundState(client);
  const sectionsRaw = (client.english_sections ?? bg.english_sections ?? {}) as Record<string, unknown>;
  const byTest = hydrateScoresByTest({
    english_test: bg.english_test,
    english_test_status: bg.english_test_status,
    english_overall: bg.english_overall,
    english_test_date: bg.english_test_date,
    english_test_expiry: bg.english_test_expiry,
    english_sections: sectionsRaw,
  });
  const ieltsVariant = readIeltsVariant(sectionsRaw);
  const testCountry = str(sectionsRaw.test_country);

  const entries: ProfileEnglishTestEntry[] = [];
  for (const testId of ENGLISH_TEST_IDS) {
    const legacy = testIdToLegacyEnglish(testId);
    const cached = scoresForTest(byTest, legacy);
    const hasData =
      cached.status ||
      cached.overall ||
      cached.test_date ||
      cached.test_expiry ||
      Object.keys(cached.sections ?? {}).length > 0;
    const isActive = legacyEnglishToTestId(bg.english_test) === testId;
    if (!hasData && !isActive) continue;

    const refKey = englishTestRefKey(testId);
    const jsonbLinked = (sectionsRaw[`linked_documents_${legacy}`] ??
      (isActive ? sectionsRaw.linked_documents : undefined)) as RawLinkedDoc[] | undefined;

    entries.push({
      test_id: testId,
      status: coerceTestStatus(cached.status ?? (isActive ? bg.english_test_status : null)),
      overall: str(cached.overall),
      test_date: str(cached.test_date),
      test_expiry: str(cached.test_expiry),
      sections: { ...(cached.sections ?? {}) },
      ielts_variant: testId === "ielts" ? ieltsVariant : null,
      country: isActive ? testCountry : null,
      linked_documents: mergeLinkedDocs(jsonbLinked, refs, refKey),
    });
  }

  let active = legacyEnglishToTestId(bg.english_test);

  if (entries.length === 0 && active) {
    entries.push({
      test_id: active,
      status: coerceTestStatus(bg.english_test_status),
      overall: str(bg.english_overall),
      test_date: str(bg.english_test_date),
      test_expiry: str(bg.english_test_expiry),
      sections: {},
      ielts_variant: active === "ielts" ? ieltsVariant : null,
      country: testCountry,
      linked_documents: mergeLinkedDocs(
        sectionsRaw.linked_documents as RawLinkedDoc[] | undefined,
        refs,
        englishTestRefKey(active),
      ),
    });
  }

  return { active, entries };
}

function buildAptitudeEntries(client: Partial<ClientRow>, refs: ClientDocumentRefRow[]): ProfileAptitudeTestEntry[] {
  const bg = leadToBackgroundState(client);
  const entries: ProfileAptitudeTestEntry[] = [];
  for (const row of bg.other_tests ?? []) {
    const testId = legacyAptitudeToTestId(row.type);
    if (!testId) continue;
    const refKey = aptitudeTestRefKey(testId);
    const rawLinked = (row as { linked_documents?: RawLinkedDoc[] }).linked_documents;
    entries.push({
      test_id: testId,
      status: row.score || row.date ? "taken" : "not_taken",
      overall: str(row.score),
      test_date: str(row.date),
      sections: { ...(row.sections ?? {}) },
      linked_documents: mergeLinkedDocs(rawLinked, refs, refKey),
    });
  }
  return entries;
}

function buildLanguageEntries(client: Partial<ClientRow>, refs: ClientDocumentRefRow[]): ProfileLanguageTestEntry[] {
  const lt = normalizeLanguageTests(client.language_tests);
  const out: ProfileLanguageTestEntry[] = [];
  for (const langKey of ["french", "german"] as ProfileLanguageTestId[]) {
    const block = lt[langKey];
    if (!block) continue;
    const hasData =
      block.status ||
      block.exam_type ||
      block.overall_score ||
      block.test_date ||
      block.cefr_level ||
      Object.keys(block.sections ?? {}).length > 0;
    if (!hasData) continue;
    const refKey = languageTestRefKey(langKey);
    const rawLinked = (block as { linked_documents?: RawLinkedDoc[] }).linked_documents;
    out.push({
      test_id: langKey,
      status: coerceTestStatus(block.status),
      cefr_level: str(block.cefr_level),
      exam_type: str(block.exam_type),
      overall_score: str(block.overall_score),
      test_date: str(block.test_date),
      expiry_date: str(block.expiry_date),
      sections: { ...(block.sections ?? {}) },
      linked_documents: mergeLinkedDocs(rawLinked, refs, refKey),
    });
  }
  return out;
}

function normalizeEducation(
  client: Partial<ClientRow>,
  refs: ClientDocumentRefRow[],
): ProfileEducationRecord[] {
  const bg = leadToBackgroundState(client);
  return (bg.education_history ?? []).map((raw) => {
    const e = raw as RawEducation;
    const id = ensureEducationId(e.id);
    const refKey = educationRefKey(id);
    return {
      id,
      qualification_type: str(e.qualification_type) ?? str(e.level),
      institution_name: str(e.institution_name) ?? str(e.institution),
      country: str(e.country),
      state_province: str(e.state_province),
      city: str(e.city),
      field_of_study: str(e.field_of_study) ?? str(e.specialization),
      major: str(e.major),
      start_year: str(e.start_year),
      end_year: str(e.end_year) ?? (e.year != null ? str(e.year) : null),
      status: str(e.status),
      grade_type: str(e.grade_type),
      score: str(e.score) ?? str(e.percentage_cgpa),
      backlogs: str(e.backlogs),
      notes: str(e.notes),
      linked_documents: mergeLinkedDocs(e.linked_documents, refs, refKey),
    };
  });
}

function normalizeExperience(
  client: Partial<ClientRow>,
  refs: ClientDocumentRefRow[],
): ProfileExperienceRecord[] {
  const bg = leadToBackgroundState(client);
  return (bg.work_experience ?? []).map((raw) => {
    const e = raw as RawExperience;
    const id = ensureExperienceId(e.id);
    const refKey = experienceRefKey(id);
    return {
      id,
      company: str(e.company),
      country: str(e.country),
      state_province: str(e.state_province),
      city: str(e.city),
      designation: str(e.designation) ?? str(e.role),
      department: str(e.department),
      employment_type: str(e.employment_type),
      start_date: str(e.start_date),
      end_date: str(e.end_date),
      currently_working: !!e.currently_working,
      notes: str(e.notes) ?? str(e.description),
      linked_documents: mergeLinkedDocs(e.linked_documents, refs, refKey),
    };
  });
}

export interface ProfileViewModelEnrichment {
  assigned_counselor_name?: string | null;
  client_status_label?: string | null;
  catalogue?: ServiceCatalogueItem[];
  serviceLabels?: ReadonlyMap<string, string>;
  pipeline?: ProfilePipelineSnapshot | null;
}

export interface BuildProfileViewModelInput {
  client: Partial<ClientRow>;
  profile?: ProfileRow | null;
  documentRefs?: ClientDocumentRefRow[];
  loadedAt?: string;
  enrichment?: ProfileViewModelEnrichment;
}

/**
 * Pure normalization at the data boundary. Used by getProfileViewModel and unit tests.
 * UI must never parse raw jsonb — only consume ProfileViewModel.
 */
export function buildProfileViewModelFromSources(input: BuildProfileViewModelInput): ProfileViewModel {
  const { client, profile = {}, documentRefs = [], loadedAt, enrichment } = input;
  const loaded = loadedAt ?? new Date().toISOString();
  const tests = buildProfileTests(client, documentRefs);

  const services = buildProfileServicesSummary({
    client,
    catalogue: enrichment?.catalogue,
    serviceLabels: enrichment?.serviceLabels,
    pipeline: enrichment?.pipeline ?? null,
  });

  return {
    meta: normalizeMeta(client, profile, loaded, enrichment),
    identity: normalizeIdentity(client, profile),
    contact: normalizeContact(client, profile),
    services,
    tests,
    education: normalizeEducation(client, documentRefs),
    experience: normalizeExperience(client, documentRefs),
  };
}

/** Serialize english tests back to legacy client row shape (DB boundary). */
export function englishEntriesToClientFields(
  activeTestId: ProfileEnglishTestId | null,
  entries: ProfileEnglishTestEntry[],
): Pick<
  ClientRow,
  | "english_test"
  | "english_test_status"
  | "english_overall"
  | "english_test_date"
  | "english_test_expiry"
  | "english_sections"
> {
  const byTest: EnglishScoresByTest = {};
  for (const e of entries) {
    const legacy = testIdToLegacyEnglish(e.test_id);
    byTest[legacy] = {
      status: (e.status as "not_taken" | "scheduled" | "taken" | "waived" | undefined) ?? null,
      overall: e.overall,
      test_date: e.test_date,
      test_expiry: e.test_expiry,
      sections: { ...e.sections },
    };
  }
  const activeLegacy = activeTestId ? testIdToLegacyEnglish(activeTestId) : null;
  const active = entries.find((e) => e.test_id === activeTestId) ?? entries[0];
  const sections: Record<string, unknown> = {
    ...(active?.sections ?? {}),
    [ENGLISH_SCORES_BY_TEST_KEY]: byTest,
  };
  if (active?.ielts_variant) sections.ielts_variant = active.ielts_variant;
  if (active?.country) sections.test_country = active.country;
  if (active) {
    sections.linked_documents = active.linked_documents.map((d) => ({
      document_id: d.document_id,
      slot: d.slot,
      label: d.label,
      linked_at: d.linked_at,
    }));
  }
  for (const e of entries) {
    if (e.linked_documents.length) {
      const legacy = testIdToLegacyEnglish(e.test_id);
      sections[`linked_documents_${legacy}`] = e.linked_documents.map((d) => ({
        document_id: d.document_id,
        slot: d.slot,
        label: d.label,
        linked_at: d.linked_at,
      }));
    }
  }

  return {
    english_test: activeLegacy,
    english_test_status: (active?.status as ClientRow["english_test_status"]) ?? null,
    english_overall: active?.overall ?? null,
    english_test_date: active?.test_date ?? null,
    english_test_expiry: active?.test_expiry ?? null,
    english_sections: sections,
  };
}

export function educationRecordsToJson(education: ProfileEducationRecord[]): RawEducation[] {
  return education.map((e) => ({
    id: e.id,
    level: e.qualification_type ?? undefined,
    qualification_type: e.qualification_type ?? undefined,
    institution: e.institution_name ?? undefined,
    institution_name: e.institution_name ?? undefined,
    country: e.country ?? undefined,
    state_province: e.state_province ?? undefined,
    city: e.city ?? undefined,
    specialization: e.field_of_study ?? undefined,
    field_of_study: e.field_of_study ?? undefined,
    major: e.major ?? undefined,
    start_year: e.start_year ?? undefined,
    end_year: e.end_year ?? undefined,
    year: e.end_year ?? undefined,
    status: e.status ?? undefined,
    grade_type: e.grade_type ?? undefined,
    score: e.score ?? undefined,
    percentage_cgpa: e.score ?? undefined,
    backlogs: e.backlogs ?? undefined,
    notes: e.notes ?? undefined,
    linked_documents: e.linked_documents.map((d) => ({
      document_id: d.document_id,
      slot: d.slot,
      label: d.label,
      linked_at: d.linked_at,
    })),
  }));
}

export function experienceRecordsToJson(experience: ProfileExperienceRecord[]): RawExperience[] {
  return experience.map((e) => ({
    id: e.id,
    company: e.company ?? undefined,
    role: e.designation ?? undefined,
    designation: e.designation ?? undefined,
    department: e.department ?? undefined,
    employment_type: e.employment_type ?? undefined,
    country: e.country ?? undefined,
    state_province: e.state_province ?? undefined,
    city: e.city ?? undefined,
    start_date: e.start_date ?? undefined,
    end_date: e.end_date ?? undefined,
    currently_working: e.currently_working,
    description: e.notes ?? undefined,
    notes: e.notes ?? undefined,
    linked_documents: e.linked_documents.map((d) => ({
      document_id: d.document_id,
      slot: d.slot,
      label: d.label,
      linked_at: d.linked_at,
    })),
  }));
}

export function aptitudeEntriesToOtherTests(aptitude: ProfileAptitudeTestEntry[]): ClientRow["other_tests"] {
  const rows: NonNullable<ClientRow["other_tests"]> = [];
  for (const a of aptitude) {
    rows.push({
      type: testIdToLegacyAptitude(a.test_id),
      score: a.overall ?? undefined,
      date: a.test_date ?? undefined,
      sections: { ...a.sections },
      ...(a.linked_documents.length
        ? {
            linked_documents: a.linked_documents.map((d) => ({
              document_id: d.document_id,
              slot: d.slot,
              label: d.label,
              linked_at: d.linked_at,
            })),
          }
        : {}),
    } as NonNullable<ClientRow["other_tests"]>[number]);
  }
  return rows;
}

export function languageEntriesToJson(language: ProfileLanguageTestEntry[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const l of language) {
    out[l.test_id] = {
      status: l.status,
      cefr_level: l.cefr_level,
      exam_type: l.exam_type,
      overall_score: l.overall_score,
      test_date: l.test_date,
      expiry_date: l.expiry_date,
      sections: { ...l.sections },
      linked_documents: l.linked_documents.map((d) => ({
        document_id: d.document_id,
        slot: d.slot,
        label: d.label,
        linked_at: d.linked_at,
      })),
    };
  }
  return out;
}

/** @internal test helper */
export function parseEnglishCacheFromVm(tests: ProfileTests): EnglishScoresByTest {
  const active = tests.active_english_test_id;
  if (!active) return {};
  const byTest: EnglishScoresByTest = {};
  for (const e of tests.english) {
    byTest[testIdToLegacyEnglish(e.test_id)] = {
      status: e.status as EnglishScoresByTest[string]["status"],
      overall: e.overall,
      test_date: e.test_date,
      test_expiry: e.test_expiry,
      sections: { ...e.sections },
    };
  }
  return byTest;
}
