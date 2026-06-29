/**
 * Known KC master guide slugs per service_library.id.
 * Used when kc_article_services linkage is missing; canonical links live in DB.
 */
export const SERVICE_LIBRARY_GUIDE_SLUGS: Record<string, string> = {
  "c35e6051-f40f-47bf-9cac-0a386c47a336": "canada-student-visa-outside-canada",
};

export function guideSlugForServiceLibrary(libraryId: string): string | undefined {
  return SERVICE_LIBRARY_GUIDE_SLUGS[libraryId.trim()];
}
