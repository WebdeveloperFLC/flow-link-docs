-- Canonical visa service_library rows + country mappings + catalogue SKU gaps.
-- UUIDs are stable for bulk-upload.json and lead service_code references.

-- Canada student (existing canonical)
-- c35e6051-f40f-47bf-9cac-0a386c47a336

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-000000000011', 'visa_immigration', 'Canada', 'Visitor Visa (TRV)', 11, true),
  ('b2000001-0001-4000-8000-000000000012', 'visa_immigration', 'Canada', 'Spousal Sponsorship', 12, true),
  ('b2000001-0001-4000-8000-000000000013', 'visa_immigration', 'Canada', 'Express Entry / PR', 13, true),
  ('b2000001-0001-4000-8000-000000000014', 'visa_immigration', 'Canada', 'PGWP', 14, true),
  ('b2000001-0001-4000-8000-000000000015', 'visa_immigration', 'Canada', 'Work Permit', 15, true),
  ('b2000001-0001-4000-8000-000000000016', 'visa_immigration', 'Canada', 'Super Visa', 16, true),

  ('b2000001-0001-4000-8000-000000000021', 'visa_immigration', 'United Kingdom', 'Student Visa (Student Route)', 20, true),
  ('b2000001-0001-4000-8000-000000000022', 'visa_immigration', 'United Kingdom', 'Standard Visitor Visa', 21, true),
  ('b2000001-0001-4000-8000-000000000023', 'visa_immigration', 'United Kingdom', 'Partner / Spouse Visa', 22, true),
  ('b2000001-0001-4000-8000-000000000024', 'visa_immigration', 'United Kingdom', 'Skilled Worker Visa', 23, true),
  ('b2000001-0001-4000-8000-000000000025', 'visa_immigration', 'United Kingdom', 'Graduate Route', 24, true),

  ('b2000001-0001-4000-8000-000000000031', 'visa_immigration', 'United States', 'F-1 Student Visa', 30, true),
  ('b2000001-0001-4000-8000-000000000032', 'visa_immigration', 'United States', 'B1/B2 Visitor Visa', 31, true),
  ('b2000001-0001-4000-8000-000000000033', 'visa_immigration', 'United States', 'Spouse / Fiancé Visa (CR-1 / IR-1 / K-1)', 32, true),
  ('b2000001-0001-4000-8000-000000000034', 'visa_immigration', 'United States', 'Green Card (Employment & Family)', 33, true),

  ('b2000001-0001-4000-8000-000000000041', 'visa_immigration', 'Australia', 'Student Visa (Subclass 500)', 40, true),
  ('b2000001-0001-4000-8000-000000000042', 'visa_immigration', 'Australia', 'Visitor Visa (Subclass 600)', 41, true),
  ('b2000001-0001-4000-8000-000000000043', 'visa_immigration', 'Australia', 'Partner Visa (Subclass 820/801)', 42, true),
  ('b2000001-0001-4000-8000-000000000044', 'visa_immigration', 'Australia', 'Skilled Migration (Subclass 189/190/491)', 43, true),
  ('b2000001-0001-4000-8000-000000000045', 'visa_immigration', 'Australia', 'Temporary Graduate Visa (Subclass 485)', 44, true),
  ('b2000001-0001-4000-8000-000000000046', 'visa_immigration', 'Australia', 'Work & Holiday Visa (Subclass 417/462)', 45, true),

  ('b2000001-0001-4000-8000-000000000051', 'visa_immigration', 'Germany', 'Student Visa (National D Visa)', 50, true),
  ('b2000001-0001-4000-8000-000000000052', 'visa_immigration', 'Germany', 'Schengen Visitor Visa (Type C)', 51, true),
  ('b2000001-0001-4000-8000-000000000053', 'visa_immigration', 'Germany', 'Family Reunion (Spouse) Visa', 52, true),
  ('b2000001-0001-4000-8000-000000000054', 'visa_immigration', 'Germany', 'Opportunity Card (Chancenkarte)', 53, true),
  ('b2000001-0001-4000-8000-000000000055', 'visa_immigration', 'Germany', 'Job Seeker Visa', 54, true),

  ('b2000001-0001-4000-8000-000000000061', 'visa_immigration', 'New Zealand', 'Student Visa', 60, true),
  ('b2000001-0001-4000-8000-000000000062', 'visa_immigration', 'New Zealand', 'Visitor Visa', 61, true),
  ('b2000001-0001-4000-8000-000000000063', 'visa_immigration', 'New Zealand', 'Partnership Visa', 62, true),
  ('b2000001-0001-4000-8000-000000000064', 'visa_immigration', 'New Zealand', 'Skilled Migrant Category (SMC)', 63, true),
  ('b2000001-0001-4000-8000-000000000065', 'visa_immigration', 'New Zealand', 'Post Study Work Visa', 64, true)
ON CONFLICT (service_category, service, sub_service) DO UPDATE
SET display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

-- Country mappings
INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, x.country
FROM (VALUES
  ('c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000011'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000012'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000013'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000014'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000015'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000016'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000021'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000022'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000023'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000024'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000025'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000031'::uuid, 'United States'),
  ('b2000001-0001-4000-8000-000000000032'::uuid, 'United States'),
  ('b2000001-0001-4000-8000-000000000033'::uuid, 'United States'),
  ('b2000001-0001-4000-8000-000000000034'::uuid, 'United States'),
  ('b2000001-0001-4000-8000-000000000041'::uuid, 'Australia'),
  ('b2000001-0001-4000-8000-000000000042'::uuid, 'Australia'),
  ('b2000001-0001-4000-8000-000000000043'::uuid, 'Australia'),
  ('b2000001-0001-4000-8000-000000000044'::uuid, 'Australia'),
  ('b2000001-0001-4000-8000-000000000045'::uuid, 'Australia'),
  ('b2000001-0001-4000-8000-000000000046'::uuid, 'Australia'),
  ('b2000001-0001-4000-8000-000000000051'::uuid, 'Germany'),
  ('b2000001-0001-4000-8000-000000000052'::uuid, 'Germany'),
  ('b2000001-0001-4000-8000-000000000053'::uuid, 'Germany'),
  ('b2000001-0001-4000-8000-000000000054'::uuid, 'Germany'),
  ('b2000001-0001-4000-8000-000000000055'::uuid, 'Germany'),
  ('b2000001-0001-4000-8000-000000000061'::uuid, 'New Zealand'),
  ('b2000001-0001-4000-8000-000000000062'::uuid, 'New Zealand'),
  ('b2000001-0001-4000-8000-000000000063'::uuid, 'New Zealand'),
  ('b2000001-0001-4000-8000-000000000064'::uuid, 'New Zealand'),
  ('b2000001-0001-4000-8000-000000000065'::uuid, 'New Zealand')
) AS x(library_id, country)
ON CONFLICT DO NOTHING;

-- Missing service_catalogue SKUs (ON_REQUEST unless noted)
INSERT INTO public.service_catalogue (
  master_key, sub_category, service_name, service_code, pricing_type,
  fee_inr, country_tag, gst_applicable, gst_rate, display_order
)
SELECT * FROM (VALUES
  ('visa_immigration', 'United Kingdom', 'UK — Spouse / Partner Visa', 'VIS-UK-SPOUS', 'ON_REQUEST', NULL::numeric, 'United Kingdom', true, 18, 215),
  ('visa_immigration', 'United States', 'USA — Spouse / Fiancé Visa', 'VIS-US-SPOUS', 'ON_REQUEST', NULL, 'USA', true, 18, 515),
  ('visa_immigration', 'United States', 'USA — Green Card', 'VIS-US-GCARD', 'ON_REQUEST', NULL, 'USA', true, 18, 520),
  ('visa_immigration', 'Australia', 'Australia — Partner Visa', 'VIS-AU-SPOUS', 'ON_REQUEST', NULL, 'Australia', true, 18, 315),
  ('visa_immigration', 'Australia', 'Australia — Skilled Migration', 'VIS-AU-SKILL', 'ON_REQUEST', NULL, 'Australia', true, 18, 320),
  ('visa_immigration', 'Australia', 'Australia — Subclass 485 Graduate', 'VIS-AU-485', 'ON_REQUEST', NULL, 'Australia', true, 18, 325),
  ('visa_immigration', 'New Zealand', 'New Zealand — Visitor Visa', 'VIS-NZ-VISIT', 'ON_REQUEST', NULL, 'New Zealand', true, 18, 705),
  ('visa_immigration', 'New Zealand', 'New Zealand — Partnership Visa', 'VIS-NZ-SPOUS', 'ON_REQUEST', NULL, 'New Zealand', true, 18, 710),
  ('visa_immigration', 'New Zealand', 'New Zealand — Skilled Migrant', 'VIS-NZ-SMC', 'ON_REQUEST', NULL, 'New Zealand', true, 18, 715),
  ('visa_immigration', 'New Zealand', 'New Zealand — Post Study Work', 'VIS-NZ-PSW', 'ON_REQUEST', NULL, 'New Zealand', true, 18, 720),
  ('visa_immigration', 'Germany', 'Germany — Visitor / Schengen Visa', 'VIS-DE-VISIT', 'ON_REQUEST', NULL, 'Germany', true, 18, 405),
  ('visa_immigration', 'Germany', 'Germany — Family Reunion (Spouse)', 'VIS-DE-SPOUS', 'ON_REQUEST', NULL, 'Germany', true, 18, 425),
  ('visa_immigration', 'United Kingdom', 'UK — Skilled Worker Visa', 'VIS-UK-SKILL', 'ON_REQUEST', NULL, 'United Kingdom', true, 18, 220),
  ('visa_immigration', 'United Kingdom', 'UK — Graduate Route', 'VIS-UK-GRAD', 'ON_REQUEST', NULL, 'United Kingdom', true, 18, 225)
) AS v(master_key, sub_category, service_name, service_code, pricing_type, fee_inr, country_tag, gst_applicable, gst_rate, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_catalogue sc WHERE sc.service_code = v.service_code
);
