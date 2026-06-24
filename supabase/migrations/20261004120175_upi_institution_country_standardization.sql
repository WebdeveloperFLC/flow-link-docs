-- M3.1 — Institution country standardization
-- Backfill country_id + canonical country_name from cf_countries / CRM master_items.
-- No new columns; aligns with Contacts M2.1 pattern. Mark Final unchanged.

-- ---------------------------------------------------------------------------
-- Resolve free-text country label → ISO alpha-2 (cf_countries.code)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_resolve_institution_country_iso(_country_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_iso text;
  v_norm text;
BEGIN
  IF _country_name IS NULL OR trim(_country_name) = '' THEN
    RETURN NULL;
  END IF;

  SELECT cc.code INTO v_iso
  FROM public.cf_countries cc
  WHERE lower(trim(cc.name)) = lower(trim(_country_name))
  LIMIT 1;
  IF v_iso IS NOT NULL THEN
    RETURN v_iso;
  END IF;

  SELECT mi.code INTO v_iso
  FROM public.master_items mi
  WHERE mi.list_key = 'countries'
    AND mi.is_active = true
    AND lower(trim(mi.label)) = lower(trim(_country_name))
    AND EXISTS (SELECT 1 FROM public.cf_countries cc WHERE cc.code = mi.code)
  LIMIT 1;
  IF v_iso IS NOT NULL THEN
    RETURN v_iso;
  END IF;

  v_norm := lower(trim(_country_name));

  SELECT mapped.iso_code INTO v_iso
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
      ('england', 'GB'),
      ('australia', 'AU'),
      ('au', 'AU'),
      ('germany', 'DE'),
      ('de', 'DE'),
      ('united arab emirates', 'AE'),
      ('uae', 'AE'),
      ('ae', 'AE'),
      ('new zealand', 'NZ'),
      ('nz', 'NZ'),
      ('ireland', 'IE'),
      ('ie', 'IE'),
      ('france', 'FR'),
      ('fr', 'FR'),
      ('netherlands', 'NL'),
      ('nl', 'NL'),
      ('singapore', 'SG'),
      ('sg', 'SG'),
      ('china', 'CN'),
      ('cn', 'CN')
  ) AS mapped(label, iso_code)
  WHERE v_norm = mapped.label
    AND EXISTS (SELECT 1 FROM public.cf_countries cc WHERE cc.code = mapped.iso_code)
  LIMIT 1;

  RETURN v_iso;
END;
$$;

COMMENT ON FUNCTION public.fn_resolve_institution_country_iso(text) IS
  'Map institution country_name text to ISO-2 via cf_countries, master_items, or alias table (M3.1).';

-- ---------------------------------------------------------------------------
-- Backfill country_id + canonical country_name
-- ---------------------------------------------------------------------------

UPDATE public.upi_institutions i
SET
  country_id = uc.id,
  country_name = cc.name,
  updated_at = now()
FROM (
  SELECT
    inst.id AS institution_id,
    public.fn_resolve_institution_country_iso(inst.country_name) AS iso_code
  FROM public.upi_institutions inst
  WHERE inst.country_name IS NOT NULL
    AND trim(inst.country_name) <> ''
) resolved
JOIN public.cf_countries cc ON cc.code = resolved.iso_code
JOIN public.upi_countries uc ON uc.iso_alpha2 = cc.code
WHERE i.id = resolved.institution_id
  AND resolved.iso_code IS NOT NULL;

-- Rows with country_id but mismatched name — align name to cf_countries
UPDATE public.upi_institutions i
SET
  country_name = cc.name,
  updated_at = now()
FROM public.upi_countries uc
JOIN public.cf_countries cc ON cc.code = uc.iso_alpha2
WHERE i.country_id = uc.id
  AND (i.country_name IS NULL OR lower(trim(i.country_name)) <> lower(trim(cc.name)));

-- ---------------------------------------------------------------------------
-- Unmapped remediation view
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_upi_institution_country_unmapped AS
SELECT
  i.id,
  i.name,
  i.country_name,
  i.country_id,
  public.fn_resolve_institution_country_iso(i.country_name) AS resolved_iso
FROM public.upi_institutions i
WHERE i.country_name IS NOT NULL
  AND trim(i.country_name) <> ''
  AND i.country_id IS NULL;

COMMENT ON VIEW public.v_upi_institution_country_unmapped IS
  'Institutions whose country_name could not be mapped to country_id (M3.1 remediation).';

GRANT SELECT ON public.v_upi_institution_country_unmapped TO authenticated;

DO $$
DECLARE
  v_unmapped integer;
BEGIN
  SELECT count(*)::integer INTO v_unmapped FROM public.v_upi_institution_country_unmapped;
  IF v_unmapped > 0 THEN
    RAISE NOTICE 'INSTITUTION_COUNTRY_MAP: % institutions with unmapped country_name (see v_upi_institution_country_unmapped)', v_unmapped;
  END IF;
END $$;
