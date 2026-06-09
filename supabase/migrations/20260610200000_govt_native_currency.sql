-- Native government fee currency on lead-form picker variants.

ALTER TABLE public.service_library_picker_variants
  ADD COLUMN IF NOT EXISTS govt_amount numeric,
  ADD COLUMN IF NOT EXISTS govt_currency text;

COMMENT ON COLUMN public.service_library_picker_variants.govt_amount IS
  'Official government fee in native currency (e.g. 558 GBP, 100 CAD).';
COMMENT ON COLUMN public.service_library_picker_variants.govt_currency IS
  'Native currency code: GBP, EUR, CAD, AUD, USD, NZD, INR.';
