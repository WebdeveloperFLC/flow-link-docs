-- Repair Canada Student Visa guide ↔ service_library linkage (no schema change).
-- Ensures published canada-student-visa-outside-canada resolves on Knowledge Guide tab.

DO $$
DECLARE
  v_article_id uuid;
  v_canonical uuid := 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid;
  v_version_id uuid;
BEGIN
  SELECT id INTO v_article_id
  FROM public.kc_articles
  WHERE slug = 'canada-student-visa-outside-canada';

  IF v_article_id IS NULL THEN
    RAISE NOTICE 'kc_canada_guide_service_linkage: no article canada-student-visa-outside-canada — import required';
    RETURN;
  END IF;

  -- Canonical + any active Canada student visa catalogue rows counselors may select
  INSERT INTO public.kc_article_services (article_id, service_library_id)
  SELECT v_article_id, sl.id
  FROM public.service_library sl
  WHERE sl.id = v_canonical
     OR (
       sl.service_category = 'visa_immigration'
       AND sl.service = 'Canada'
       AND sl.is_active = true
       AND (
         COALESCE(sl.academy_metadata->>'displayName', '') ILIKE '%Student Visa%Outside Canada%'
         OR sl.sub_service ILIKE '%Student Visa%Outside%'
         OR sl.sub_service ILIKE '%Study Permit%Undergraduate%'
       )
     )
  ON CONFLICT DO NOTHING;

  -- Align article pointer with latest published version when missing
  SELECT id INTO v_version_id
  FROM public.kc_article_versions
  WHERE article_id = v_article_id AND status = 'published'
  ORDER BY version_number DESC
  LIMIT 1;

  IF v_version_id IS NOT NULL THEN
    UPDATE public.kc_articles
    SET
      current_version_id = COALESCE(current_version_id, v_version_id),
      status = CASE WHEN status = 'draft' THEN 'published' ELSE status END,
      updated_at = now()
    WHERE id = v_article_id
      AND (current_version_id IS NULL OR status = 'draft');
  END IF;
END;
$$;
