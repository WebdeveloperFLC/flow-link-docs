-- Additive EU visa base services: 12 countries × student + visitor (24 rows).
-- INSERT-only — does not update existing Germany 051–055 or any live service.
-- UUIDs registered in scripts/lib/service-library-ids.mjs

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-000000000081', 'visa_immigration', 'France', 'Student Visa (VLS-TS / Long Stay)', 80, true),
  ('b2000001-0001-4000-8000-000000000082', 'visa_immigration', 'France', 'Schengen Visitor Visa (Type C)', 81, true),
  ('b2000001-0001-4000-8000-000000000091', 'visa_immigration', 'Italy', 'Student Visa (National D Visa)', 90, true),
  ('b2000001-0001-4000-8000-000000000092', 'visa_immigration', 'Italy', 'Schengen Visitor Visa (Type C)', 91, true),
  ('b2000001-0001-4000-8000-0000000000a1', 'visa_immigration', 'Netherlands', 'Student Visa (MVV + Residence Permit)', 100, true),
  ('b2000001-0001-4000-8000-0000000000a2', 'visa_immigration', 'Netherlands', 'Schengen Visitor Visa (Type C)', 101, true),
  ('b2000001-0001-4000-8000-0000000000a3', 'visa_immigration', 'Ireland', 'Stamp 2 Student Permission', 102, true),
  ('b2000001-0001-4000-8000-0000000000a4', 'visa_immigration', 'Ireland', 'Short Stay Visit Visa (C)', 103, true),
  ('b2000001-0001-4000-8000-0000000000a5', 'visa_immigration', 'Spain', 'Student Visa (National D Visa)', 104, true),
  ('b2000001-0001-4000-8000-0000000000a6', 'visa_immigration', 'Spain', 'Schengen Visitor Visa (Type C)', 105, true),
  ('b2000001-0001-4000-8000-0000000000a7', 'visa_immigration', 'Malta', 'Student Visa (National D Visa)', 106, true),
  ('b2000001-0001-4000-8000-0000000000a8', 'visa_immigration', 'Malta', 'Schengen Visitor Visa (Type C)', 107, true),
  ('b2000001-0001-4000-8000-0000000000a9', 'visa_immigration', 'Finland', 'Residence Permit for Studies', 108, true),
  ('b2000001-0001-4000-8000-0000000000aa', 'visa_immigration', 'Finland', 'Schengen Visitor Visa (Type C)', 109, true),
  ('b2000001-0001-4000-8000-0000000000ab', 'visa_immigration', 'Sweden', 'Residence Permit for Studies', 110, true),
  ('b2000001-0001-4000-8000-0000000000ac', 'visa_immigration', 'Sweden', 'Schengen Visitor Visa (Type C)', 111, true),
  ('b2000001-0001-4000-8000-0000000000ad', 'visa_immigration', 'Austria', 'Student Residence Permit', 112, true),
  ('b2000001-0001-4000-8000-0000000000ae', 'visa_immigration', 'Austria', 'Schengen Visitor Visa (Type C)', 113, true),
  ('b2000001-0001-4000-8000-0000000000af', 'visa_immigration', 'Belgium', 'Student Visa (Long Stay / Type D)', 114, true),
  ('b2000001-0001-4000-8000-0000000000b0', 'visa_immigration', 'Belgium', 'Schengen Visitor Visa (Type C)', 115, true),
  ('b2000001-0001-4000-8000-0000000000b1', 'visa_immigration', 'Denmark', 'Residence Permit for Studies', 116, true),
  ('b2000001-0001-4000-8000-0000000000b2', 'visa_immigration', 'Denmark', 'Schengen Visitor Visa (Type C)', 117, true),
  ('b2000001-0001-4000-8000-0000000000b3', 'visa_immigration', 'Portugal', 'Student Visa (National D Visa)', 118, true),
  ('b2000001-0001-4000-8000-0000000000b4', 'visa_immigration', 'Portugal', 'Schengen Visitor Visa (Type C)', 119, true)
ON CONFLICT (service_category, service, sub_service) DO NOTHING;

INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, x.country FROM (VALUES
  ('b2000001-0001-4000-8000-000000000081'::uuid, 'France'),
  ('b2000001-0001-4000-8000-000000000082'::uuid, 'France'),
  ('b2000001-0001-4000-8000-000000000091'::uuid, 'Italy'),
  ('b2000001-0001-4000-8000-000000000092'::uuid, 'Italy'),
  ('b2000001-0001-4000-8000-0000000000a1'::uuid, 'Netherlands'),
  ('b2000001-0001-4000-8000-0000000000a2'::uuid, 'Netherlands'),
  ('b2000001-0001-4000-8000-0000000000a3'::uuid, 'Ireland'),
  ('b2000001-0001-4000-8000-0000000000a4'::uuid, 'Ireland'),
  ('b2000001-0001-4000-8000-0000000000a5'::uuid, 'Spain'),
  ('b2000001-0001-4000-8000-0000000000a6'::uuid, 'Spain'),
  ('b2000001-0001-4000-8000-0000000000a7'::uuid, 'Malta'),
  ('b2000001-0001-4000-8000-0000000000a8'::uuid, 'Malta'),
  ('b2000001-0001-4000-8000-0000000000a9'::uuid, 'Finland'),
  ('b2000001-0001-4000-8000-0000000000aa'::uuid, 'Finland'),
  ('b2000001-0001-4000-8000-0000000000ab'::uuid, 'Sweden'),
  ('b2000001-0001-4000-8000-0000000000ac'::uuid, 'Sweden'),
  ('b2000001-0001-4000-8000-0000000000ad'::uuid, 'Austria'),
  ('b2000001-0001-4000-8000-0000000000ae'::uuid, 'Austria'),
  ('b2000001-0001-4000-8000-0000000000af'::uuid, 'Belgium'),
  ('b2000001-0001-4000-8000-0000000000b0'::uuid, 'Belgium'),
  ('b2000001-0001-4000-8000-0000000000b1'::uuid, 'Denmark'),
  ('b2000001-0001-4000-8000-0000000000b2'::uuid, 'Denmark'),
  ('b2000001-0001-4000-8000-0000000000b3'::uuid, 'Portugal'),
  ('b2000001-0001-4000-8000-0000000000b4'::uuid, 'Portugal')
) AS x(library_id, country)
ON CONFLICT DO NOTHING;

-- Optional catalogue SKUs for legacy billing pickers (skip if code exists)
INSERT INTO public.service_catalogue (
  master_key, sub_category, service_name, service_code, pricing_type,
  fee_inr, country_tag, gst_applicable, gst_rate, display_order
)
SELECT * FROM (VALUES
  ('visa_immigration', 'France', 'France — Student Visa (VLS-TS)', 'VIS-FR-STUD', 'ON_REQUEST', NULL::numeric, 'France', true, 18, 810),
  ('visa_immigration', 'France', 'France — Schengen Visitor Visa', 'VIS-FR-VISIT', 'ON_REQUEST', NULL, 'France', true, 18, 815),
  ('visa_immigration', 'Italy', 'Italy — Student Visa', 'VIS-IT-STUD', 'ON_REQUEST', NULL, 'Italy', true, 18, 820),
  ('visa_immigration', 'Italy', 'Italy — Schengen Visitor Visa', 'VIS-IT-VISIT', 'ON_REQUEST', NULL, 'Italy', true, 18, 825),
  ('visa_immigration', 'Netherlands', 'Netherlands — Student Visa', 'VIS-NL-STUD', 'ON_REQUEST', NULL, 'Netherlands', true, 18, 830),
  ('visa_immigration', 'Netherlands', 'Netherlands — Schengen Visitor Visa', 'VIS-NL-VISIT', 'ON_REQUEST', NULL, 'Netherlands', true, 18, 835),
  ('visa_immigration', 'Ireland', 'Ireland — Stamp 2 Student', 'VIS-IE-STUD', 'ON_REQUEST', NULL, 'Ireland', true, 18, 840),
  ('visa_immigration', 'Ireland', 'Ireland — Visit Visa', 'VIS-IE-VISIT', 'ON_REQUEST', NULL, 'Ireland', true, 18, 845),
  ('visa_immigration', 'Spain', 'Spain — Student Visa', 'VIS-ES-STUD', 'ON_REQUEST', NULL, 'Spain', true, 18, 850),
  ('visa_immigration', 'Spain', 'Spain — Schengen Visitor Visa', 'VIS-ES-VISIT', 'ON_REQUEST', NULL, 'Spain', true, 18, 855),
  ('visa_immigration', 'Malta', 'Malta — Student Visa', 'VIS-MT-STUD', 'ON_REQUEST', NULL, 'Malta', true, 18, 860),
  ('visa_immigration', 'Malta', 'Malta — Schengen Visitor Visa', 'VIS-MT-VISIT', 'ON_REQUEST', NULL, 'Malta', true, 18, 865),
  ('visa_immigration', 'Finland', 'Finland — Student Residence Permit', 'VIS-FI-STUD', 'ON_REQUEST', NULL, 'Finland', true, 18, 870),
  ('visa_immigration', 'Finland', 'Finland — Schengen Visitor Visa', 'VIS-FI-VISIT', 'ON_REQUEST', NULL, 'Finland', true, 18, 875),
  ('visa_immigration', 'Sweden', 'Sweden — Student Residence Permit', 'VIS-SE-STUD', 'ON_REQUEST', NULL, 'Sweden', true, 18, 880),
  ('visa_immigration', 'Sweden', 'Sweden — Schengen Visitor Visa', 'VIS-SE-VISIT', 'ON_REQUEST', NULL, 'Sweden', true, 18, 885),
  ('visa_immigration', 'Austria', 'Austria — Student Visa', 'VIS-AT-STUD', 'ON_REQUEST', NULL, 'Austria', true, 18, 890),
  ('visa_immigration', 'Austria', 'Austria — Schengen Visitor Visa', 'VIS-AT-VISIT', 'ON_REQUEST', NULL, 'Austria', true, 18, 895),
  ('visa_immigration', 'Belgium', 'Belgium — Student Visa', 'VIS-BE-STUD', 'ON_REQUEST', NULL, 'Belgium', true, 18, 900),
  ('visa_immigration', 'Belgium', 'Belgium — Schengen Visitor Visa', 'VIS-BE-VISIT', 'ON_REQUEST', NULL, 'Belgium', true, 18, 905),
  ('visa_immigration', 'Denmark', 'Denmark — Student Residence Permit', 'VIS-DK-STUD', 'ON_REQUEST', NULL, 'Denmark', true, 18, 910),
  ('visa_immigration', 'Denmark', 'Denmark — Schengen Visitor Visa', 'VIS-DK-VISIT', 'ON_REQUEST', NULL, 'Denmark', true, 18, 915),
  ('visa_immigration', 'Portugal', 'Portugal — Student Visa', 'VIS-PT-STUD', 'ON_REQUEST', NULL, 'Portugal', true, 18, 920),
  ('visa_immigration', 'Portugal', 'Portugal — Schengen Visitor Visa', 'VIS-PT-VISIT', 'ON_REQUEST', NULL, 'Portugal', true, 18, 925)
) AS v(master_key, sub_category, service_name, service_code, pricing_type, fee_inr, country_tag, gst_applicable, gst_rate, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_catalogue sc WHERE sc.service_code = v.service_code
);
