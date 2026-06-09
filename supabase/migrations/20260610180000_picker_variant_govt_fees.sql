-- Government fee columns on lead-form picker variants; seed from fee_items.

ALTER TABLE public.service_library_picker_variants
  ADD COLUMN IF NOT EXISTS govt_fee_inr numeric,
  ADD COLUMN IF NOT EXISTS govt_fee_cad numeric;

-- Seed variant govt fees from parent service_library_fee_items (Government / IRCC rows).
UPDATE public.service_library_picker_variants pv
SET
  govt_fee_inr = COALESCE(pv.govt_fee_inr, sub.inr),
  govt_fee_cad = COALESCE(pv.govt_fee_cad, sub.cad)
FROM (
  SELECT
    fi.library_id,
    MAX(CASE WHEN UPPER(COALESCE(fi.currency, 'INR')) = 'INR' THEN NULLIF(REGEXP_REPLACE(fi.amount, '[^0-9.]', '', 'g'), '')::numeric END) AS inr,
    MAX(CASE WHEN UPPER(COALESCE(fi.currency, 'INR')) = 'CAD' THEN NULLIF(REGEXP_REPLACE(fi.amount, '[^0-9.]', '', 'g'), '')::numeric END) AS cad
  FROM public.service_library_fee_items fi
  WHERE fi.fee_label ~* '(government|govt|ircc)'
  GROUP BY fi.library_id
) sub
WHERE pv.library_id = sub.library_id;
