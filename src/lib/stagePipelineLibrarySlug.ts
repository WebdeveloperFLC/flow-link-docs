/**
 * Maps service_library.id → stage_pipelines.description seed slug
 * (`Auto-seeded pipeline for {slug}`). Keep in sync with scripts/lib/service-library-ids.mjs.
 */
const FILE_TO_LIBRARY_ID: Record<string, string> = {
  "canada-student-visa": "c35e6051-f40f-47bf-9cac-0a386c47a336",
  "canada-visitor-visa": "b2000001-0001-4000-8000-000000000011",
  "canada-spouse-visa": "b2000001-0001-4000-8000-000000000012",
  "canada-express-entry-pr": "b2000001-0001-4000-8000-000000000013",
  "canada-pgwp": "b2000001-0001-4000-8000-000000000014",
  "canada-work-permit": "b2000001-0001-4000-8000-000000000015",
  "canada-super-visa": "b2000001-0001-4000-8000-000000000016",
  "canada-bowp": "b2000001-0001-4000-8000-000000000017",
  "canada-study-permit-extension": "b2000001-0001-4000-8000-000000000018",
  "canada-visitor-record": "b2000001-0001-4000-8000-000000000019",
  "canada-caips-notes": "b2000001-0001-4000-8000-00000000001a",
  "canada-spouse-dependent-owp": "b2000001-0001-4000-8000-00000000001b",
  "canada-oinp": "b2000001-0001-4000-8000-00000000001c",
  "canada-pnp-program": "b2000001-0001-4000-8000-00000000001d",
  "canada-tr-to-pr": "b2000001-0001-4000-8000-00000000001e",
  "canada-spouse-dependent-extension": "b2000001-0001-4000-8000-00000000001f",
  "canada-spouse-dependent-visitor": "b2000001-0001-4000-8000-000000000020",
};

export const LIBRARY_PIPELINE_SEED_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(FILE_TO_LIBRARY_ID).map(([slug, id]) => [id, slug]),
);
