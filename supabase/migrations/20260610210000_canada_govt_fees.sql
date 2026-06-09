-- Canada government fees on picker variants + fee_items fallback rows.

-- Visitor Visa & Super Visa: CAD $100 per applicant
UPDATE public.service_library_picker_variants
SET govt_amount = 100, govt_currency = 'CAD',
    govt_fee_inr = 6130, govt_fee_cad = 100
WHERE country = 'Canada'
  AND library_id IN (
    'b2000001-0001-4000-8000-000000000011',
    'b2000001-0001-4000-8000-000000000016'
  );

-- Student Visa variants: CAD $150
UPDATE public.service_library_picker_variants
SET govt_amount = 150, govt_currency = 'CAD',
    govt_fee_inr = 9195, govt_fee_cad = 150
WHERE country = 'Canada'
  AND library_id IN (
    'c35e6051-f40f-47bf-9cac-0a386c47a336',
    'b2000001-0001-4000-8000-000000000018'
  );

-- PGWP, BOWP, Spouse dependent OWP/extension: CAD $255
UPDATE public.service_library_picker_variants
SET govt_amount = 255, govt_currency = 'CAD',
    govt_fee_inr = 15632, govt_fee_cad = 255
WHERE country = 'Canada'
  AND library_id IN (
    'b2000001-0001-4000-8000-000000000014',
    'b2000001-0001-4000-8000-000000000017',
    'b2000001-0001-4000-8000-00000000001b',
    'b2000001-0001-4000-8000-00000000001f'
  );

-- Work Permit: CAD $155
UPDATE public.service_library_picker_variants
SET govt_amount = 155, govt_currency = 'CAD',
    govt_fee_inr = 9502, govt_fee_cad = 155
WHERE country = 'Canada'
  AND library_id = 'b2000001-0001-4000-8000-000000000015';

-- Express Entry / PR pathways: CAD $1,525
UPDATE public.service_library_picker_variants
SET govt_amount = 1525, govt_currency = 'CAD',
    govt_fee_inr = 93483, govt_fee_cad = 1525
WHERE country = 'Canada'
  AND library_id IN (
    'b2000001-0001-4000-8000-000000000013',
    'b2000001-0001-4000-8000-00000000001c',
    'b2000001-0001-4000-8000-00000000001d',
    'b2000001-0001-4000-8000-00000000001e'
  );

-- Family Sponsorship Spouse PR: CAD $1,150
UPDATE public.service_library_picker_variants
SET govt_amount = 1150, govt_currency = 'CAD',
    govt_fee_inr = 70495, govt_fee_cad = 1150
WHERE country = 'Canada'
  AND library_id = 'b2000001-0001-4000-8000-000000000012'
  AND variant_key = 'spouse';

-- Spouse dependent visitor: CAD $100
UPDATE public.service_library_picker_variants
SET govt_amount = 100, govt_currency = 'CAD',
    govt_fee_inr = 6130, govt_fee_cad = 100
WHERE country = 'Canada'
  AND library_id = 'b2000001-0001-4000-8000-000000000020';

-- CAIPS: CAD $5
UPDATE public.service_library_picker_variants
SET govt_amount = 5, govt_currency = 'CAD',
    govt_fee_inr = 307, govt_fee_cad = 5
WHERE country = 'Canada'
  AND library_id = 'b2000001-0001-4000-8000-00000000001a';

-- Parent-level fee_items for Canada services (fallback when no variant)
-- Remove existing govt rows if re-run
DELETE FROM public.service_library_fee_items f
WHERE f.fee_label = 'Government fee'
  AND f.library_id IN (
    SELECT library_id FROM (VALUES
      ('b2000001-0001-4000-8000-000000000011'::uuid),
      ('b2000001-0001-4000-8000-000000000012'::uuid),
      ('b2000001-0001-4000-8000-000000000013'::uuid),
      ('c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid),
      ('b2000001-0001-4000-8000-000000000014'::uuid),
      ('b2000001-0001-4000-8000-000000000015'::uuid),
      ('b2000001-0001-4000-8000-000000000016'::uuid),
      ('b2000001-0001-4000-8000-000000000017'::uuid),
      ('b2000001-0001-4000-8000-000000000018'::uuid),
      ('b2000001-0001-4000-8000-000000000019'::uuid),
      ('b2000001-0001-4000-8000-00000000001a'::uuid),
      ('b2000001-0001-4000-8000-00000000001b'::uuid)
    ) AS t(library_id)
  );

INSERT INTO public.service_library_fee_items (library_id, fee_label, amount, currency, country, display_order, notes)
SELECT x.library_id, 'Government fee', x.amount, 'CAD', 'Canada', 10, x.notes
FROM (VALUES
  ('b2000001-0001-4000-8000-000000000011'::uuid, '100', 'Per applicant; + biometrics CAD $85 if required'),
  ('b2000001-0001-4000-8000-000000000012'::uuid, '1150', 'Family sponsorship PR fee'),
  ('b2000001-0001-4000-8000-000000000013'::uuid, '1525', 'PR application after ITA'),
  ('c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid, '150', '+ biometrics if applicable'),
  ('b2000001-0001-4000-8000-000000000014'::uuid, '255', 'Verify on canada.ca'),
  ('b2000001-0001-4000-8000-000000000015'::uuid, '155', 'Worker fee + biometrics'),
  ('b2000001-0001-4000-8000-000000000016'::uuid, '100', '+ biometrics + insurance'),
  ('b2000001-0001-4000-8000-000000000017'::uuid, '255', 'Verify on canada.ca'),
  ('b2000001-0001-4000-8000-000000000018'::uuid, '150', 'Verify on canada.ca'),
  ('b2000001-0001-4000-8000-000000000019'::uuid, '100', 'Verify on canada.ca'),
  ('b2000001-0001-4000-8000-00000000001a'::uuid, '5', 'Verify on canada.ca'),
  ('b2000001-0001-4000-8000-00000000001b'::uuid, '255', 'Verify on canada.ca')
) AS x(library_id, amount, notes);
