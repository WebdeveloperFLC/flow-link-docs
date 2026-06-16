-- Service Library → stage pipeline link (additive). Library is source of truth; staging follows.
-- Regenerate backfill: node scripts/generate-pipeline-library-id-migration.mjs

ALTER TABLE public.stage_pipelines
  ADD COLUMN IF NOT EXISTS library_id uuid REFERENCES public.service_library(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stage_pipelines_library_id_unique
  ON public.stage_pipelines (library_id)
  WHERE library_id IS NOT NULL;

COMMENT ON COLUMN public.stage_pipelines.library_id IS
  'FK to service_library — one pipeline per visa service. Set from library seed slug in description.';

-- Backfill from Auto-seeded pipeline for {slug} descriptions (does not remove or deactivate rows).
UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000044'::uuid
WHERE library_id IS NULL AND description ILIKE '%australia-skilled-migration%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000043'::uuid
WHERE library_id IS NULL AND description ILIKE '%australia-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000041'::uuid
WHERE library_id IS NULL AND description ILIKE '%australia-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000045'::uuid
WHERE library_id IS NULL AND description ILIKE '%australia-subclass-485%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000042'::uuid
WHERE library_id IS NULL AND description ILIKE '%australia-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
WHERE library_id IS NULL AND description ILIKE '%australia-work-holiday%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000ad'::uuid
WHERE library_id IS NULL AND description ILIKE '%austria-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000ae'::uuid
WHERE library_id IS NULL AND description ILIKE '%austria-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000af'::uuid
WHERE library_id IS NULL AND description ILIKE '%belgium-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000b0'::uuid
WHERE library_id IS NULL AND description ILIKE '%belgium-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000017'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-bowp%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-00000000001a'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-caips-notes%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000013'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-express-entry-pr%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-00000000001c'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-oinp%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000014'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-pgwp%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-00000000001d'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-pnp-program%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-00000000001f'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-spouse-dependent-extension%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-00000000001b'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-spouse-dependent-owp%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000020'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-spouse-dependent-visitor%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000012'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000018'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-study-permit-extension%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000016'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-super-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-00000000001e'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-tr-to-pr%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000019'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-visitor-record%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000011'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000015'::uuid
WHERE library_id IS NULL AND description ILIKE '%canada-work-permit%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000c8'::uuid
WHERE library_id IS NULL AND description ILIKE '%cyprus-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000c9'::uuid
WHERE library_id IS NULL AND description ILIKE '%cyprus-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000b1'::uuid
WHERE library_id IS NULL AND description ILIKE '%denmark-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000b2'::uuid
WHERE library_id IS NULL AND description ILIKE '%denmark-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000eb'::uuid
WHERE library_id IS NULL AND description ILIKE '%finland-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a9'::uuid
WHERE library_id IS NULL AND description ILIKE '%finland-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000aa'::uuid
WHERE library_id IS NULL AND description ILIKE '%finland-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000081'::uuid
WHERE library_id IS NULL AND description ILIKE '%france-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000082'::uuid
WHERE library_id IS NULL AND description ILIKE '%france-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000058'::uuid
WHERE library_id IS NULL AND description ILIKE '%germany-ausbildung%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000057'::uuid
WHERE library_id IS NULL AND description ILIKE '%germany-blue-card%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000055'::uuid
WHERE library_id IS NULL AND description ILIKE '%germany-job-seeker%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000054'::uuid
WHERE library_id IS NULL AND description ILIKE '%germany-opportunity-card%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000056'::uuid
WHERE library_id IS NULL AND description ILIKE '%germany-skilled-worker%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000053'::uuid
WHERE library_id IS NULL AND description ILIKE '%germany-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000051'::uuid
WHERE library_id IS NULL AND description ILIKE '%germany-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000052'::uuid
WHERE library_id IS NULL AND description ILIKE '%germany-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e2'::uuid
WHERE library_id IS NULL AND description ILIKE '%hungary-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e0'::uuid
WHERE library_id IS NULL AND description ILIKE '%hungary-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e1'::uuid
WHERE library_id IS NULL AND description ILIKE '%hungary-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e3'::uuid
WHERE library_id IS NULL AND description ILIKE '%hungary-work-permit%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a3'::uuid
WHERE library_id IS NULL AND description ILIKE '%ireland-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a4'::uuid
WHERE library_id IS NULL AND description ILIKE '%ireland-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000091'::uuid
WHERE library_id IS NULL AND description ILIKE '%italy-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000092'::uuid
WHERE library_id IS NULL AND description ILIKE '%italy-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e6'::uuid
WHERE library_id IS NULL AND description ILIKE '%latvia-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e4'::uuid
WHERE library_id IS NULL AND description ILIKE '%latvia-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e5'::uuid
WHERE library_id IS NULL AND description ILIKE '%latvia-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000cd'::uuid
WHERE library_id IS NULL AND description ILIKE '%lithuania-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000ce'::uuid
WHERE library_id IS NULL AND description ILIKE '%lithuania-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a7'::uuid
WHERE library_id IS NULL AND description ILIKE '%malta-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a8'::uuid
WHERE library_id IS NULL AND description ILIKE '%malta-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a1'::uuid
WHERE library_id IS NULL AND description ILIKE '%netherlands-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a2'::uuid
WHERE library_id IS NULL AND description ILIKE '%netherlands-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000065'::uuid
WHERE library_id IS NULL AND description ILIKE '%nz-post-study-work%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000064'::uuid
WHERE library_id IS NULL AND description ILIKE '%nz-skilled-migrant%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000063'::uuid
WHERE library_id IS NULL AND description ILIKE '%nz-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000061'::uuid
WHERE library_id IS NULL AND description ILIKE '%nz-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000062'::uuid
WHERE library_id IS NULL AND description ILIKE '%nz-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000df'::uuid
WHERE library_id IS NULL AND description ILIKE '%poland-eu-blue-card%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000de'::uuid
WHERE library_id IS NULL AND description ILIKE '%poland-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000dc'::uuid
WHERE library_id IS NULL AND description ILIKE '%poland-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000dd'::uuid
WHERE library_id IS NULL AND description ILIKE '%poland-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000b3'::uuid
WHERE library_id IS NULL AND description ILIKE '%portugal-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000b4'::uuid
WHERE library_id IS NULL AND description ILIKE '%portugal-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000ea'::uuid
WHERE library_id IS NULL AND description ILIKE '%singapore-employment-pass%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e9'::uuid
WHERE library_id IS NULL AND description ILIKE '%singapore-spouse-dependent-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e7'::uuid
WHERE library_id IS NULL AND description ILIKE '%singapore-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000e8'::uuid
WHERE library_id IS NULL AND description ILIKE '%singapore-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000ec'::uuid
WHERE library_id IS NULL AND description ILIKE '%south-korea-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a5'::uuid
WHERE library_id IS NULL AND description ILIKE '%spain-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000a6'::uuid
WHERE library_id IS NULL AND description ILIKE '%spain-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000ab'::uuid
WHERE library_id IS NULL AND description ILIKE '%sweden-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000ac'::uuid
WHERE library_id IS NULL AND description ILIKE '%sweden-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000db'::uuid
WHERE library_id IS NULL AND description ILIKE '%uae-golden-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000d8'::uuid
WHERE library_id IS NULL AND description ILIKE '%uae-spouse-dependent-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000cf'::uuid
WHERE library_id IS NULL AND description ILIKE '%uae-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000d9'::uuid
WHERE library_id IS NULL AND description ILIKE '%uae-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-0000000000da'::uuid
WHERE library_id IS NULL AND description ILIKE '%uae-work-permit%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000025'::uuid
WHERE library_id IS NULL AND description ILIKE '%uk-graduate-route%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000024'::uuid
WHERE library_id IS NULL AND description ILIKE '%uk-skilled-worker%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000023'::uuid
WHERE library_id IS NULL AND description ILIKE '%uk-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000021'::uuid
WHERE library_id IS NULL AND description ILIKE '%uk-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000022'::uuid
WHERE library_id IS NULL AND description ILIKE '%uk-visitor-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000034'::uuid
WHERE library_id IS NULL AND description ILIKE '%usa-green-card%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000033'::uuid
WHERE library_id IS NULL AND description ILIKE '%usa-spouse-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000031'::uuid
WHERE library_id IS NULL AND description ILIKE '%usa-student-visa%';

UPDATE public.stage_pipelines SET library_id = 'b2000001-0001-4000-8000-000000000032'::uuid
WHERE library_id IS NULL AND description ILIKE '%usa-visitor-visa%';
