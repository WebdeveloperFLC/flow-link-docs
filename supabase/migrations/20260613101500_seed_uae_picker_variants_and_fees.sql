-- UAE picker variants (visitor duration tiers + emirate routes) and fee_items.
-- PREREQUISITE: 20260613100000_seed_uae_visa_services.sql

-- Helper: fee_cad ≈ fee_inr / 60 for picker schema compatibility
INSERT INTO public.service_library_picker_variants
  (library_id, country, variant_key, picker_label, group_label, fee_inr, fee_cad, display_order)
VALUES
  -- Student — emirate routes
  ('b2000001-0001-4000-8000-0000000000cf', 'United Arab Emirates', 'dxb_student', 'Dubai Student Residence Visa', 'Student Visa', 15000, 250, 10),
  ('b2000001-0001-4000-8000-0000000000cf', 'United Arab Emirates', 'shj_student', 'Sharjah Student Residence Visa', 'Student Visa', 14000, 233, 20),
  ('b2000001-0001-4000-8000-0000000000cf', 'United Arab Emirates', 'auh_student', 'Abu Dhabi Student Residence Visa', 'Student Visa', 15000, 250, 30),
  -- Spouse / dependent — emirate routes
  ('b2000001-0001-4000-8000-0000000000d8', 'United Arab Emirates', 'dxb_spouse', 'Dubai Spouse / Dependent Visa', 'Spouse Dependent Visa', 30000, 500, 10),
  ('b2000001-0001-4000-8000-0000000000d8', 'United Arab Emirates', 'shj_spouse', 'Sharjah Spouse / Dependent Visa', 'Spouse Dependent Visa', 28000, 467, 20),
  ('b2000001-0001-4000-8000-0000000000d8', 'United Arab Emirates', 'auh_spouse', 'Abu Dhabi Spouse / Dependent Visa', 'Spouse Dependent Visa', 30000, 500, 30),
  -- Visitor — Dubai
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'dxb_30_single', 'Dubai Visitor Visa 30 Days — Single Entry', 'Dubai Visitor Visa', 5000, 83, 10),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'dxb_30_multi', 'Dubai Visitor Visa 30 Days — Multiple Entry', 'Dubai Visitor Visa', 5000, 83, 20),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'dxb_60_single', 'Dubai Visitor Visa 60 Days — Single Entry', 'Dubai Visitor Visa', 6000, 100, 30),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'dxb_60_multi', 'Dubai Visitor Visa 60 Days — Multiple Entry', 'Dubai Visitor Visa', 6000, 100, 40),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'dxb_90_single', 'Dubai Visitor Visa 90 Days — Single Entry', 'Dubai Visitor Visa', 7000, 117, 50),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'dxb_90_multi', 'Dubai Visitor Visa 90 Days — Multiple Entry', 'Dubai Visitor Visa', 7500, 125, 60),
  -- Visitor — Sharjah
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'shj_30_single', 'Sharjah Visitor Visa 30 Days — Single Entry', 'Sharjah Visitor Visa', 4500, 75, 70),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'shj_30_multi', 'Sharjah Visitor Visa 30 Days — Multiple Entry', 'Sharjah Visitor Visa', 4500, 75, 80),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'shj_60_single', 'Sharjah Visitor Visa 60 Days — Single Entry', 'Sharjah Visitor Visa', 5500, 92, 90),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'shj_60_multi', 'Sharjah Visitor Visa 60 Days — Multiple Entry', 'Sharjah Visitor Visa', 5500, 92, 100),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'shj_90_single', 'Sharjah Visitor Visa 90 Days — Single Entry', 'Sharjah Visitor Visa', 6500, 108, 110),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'shj_90_multi', 'Sharjah Visitor Visa 90 Days — Multiple Entry', 'Sharjah Visitor Visa', 7000, 117, 120),
  -- Visitor — Abu Dhabi
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'auh_30_single', 'Abu Dhabi Visitor Visa 30 Days — Single Entry', 'Abu Dhabi Visitor Visa', 5000, 83, 130),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'auh_30_multi', 'Abu Dhabi Visitor Visa 30 Days — Multiple Entry', 'Abu Dhabi Visitor Visa', 5000, 83, 140),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'auh_60_single', 'Abu Dhabi Visitor Visa 60 Days — Single Entry', 'Abu Dhabi Visitor Visa', 6000, 100, 150),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'auh_60_multi', 'Abu Dhabi Visitor Visa 60 Days — Multiple Entry', 'Abu Dhabi Visitor Visa', 6000, 100, 160),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'auh_90_single', 'Abu Dhabi Visitor Visa 90 Days — Single Entry', 'Abu Dhabi Visitor Visa', 7000, 117, 170),
  ('b2000001-0001-4000-8000-0000000000d9', 'United Arab Emirates', 'auh_90_multi', 'Abu Dhabi Visitor Visa 90 Days — Multiple Entry', 'Abu Dhabi Visitor Visa', 7500, 125, 180),
  -- Work permit categories
  ('b2000001-0001-4000-8000-0000000000da', 'United Arab Emirates', 'wp_skilled_mohre', 'UAE Employment Visa — Skilled (MOHRE)', 'Work Permit', 50000, 833, 10),
  ('b2000001-0001-4000-8000-0000000000da', 'United Arab Emirates', 'wp_freezone', 'UAE Employment Visa — Free Zone', 'Work Permit', 55000, 917, 20),
  ('b2000001-0001-4000-8000-0000000000da', 'United Arab Emirates', 'wp_domestic', 'UAE Employment Visa — Domestic Worker', 'Work Permit', 35000, 583, 30),
  -- Golden Visa categories
  ('b2000001-0001-4000-8000-0000000000db', 'United Arab Emirates', 'golden_investor', 'Golden Visa — Investor / Partner', 'Golden Visa', 95000, 1583, 10),
  ('b2000001-0001-4000-8000-0000000000db', 'United Arab Emirates', 'golden_property', 'Golden Visa — Real Estate (AED 2M+)', 'Golden Visa', 85000, 1417, 20),
  ('b2000001-0001-4000-8000-0000000000db', 'United Arab Emirates', 'golden_entrepreneur', 'Golden Visa — Entrepreneur', 'Golden Visa', 90000, 1500, 30),
  ('b2000001-0001-4000-8000-0000000000db', 'United Arab Emirates', 'golden_talent', 'Golden Visa — Talented Professional', 'Golden Visa', 75000, 1250, 40),
  ('b2000001-0001-4000-8000-0000000000db', 'United Arab Emirates', 'golden_scientist', 'Golden Visa — Scientist / Researcher', 'Golden Visa', 80000, 1333, 50),
  ('b2000001-0001-4000-8000-0000000000db', 'United Arab Emirates', 'golden_outstanding_student', 'Golden Visa — Outstanding Student', 'Golden Visa', 65000, 1083, 60)
ON CONFLICT (library_id, country, variant_key) DO UPDATE SET
  picker_label = EXCLUDED.picker_label,
  group_label = EXCLUDED.group_label,
  fee_inr = EXCLUDED.fee_inr,
  fee_cad = EXCLUDED.fee_cad,
  display_order = EXCLUDED.display_order,
  is_active = true,
  updated_at = now();

-- Consultancy fee_items (INR) — sync from picker minimum per service
DELETE FROM public.service_library_fee_items
WHERE library_id IN (
  'b2000001-0001-4000-8000-0000000000cf',
  'b2000001-0001-4000-8000-0000000000d8',
  'b2000001-0001-4000-8000-0000000000d9',
  'b2000001-0001-4000-8000-0000000000da',
  'b2000001-0001-4000-8000-0000000000db'
)
AND fee_label IN ('Consultancy fee (INR)', 'Government fee (AED)');

INSERT INTO public.service_library_fee_items (library_id, fee_label, amount, currency, country, display_order, notes)
SELECT
  sub.library_id,
  sub.fee_label,
  sub.amount,
  sub.currency,
  'United Arab Emirates',
  sub.display_order,
  sub.notes
FROM (
  SELECT v.library_id, 'Consultancy fee (INR)' AS fee_label,
    to_char(MIN(v.fee_inr), 'FM999,999,999') AS amount, 'INR' AS currency, 50 AS display_order,
    'From rate — see Fees tab for packages' AS notes
  FROM public.service_library_picker_variants v
  WHERE v.library_id IN (
    'b2000001-0001-4000-8000-0000000000cf',
    'b2000001-0001-4000-8000-0000000000d8',
    'b2000001-0001-4000-8000-0000000000d9',
    'b2000001-0001-4000-8000-0000000000da',
    'b2000001-0001-4000-8000-0000000000db'
  ) AND v.is_active
  GROUP BY v.library_id
  UNION ALL
  SELECT 'b2000001-0001-4000-8000-0000000000cf'::uuid, 'Government fee (AED)', '1,000–3,000', 'AED', 10, 'Entry permit + ID — verify GDRFA'
  UNION ALL
  SELECT 'b2000001-0001-4000-8000-0000000000d8'::uuid, 'Government fee (AED)', '1,000–2,500', 'AED', 10, 'Dependent permit + medical'
  UNION ALL
  SELECT 'b2000001-0001-4000-8000-0000000000d9'::uuid, 'Government fee (AED)', '200–1,200', 'AED', 10, 'By duration & entry type'
  UNION ALL
  SELECT 'b2000001-0001-4000-8000-0000000000da'::uuid, 'Government fee (AED)', '3,000–8,000', 'AED', 10, 'MOHRE + permit + medical'
  UNION ALL
  SELECT 'b2000001-0001-4000-8000-0000000000db'::uuid, 'Government fee (AED)', '2,000–5,000', 'AED', 10, 'Golden Visa issuance + ID'
) sub;
