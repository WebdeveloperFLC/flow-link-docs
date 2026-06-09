-- UK visa government fees: priority tiers as picker variants.

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-000000000021', 'visa_immigration', 'United Kingdom', 'Student Visa (Student Route)', 20, true),
  ('b2000001-0001-4000-8000-000000000022', 'visa_immigration', 'United Kingdom', 'Standard Visitor Visa', 21, true),
  ('b2000001-0001-4000-8000-000000000023', 'visa_immigration', 'United Kingdom', 'Partner / Spouse Visa', 22, true),
  ('b2000001-0001-4000-8000-000000000024', 'visa_immigration', 'United Kingdom', 'Skilled Worker Visa', 23, true),
  ('b2000001-0001-4000-8000-000000000025', 'visa_immigration', 'United Kingdom', 'Graduate Route', 24, true)
ON CONFLICT (id) DO UPDATE SET is_active = true, updated_at = now();

INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, x.country FROM (VALUES
  ('b2000001-0001-4000-8000-000000000021'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000022'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000023'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000024'::uuid, 'United Kingdom'),
  ('b2000001-0001-4000-8000-000000000025'::uuid, 'United Kingdom')
) AS x(library_id, country)
ON CONFLICT DO NOTHING;

INSERT INTO public.service_library_picker_variants
  (library_id, country, variant_key, picker_label, group_label, fee_inr, fee_cad,
   govt_amount, govt_currency, govt_fee_inr, govt_fee_cad, display_order)
VALUES
  -- UK Student Visa: Standard / Priority / Super Priority
  ('b2000001-0001-4000-8000-000000000021', 'United Kingdom', 'standard',
   'Standard Student Visa', 'Processing speed', 0, 0, 558, 'GBP', 58590, 960, 10),
  ('b2000001-0001-4000-8000-000000000021', 'United Kingdom', 'priority',
   'Priority Visa Service', 'Processing speed', 0, 0, 1058, 'GBP', 111090, 1820, 20),
  ('b2000001-0001-4000-8000-000000000021', 'United Kingdom', 'super-priority',
   'Super Priority Visa Service', 'Processing speed', 0, 0, 1558, 'GBP', 163590, 2680, 30),
  -- UK Visitor Visa
  ('b2000001-0001-4000-8000-000000000022', 'United Kingdom', 'standard',
   'Standard Visitor Visa', 'Processing speed', 0, 0, 115, 'GBP', 12075, 198, 10),
  ('b2000001-0001-4000-8000-000000000022', 'United Kingdom', 'priority',
   'Priority Visitor Visa', 'Processing speed', 0, 0, 615, 'GBP', 64575, 1058, 20),
  ('b2000001-0001-4000-8000-000000000022', 'United Kingdom', 'super-priority',
   'Super Priority Visitor Visa', 'Processing speed', 0, 0, 1115, 'GBP', 117075, 1918, 30),
  -- UK Spouse Visa
  ('b2000001-0001-4000-8000-000000000023', 'United Kingdom', 'standard',
   'Standard Spouse Visa', 'Processing speed', 0, 0, 1846, 'GBP', 193830, 3175, 10),
  ('b2000001-0001-4000-8000-000000000023', 'United Kingdom', 'priority',
   'Priority Spouse Visa', 'Processing speed', 0, 0, 2346, 'GBP', 246330, 4035, 20),
  ('b2000001-0001-4000-8000-000000000023', 'United Kingdom', 'super-priority',
   'Super Priority Spouse Visa', 'Processing speed', 0, 0, 2846, 'GBP', 298830, 4895, 30),
  -- UK Skilled Worker
  ('b2000001-0001-4000-8000-000000000024', 'United Kingdom', 'standard',
   'Standard Skilled Worker Visa', 'Processing speed', 0, 0, 719, 'GBP', 75495, 1237, 10),
  ('b2000001-0001-4000-8000-000000000024', 'United Kingdom', 'priority',
   'Priority Skilled Worker Visa', 'Processing speed', 0, 0, 1219, 'GBP', 127995, 2097, 20),
  ('b2000001-0001-4000-8000-000000000024', 'United Kingdom', 'super-priority',
   'Super Priority Skilled Worker Visa', 'Processing speed', 0, 0, 1719, 'GBP', 180495, 2957, 30),
  -- UK Graduate Route
  ('b2000001-0001-4000-8000-000000000025', 'United Kingdom', 'standard',
   'Standard Graduate Route', 'Processing speed', 0, 0, 822, 'GBP', 86310, 1414, 10),
  ('b2000001-0001-4000-8000-000000000025', 'United Kingdom', 'priority',
   'Priority Graduate Route', 'Processing speed', 0, 0, 1322, 'GBP', 138810, 2274, 20),
  ('b2000001-0001-4000-8000-000000000025', 'United Kingdom', 'super-priority',
   'Super Priority Graduate Route', 'Processing speed', 0, 0, 1822, 'GBP', 191310, 3134, 30)
ON CONFLICT (library_id, country, variant_key) DO UPDATE SET
  picker_label = EXCLUDED.picker_label,
  group_label = EXCLUDED.group_label,
  govt_amount = EXCLUDED.govt_amount,
  govt_currency = EXCLUDED.govt_currency,
  govt_fee_inr = EXCLUDED.govt_fee_inr,
  govt_fee_cad = EXCLUDED.govt_fee_cad,
  display_order = EXCLUDED.display_order,
  is_active = true,
  updated_at = now();

DELETE FROM public.service_library_fee_items
WHERE library_id IN (
  'b2000001-0001-4000-8000-000000000021',
  'b2000001-0001-4000-8000-000000000022',
  'b2000001-0001-4000-8000-000000000023',
  'b2000001-0001-4000-8000-000000000024',
  'b2000001-0001-4000-8000-000000000025'
)
AND fee_label ILIKE 'government%';

INSERT INTO public.service_library_fee_items (library_id, fee_label, amount, currency, country, display_order, notes)
VALUES
  ('b2000001-0001-4000-8000-000000000021', 'Government fee (standard)', '558', 'GBP', 'United Kingdom', 10, '~3 weeks; + IHS per year'),
  ('b2000001-0001-4000-8000-000000000021', 'Government fee (priority)', '1058', 'GBP', 'United Kingdom', 11, '~5 working days'),
  ('b2000001-0001-4000-8000-000000000021', 'Government fee (super priority)', '1558', 'GBP', 'United Kingdom', 12, '~1 working day after biometrics'),
  ('b2000001-0001-4000-8000-000000000022', 'Government fee (standard)', '115', 'GBP', 'United Kingdom', 10, '6-month visit'),
  ('b2000001-0001-4000-8000-000000000023', 'Government fee (standard)', '1846', 'GBP', 'United Kingdom', 10, '+ IHS (5 years typical)'),
  ('b2000001-0001-4000-8000-000000000024', 'Government fee (standard)', '719', 'GBP', 'United Kingdom', 10, '+ IHS per year'),
  ('b2000001-0001-4000-8000-000000000025', 'Government fee (standard)', '822', 'GBP', 'United Kingdom', 10, '+ IHS');
