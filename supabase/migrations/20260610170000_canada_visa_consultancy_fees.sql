-- Canada visa consultancy fees: picker variants for lead form + fee_items + service_catalogue sync.

CREATE TABLE IF NOT EXISTS public.service_library_picker_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  country text NOT NULL DEFAULT 'Canada',
  variant_key text NOT NULL,
  picker_label text NOT NULL,
  group_label text NOT NULL,
  fee_inr numeric NOT NULL,
  fee_cad numeric NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (library_id, country, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_sl_picker_variants_country
  ON public.service_library_picker_variants(country) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_sl_picker_variants_library
  ON public.service_library_picker_variants(library_id);

ALTER TABLE public.service_library_picker_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sl_picker_variants read auth" ON public.service_library_picker_variants;
CREATE POLICY "sl_picker_variants read auth"
  ON public.service_library_picker_variants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sl_picker_variants manage" ON public.service_library_picker_variants;
CREATE POLICY "sl_picker_variants manage"
  ON public.service_library_picker_variants FOR ALL TO authenticated
  USING (public.can_manage_service_library(auth.uid()))
  WITH CHECK (public.can_manage_service_library(auth.uid()));

GRANT SELECT ON public.service_library_picker_variants TO authenticated;
GRANT ALL ON public.service_library_picker_variants TO service_role;

DROP TRIGGER IF EXISTS trg_sl_picker_variants_updated ON public.service_library_picker_variants;
CREATE TRIGGER trg_sl_picker_variants_updated
  BEFORE UPDATE ON public.service_library_picker_variants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.service_catalogue
  ADD COLUMN IF NOT EXISTS library_id uuid REFERENCES public.service_library(id) ON DELETE SET NULL;

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-00000000001c', 'visa_immigration', 'Canada', 'OINP (Ontario PNP)', 22, true),
  ('b2000001-0001-4000-8000-00000000001d', 'visa_immigration', 'Canada', 'PNP Program', 23, true),
  ('b2000001-0001-4000-8000-00000000001e', 'visa_immigration', 'Canada', 'TR to PR pathway', 24, true),
  ('b2000001-0001-4000-8000-00000000001f', 'visa_immigration', 'Canada', 'Spouse Dependent Visa (Extension)', 25, true),
  ('b2000001-0001-4000-8000-000000000020', 'visa_immigration', 'Canada', 'Spouse Dependent Visa (Visitor)', 26, true)
ON CONFLICT (id) DO UPDATE SET
  service_category = EXCLUDED.service_category,
  service = EXCLUDED.service,
  sub_service = EXCLUDED.sub_service,
  display_order = EXCLUDED.display_order,
  is_active = true,
  updated_at = now();

INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, 'Canada'
FROM (VALUES
  ('b2000001-0001-4000-8000-00000000001c'::uuid),
  ('b2000001-0001-4000-8000-00000000001d'::uuid),
  ('b2000001-0001-4000-8000-00000000001e'::uuid),
  ('b2000001-0001-4000-8000-00000000001f'::uuid),
  ('b2000001-0001-4000-8000-000000000020'::uuid)
) AS x(library_id)
ON CONFLICT DO NOTHING;

INSERT INTO public.service_library_picker_variants
  (library_id, country, variant_key, picker_label, group_label, fee_inr, fee_cad, display_order)
VALUES
  ('b2000001-0001-4000-8000-000000000017', 'Canada', 'bowp', 'Canada Bridging Work Permit', 'Immigration Services', 51000, 750, 10),
  ('b2000001-0001-4000-8000-00000000001c', 'Canada', 'oinp', 'Canada PR — OINP', 'Immigration Services', 155000, 2260, 20),
  ('b2000001-0001-4000-8000-000000000013', 'Canada', 'cec', 'Canada PR — Express Entry (CEC)', 'Immigration Services', 140000, 2060, 30),
  ('b2000001-0001-4000-8000-000000000013', 'Canada', 'fsw', 'Canada PR — Express Entry (FSW)', 'Immigration Services', 140000, 2060, 40),
  ('b2000001-0001-4000-8000-000000000013', 'Canada', 'ee-pnp', 'Canada PR — Express Entry + PNP', 'Immigration Services', 152000, 2240, 50),
  ('b2000001-0001-4000-8000-000000000012', 'Canada', 'spouse', 'Canada PR — Family Sponsorship (Spouse)', 'Immigration Services', 150000, 2210, 60),
  ('b2000001-0001-4000-8000-00000000001d', 'Canada', 'pnp-program', 'Canada PR — PNP Program', 'Immigration Services', 210000, 3090, 70),
  ('b2000001-0001-4000-8000-00000000001e', 'Canada', 'tr-to-pr', 'Canada TR to PR pathway', 'Immigration Services', 140000, 2060, 80),
  ('b2000001-0001-4000-8000-00000000001a', 'Canada', 'docs-note', 'Documents Note', 'CAIPS', 3500, 50, 10),
  ('b2000001-0001-4000-8000-00000000001a', 'Canada', 'caips', 'CAIPS', 'CAIPS', 1500, 25, 20),
  ('b2000001-0001-4000-8000-00000000001f', 'Canada', 'extension', 'Canada Spouse Dependent Visa (Extension)', 'Spouse Dependent Visa', 40000, 565, 10),
  ('b2000001-0001-4000-8000-00000000001b', 'Canada', 'owp', 'Canada Spouse Dependent Visa (Open Work Permit)', 'Spouse Dependent Visa', 40000, 565, 20),
  ('b2000001-0001-4000-8000-000000000020', 'Canada', 'visitor', 'Canada Spouse Dependent Visa (Visitor Visa)', 'Spouse Dependent Visa', 30000, 450, 30),
  ('b2000001-0001-4000-8000-000000000011', 'Canada', '1-person', '1 person', 'Visitor Visa', 7080, 110, 10),
  ('b2000001-0001-4000-8000-000000000011', 'Canada', '2-persons', '2 persons', 'Visitor Visa', 10620, 160, 20),
  ('b2000001-0001-4000-8000-000000000011', 'Canada', '3-persons', '3 persons', 'Visitor Visa', 14120, 210, 30),
  ('b2000001-0001-4000-8000-000000000011', 'Canada', '5-persons', '5 people', 'Visitor Visa', 30000, 445, 40),
  ('b2000001-0001-4000-8000-000000000014', 'Canada', 'pgwp', 'Canada Post Graduate Work Permit', 'Student Visa', 15000, 225, 10),
  ('b2000001-0001-4000-8000-000000000014', 'Canada', 'pgwp-extension', 'Canada Post Graduate Work Permit Extension', 'Student Visa', 15000, 225, 20),
  ('c35e6051-f40f-47bf-9cac-0a386c47a336', 'Canada', 'fresh-outside', 'Canada Student Visa (Fresh, Outside India)', 'Student Visa', 15000, 225, 30),
  ('c35e6051-f40f-47bf-9cac-0a386c47a336', 'Canada', 'rejected-outside', 'Canada Student Visa (Rejected Case, Outside India)', 'Student Visa', 35000, 515, 40),
  ('c35e6051-f40f-47bf-9cac-0a386c47a336', 'Canada', 'fresh-india', 'Canada Student Visa (From India — Fresh Case)', 'Student Visa', 10000, 147, 50),
  ('c35e6051-f40f-47bf-9cac-0a386c47a336', 'Canada', 'rejected-india', 'Canada Student Visa (From India — Rejected Case)', 'Student Visa', 10000, 147, 60),
  ('b2000001-0001-4000-8000-000000000018', 'Canada', 'extension', 'Canada Study Permit Extension', 'Student Visa', 10620, 160, 70),
  ('b2000001-0001-4000-8000-000000000018', 'Canada', 'coop-wp', 'Canada Study Permit Extension + Co-op Work Permit', 'Student Visa', 15000, 225, 80),
  ('b2000001-0001-4000-8000-000000000018', 'Canada', 'coop-restoration', 'Canada Study Permit Extension + Co-op WP + Restoration', 'Student Visa', 25000, 370, 90),
  ('b2000001-0001-4000-8000-000000000018', 'Canada', 'restoration', 'Canada Study Permit Extension + Restoration', 'Student Visa', 20000, 300, 100),
  ('b2000001-0001-4000-8000-000000000016', 'Canada', '1-person', '1 person', 'Super Visa', 15000, 225, 10),
  ('b2000001-0001-4000-8000-000000000016', 'Canada', '2-persons', '2 persons', 'Super Visa', 30000, 445, 20),
  ('b2000001-0001-4000-8000-000000000016', 'Canada', '3-persons', '3 people', 'Super Visa', 61200, 900, 30)
ON CONFLICT (library_id, country, variant_key) DO UPDATE SET
  picker_label = EXCLUDED.picker_label,
  group_label = EXCLUDED.group_label,
  fee_inr = EXCLUDED.fee_inr,
  fee_cad = EXCLUDED.fee_cad,
  display_order = EXCLUDED.display_order,
  is_active = true,
  updated_at = now();

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
    CASE WHEN COUNT(*) > 1 THEN 'From rate — see lead form for packages' ELSE NULL END AS notes
  FROM public.service_library_picker_variants v
  WHERE v.country = 'Canada' AND v.is_active
  GROUP BY v.library_id
  UNION ALL
  SELECT v.library_id, 'Consultancy fee (CAD)',
    to_char(MIN(v.fee_cad), 'FM999,999,999'), 'CAD', 51,
    CASE WHEN COUNT(*) > 1 THEN 'From rate — see lead form for packages' ELSE NULL END
  FROM public.service_library_picker_variants v
  WHERE v.country = 'Canada' AND v.is_active
  GROUP BY v.library_id
) sub;

INSERT INTO public.service_catalogue (
  master_key, sub_category, service_name, service_code, pricing_type,
  fee_inr, fee_cad, country_tag, gst_applicable, gst_rate, display_order, library_id, is_active
)
SELECT
  'visa_immigration',
  'Canada',
  v.picker_label,
  v.library_id::text || '::Canada::' || v.variant_key,
  'FIXED',
  v.fee_inr,
  v.fee_cad,
  'Canada',
  true,
  18,
  v.display_order + CASE v.group_label
    WHEN 'Immigration Services' THEN 100
    WHEN 'CAIPS' THEN 200
    WHEN 'Spouse Dependent Visa' THEN 300
    WHEN 'Visitor Visa' THEN 400
    WHEN 'Student Visa' THEN 500
    WHEN 'Super Visa' THEN 600
    ELSE 700
  END,
  v.library_id,
  true
FROM public.service_library_picker_variants v
WHERE v.country = 'Canada' AND v.is_active
ON CONFLICT (service_code) DO UPDATE SET
  service_name = EXCLUDED.service_name,
  fee_inr = EXCLUDED.fee_inr,
  fee_cad = EXCLUDED.fee_cad,
  pricing_type = 'FIXED',
  library_id = EXCLUDED.library_id,
  is_active = true,
  updated_at = now();
