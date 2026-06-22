import { LIBRARY_PIPELINE_SEED_SLUG } from "@/lib/stagePipelineLibrarySlug";
import { parseLibraryIdFromServiceCode } from "@/lib/service-library/serviceCodes";
import type { VisaProfileId } from "./visaDocumentProfiles";

export interface ServiceDocumentProfile {
  profileType: VisaProfileId;
  country: string | null;
  libraryId: string | null;
  librarySlug: string | null;
}

/** Resolve document profile from service_code — slug-based, never service title. */
export function resolveProfileTypeFromLibrarySlug(slug: string): VisaProfileId {
  if (/^coaching-/i.test(slug)) return "coaching";
  if (/^mbbs-/i.test(slug)) return "mbbs";
  if (
    /express-entry|skilled-migration|oinp|pnp|green-card|tr-to-pr|smc|permanent|subclass-189|subclass-190|subclass-491/i.test(
      slug,
    )
  ) {
    return "permanent_residence";
  }
  if (/student|study|pgwp|graduate-route|post-study|subclass-485|ausbildung/i.test(slug)) {
    return "student_visa";
  }
  // Spouse before visitor — e.g. canada-spouse-dependent-visitor
  if (/spouse|partner|dependent|sponsorship/i.test(slug)) return "spouse_dependent";
  if (/visitor|super-visa|visitor-record|trv/i.test(slug)) return "visitor_visa";
  if (/skilled|work|bowp|opportunity|job-seeker|caips|blue-card|employment-pass|work-permit/i.test(slug)) {
    return "work_permit";
  }
  return "visitor_visa";
}

export function countryFromServiceCode(serviceCode: string): string | null {
  if (!serviceCode.includes("::")) return null;
  return serviceCode.split("::")[1]?.trim() || null;
}

export function resolveServiceDocumentProfile(serviceCode: string): ServiceDocumentProfile {
  const libraryId = parseLibraryIdFromServiceCode(serviceCode);
  const librarySlug = libraryId ? (LIBRARY_PIPELINE_SEED_SLUG[libraryId] ?? null) : null;
  const profileType = librarySlug ? resolveProfileTypeFromLibrarySlug(librarySlug) : "visitor_visa";
  const country = countryFromServiceCode(serviceCode);
  return { profileType, country, libraryId, librarySlug };
}
