-- M2.1 — Standardize institution contact country + optional timezone / comm preference
-- Replaces free-text country with CRM master / ISO (cf_countries.code).
-- No Mark Final, fee schedule, or governance changes.

ALTER TABLE public.upi_institution_contacts
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS preferred_communication_method text;

ALTER TABLE public.upi_institution_contacts
  DROP CONSTRAINT IF EXISTS upi_institution_contacts_preferred_communication_method_chk;

ALTER TABLE public.upi_institution_contacts
  ADD CONSTRAINT upi_institution_contacts_preferred_communication_method_chk CHECK (
    preferred_communication_method IS NULL OR preferred_communication_method IN (
      'Email', 'Phone', 'WhatsApp', 'Teams', 'Zoom', 'Portal'
    )
  );

-- ---------------------------------------------------------------------------
-- Map legacy free-text country → ISO code (cf_countries / CRM master_items)
-- ---------------------------------------------------------------------------

ALTER TABLE public.upi_institution_contacts
  ADD COLUMN IF NOT EXISTS country text;

UPDATE public.upi_institution_contacts c
SET country_code = cc.code
FROM public.cf_countries cc
WHERE c.country IS NOT NULL
  AND trim(c.country) <> ''
  AND c.country_code IS NULL
  AND lower(trim(c.country)) = lower(trim(cc.name));

UPDATE public.upi_institution_contacts c
SET country_code = mi.code
FROM public.master_items mi
WHERE c.country IS NOT NULL
  AND trim(c.country) <> ''
  AND c.country_code IS NULL
  AND mi.list_key = 'countries'
  AND mi.is_active = true
  AND lower(trim(c.country)) = lower(trim(mi.label))
  AND EXISTS (
    SELECT 1 FROM public.cf_countries cc WHERE cc.code = mi.code
  );

UPDATE public.upi_institution_contacts c
SET country_code = mapped.iso_code
FROM (
  VALUES
    ('canada', 'CA'),
    ('ca', 'CA'),
    ('can', 'CA'),
    ('india', 'IN'),
    ('in', 'IN'),
    ('united states', 'US'),
    ('united states of america', 'US'),
    ('usa', 'US'),
    ('us', 'US'),
    ('united kingdom', 'GB'),
    ('uk', 'GB'),
    ('great britain', 'GB'),
    ('australia', 'AU'),
    ('au', 'AU'),
    ('germany', 'DE'),
    ('de', 'DE'),
    ('united arab emirates', 'AE'),
    ('uae', 'AE'),
    ('ae', 'AE')
) AS mapped(label, iso_code)
WHERE c.country_code IS NULL
  AND c.country IS NOT NULL
  AND trim(c.country) <> ''
  AND lower(trim(c.country)) = mapped.label
  AND EXISTS (
    SELECT 1 FROM public.cf_countries cc WHERE cc.code = mapped.iso_code
  );

DO $$
DECLARE
  v_unmapped integer;
BEGIN
  SELECT count(*)::integer INTO v_unmapped
  FROM public.upi_institution_contacts
  WHERE country IS NOT NULL
    AND trim(country) <> ''
    AND country_code IS NULL;

  IF v_unmapped > 0 THEN
    RAISE NOTICE 'CONTACT_COUNTRY_MAP: % rows with unmapped legacy country text (country_code set NULL)', v_unmapped;
  END IF;
END $$;

-- Enforce ISO country FK after backfill
ALTER TABLE public.upi_institution_contacts
  DROP CONSTRAINT IF EXISTS upi_institution_contacts_country_code_fkey;

ALTER TABLE public.upi_institution_contacts
  ADD CONSTRAINT upi_institution_contacts_country_code_fkey
  FOREIGN KEY (country_code) REFERENCES public.cf_countries(code)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_upi_institution_contacts_country_code
  ON public.upi_institution_contacts (country_code)
  WHERE country_code IS NOT NULL;

ALTER TABLE public.upi_institution_contacts
  DROP COLUMN IF EXISTS country;

COMMENT ON COLUMN public.upi_institution_contacts.country_code IS
  'ISO alpha-2 from cf_countries / CRM countries master — no free-text country.';
COMMENT ON COLUMN public.upi_institution_contacts.timezone IS
  'Optional IANA timezone e.g. America/Toronto.';
COMMENT ON COLUMN public.upi_institution_contacts.preferred_communication_method IS
  'Optional: Email, Phone, WhatsApp, Teams, Zoom, Portal.';
