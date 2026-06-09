-- Consultancy fees: India market standard rates for lead form + fee_items sync.
-- Canada picker_variants updated to match; international services get Consultancy fee (INR) rows.

-- Canada student — raise India fresh/rejected to market standard
UPDATE public.service_library_picker_variants SET fee_inr = 18000, fee_cad = 265
WHERE library_id = 'c35e6051-f40f-47bf-9cac-0a386c47a336' AND variant_key = 'fresh-india';
UPDATE public.service_library_picker_variants SET fee_inr = 28000, fee_cad = 410
WHERE library_id = 'c35e6051-f40f-47bf-9cac-0a386c47a336' AND variant_key = 'rejected-india';
UPDATE public.service_library_picker_variants SET fee_inr = 22000, fee_cad = 322
WHERE library_id = 'c35e6051-f40f-47bf-9cac-0a386c47a336' AND variant_key = 'fresh-outside';
UPDATE public.service_library_picker_variants SET fee_inr = 38000, fee_cad = 556
WHERE library_id = 'c35e6051-f40f-47bf-9cac-0a386c47a336' AND variant_key = 'rejected-outside';

-- Canada visitor — standard market rates
UPDATE public.service_library_picker_variants SET fee_inr = 10000, fee_cad = 147
WHERE library_id = 'b2000001-0001-4000-8000-000000000011' AND variant_key = '1-person';
UPDATE public.service_library_picker_variants SET fee_inr = 15000, fee_cad = 220
WHERE library_id = 'b2000001-0001-4000-8000-000000000011' AND variant_key = '2-persons';
UPDATE public.service_library_picker_variants SET fee_inr = 20000, fee_cad = 293
WHERE library_id = 'b2000001-0001-4000-8000-000000000011' AND variant_key = '3-persons';
UPDATE public.service_library_picker_variants SET fee_inr = 32000, fee_cad = 468
WHERE library_id = 'b2000001-0001-4000-8000-000000000011' AND variant_key = '5-persons';

-- Canada PR / immigration — slight premium alignment
UPDATE public.service_library_picker_variants SET fee_inr = 145000, fee_cad = 2135
WHERE library_id = 'b2000001-0001-4000-8000-000000000013' AND variant_key IN ('fsw', 'cec');
UPDATE public.service_library_picker_variants SET fee_inr = 165000, fee_cad = 2430
WHERE library_id = 'b2000001-0001-4000-8000-000000000013' AND variant_key = 'ee-pnp';
UPDATE public.service_library_picker_variants SET fee_inr = 155000, fee_cad = 2280
WHERE library_id = 'b2000001-0001-4000-8000-000000000012' AND variant_key = 'spouse';

-- PGWP / extensions
UPDATE public.service_library_picker_variants SET fee_inr = 18000, fee_cad = 265
WHERE library_id = 'b2000001-0001-4000-8000-000000000014' AND variant_key IN ('pgwp', 'pgwp-extension');
UPDATE public.service_library_picker_variants SET fee_inr = 18000, fee_cad = 265
WHERE library_id = 'b2000001-0001-4000-8000-000000000018' AND variant_key = 'extension';

-- Re-sync Canada consultancy fee_items from picker_variants
DELETE FROM public.service_library_fee_items f
WHERE f.fee_label IN ('Consultancy fee (INR)', 'Consultancy fee (CAD)')
  AND f.library_id IN (
    SELECT DISTINCT library_id FROM public.service_library_picker_variants WHERE country = 'Canada'
  );

INSERT INTO public.service_library_fee_items (library_id, fee_label, amount, currency, country, display_order, notes)
SELECT
  sub.library_id,
  sub.fee_label,
  sub.amount,
  sub.currency,
  'Canada',
  sub.display_order,
  sub.notes
FROM (
  SELECT v.library_id, 'Consultancy fee (INR)' AS fee_label,
    to_char(MIN(v.fee_inr), 'FM999,999,999') AS amount, 'INR' AS currency, 50 AS display_order,
    CASE WHEN COUNT(*) > 1 THEN 'From rate — see Fees tab for packages' ELSE NULL END AS notes
  FROM public.service_library_picker_variants v
  WHERE v.country = 'Canada' AND v.is_active
  GROUP BY v.library_id
  UNION ALL
  SELECT v.library_id, 'Consultancy fee (CAD)',
    to_char(MIN(v.fee_cad), 'FM999,999,999'), 'CAD', 51,
    CASE WHEN COUNT(*) > 1 THEN 'From rate — see Fees tab for packages' ELSE NULL END
  FROM public.service_library_picker_variants v
  WHERE v.country = 'Canada' AND v.is_active
  GROUP BY v.library_id
) sub;

-- International visa services: single Consultancy fee (INR) row per library_id
DELETE FROM public.service_library_fee_items
WHERE fee_label = 'Consultancy fee (INR)'
  AND library_id IN (
    'b2000001-0001-4000-8000-000000000021',
    'b2000001-0001-4000-8000-000000000022',
    'b2000001-0001-4000-8000-000000000023',
    'b2000001-0001-4000-8000-000000000024',
    'b2000001-0001-4000-8000-000000000025',
    'b2000001-0001-4000-8000-000000000031',
    'b2000001-0001-4000-8000-000000000032',
    'b2000001-0001-4000-8000-000000000033',
    'b2000001-0001-4000-8000-000000000034',
    'b2000001-0001-4000-8000-000000000041',
    'b2000001-0001-4000-8000-000000000042',
    'b2000001-0001-4000-8000-000000000043',
    'b2000001-0001-4000-8000-000000000044',
    'b2000001-0001-4000-8000-000000000045',
    'b2000001-0001-4000-8000-000000000046',
    'b2000001-0001-4000-8000-000000000051',
    'b2000001-0001-4000-8000-000000000052',
    'b2000001-0001-4000-8000-000000000053',
    'b2000001-0001-4000-8000-000000000054',
    'b2000001-0001-4000-8000-000000000055',
    'b2000001-0001-4000-8000-000000000061',
    'b2000001-0001-4000-8000-000000000062',
    'b2000001-0001-4000-8000-000000000063',
    'b2000001-0001-4000-8000-000000000064',
    'b2000001-0001-4000-8000-000000000065',
    'b2000001-0001-4000-8000-000000000081',
    'b2000001-0001-4000-8000-000000000082',
    'b2000001-0001-4000-8000-000000000091',
    'b2000001-0001-4000-8000-000000000092',
    'b2000001-0001-4000-8000-0000000000a1',
    'b2000001-0001-4000-8000-0000000000a2',
    'b2000001-0001-4000-8000-0000000000a3',
    'b2000001-0001-4000-8000-0000000000a4',
    'b2000001-0001-4000-8000-0000000000a5',
    'b2000001-0001-4000-8000-0000000000a6',
    'b2000001-0001-4000-8000-0000000000a7',
    'b2000001-0001-4000-8000-0000000000a8',
    'b2000001-0001-4000-8000-0000000000a9',
    'b2000001-0001-4000-8000-0000000000aa',
    'b2000001-0001-4000-8000-0000000000ab',
    'b2000001-0001-4000-8000-0000000000ac',
    'b2000001-0001-4000-8000-0000000000ad',
    'b2000001-0001-4000-8000-0000000000ae',
    'b2000001-0001-4000-8000-0000000000af',
    'b2000001-0001-4000-8000-0000000000b0',
    'b2000001-0001-4000-8000-0000000000b1',
    'b2000001-0001-4000-8000-0000000000b2',
    'b2000001-0001-4000-8000-0000000000b3',
    'b2000001-0001-4000-8000-0000000000b4'
  );

INSERT INTO public.service_library_fee_items (library_id, fee_label, amount, currency, country, display_order, notes)
SELECT x.library_id, 'Consultancy fee (INR)', x.amount, 'INR', x.country, 40, x.notes
FROM (VALUES
  ('b2000001-0001-4000-8000-000000000021'::uuid, 'United Kingdom', '28000', 'Student visa full service'),
  ('b2000001-0001-4000-8000-000000000022'::uuid, 'United Kingdom', '12000', 'Visitor visa filing'),
  ('b2000001-0001-4000-8000-000000000023'::uuid, 'United Kingdom', '95000', 'Partner / spouse visa'),
  ('b2000001-0001-4000-8000-000000000024'::uuid, 'United Kingdom', '55000', 'Skilled Worker visa'),
  ('b2000001-0001-4000-8000-000000000025'::uuid, 'United Kingdom', '42000', 'Graduate Route'),
  ('b2000001-0001-4000-8000-000000000031'::uuid, 'United States', '32000', 'F-1 student visa'),
  ('b2000001-0001-4000-8000-000000000032'::uuid, 'United States', '14000', 'B1/B2 visitor visa'),
  ('b2000001-0001-4000-8000-000000000033'::uuid, 'United States', '175000', 'Spouse / fiancé visa'),
  ('b2000001-0001-4000-8000-000000000034'::uuid, 'United States', '250000', 'Green card case'),
  ('b2000001-0001-4000-8000-000000000041'::uuid, 'Australia', '42000', 'Student visa Subclass 500'),
  ('b2000001-0001-4000-8000-000000000042'::uuid, 'Australia', '16000', 'Visitor visa Subclass 600'),
  ('b2000001-0001-4000-8000-000000000043'::uuid, 'Australia', '185000', 'Partner visa'),
  ('b2000001-0001-4000-8000-000000000044'::uuid, 'Australia', '145000', 'Skilled migration'),
  ('b2000001-0001-4000-8000-000000000045'::uuid, 'Australia', '52000', 'Subclass 485'),
  ('b2000001-0001-4000-8000-000000000046'::uuid, 'Australia', '22000', 'Work & Holiday'),
  ('b2000001-0001-4000-8000-000000000051'::uuid, 'Germany', '38000', 'Student D visa'),
  ('b2000001-0001-4000-8000-000000000052'::uuid, 'Germany', '12000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-000000000053'::uuid, 'Germany', '75000', 'Family reunion'),
  ('b2000001-0001-4000-8000-000000000054'::uuid, 'Germany', '65000', 'Opportunity Card'),
  ('b2000001-0001-4000-8000-000000000055'::uuid, 'Germany', '60000', 'Job Seeker visa'),
  ('b2000001-0001-4000-8000-000000000061'::uuid, 'New Zealand', '35000', 'Student visa'),
  ('b2000001-0001-4000-8000-000000000062'::uuid, 'New Zealand', '16000', 'Visitor visa'),
  ('b2000001-0001-4000-8000-000000000063'::uuid, 'New Zealand', '135000', 'Partnership visa'),
  ('b2000001-0001-4000-8000-000000000064'::uuid, 'New Zealand', '175000', 'Skilled Migrant Category'),
  ('b2000001-0001-4000-8000-000000000065'::uuid, 'New Zealand', '48000', 'Post Study Work Visa'),
  ('b2000001-0001-4000-8000-000000000081'::uuid, 'France', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-000000000082'::uuid, 'France', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-000000000091'::uuid, 'Italy', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-000000000092'::uuid, 'Italy', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000a1'::uuid, 'Netherlands', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000a2'::uuid, 'Netherlands', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000a3'::uuid, 'Ireland', '30000', 'Stamp 2 student'),
  ('b2000001-0001-4000-8000-0000000000a4'::uuid, 'Ireland', '12000', 'Short stay visit'),
  ('b2000001-0001-4000-8000-0000000000a5'::uuid, 'Spain', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000a6'::uuid, 'Spain', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000a7'::uuid, 'Malta', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000a8'::uuid, 'Malta', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000a9'::uuid, 'Finland', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000aa'::uuid, 'Finland', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000ab'::uuid, 'Sweden', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000ac'::uuid, 'Sweden', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000ad'::uuid, 'Austria', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000ae'::uuid, 'Austria', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000af'::uuid, 'Belgium', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000b0'::uuid, 'Belgium', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000b1'::uuid, 'Denmark', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000b2'::uuid, 'Denmark', '11000', 'Schengen visitor'),
  ('b2000001-0001-4000-8000-0000000000b3'::uuid, 'Portugal', '32000', 'Student visa'),
  ('b2000001-0001-4000-8000-0000000000b4'::uuid, 'Portugal', '11000', 'Schengen visitor')
) AS x(library_id, country, amount, notes)
INNER JOIN public.service_library sl ON sl.id = x.library_id;
