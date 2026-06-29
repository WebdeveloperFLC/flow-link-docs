-- Ensure kc_import_guide writes narrative_sections into content_body.sections (reader contract).

CREATE OR REPLACE FUNCTION public.kc_import_guide(
  p_payload jsonb,
  p_replace boolean DEFAULT false,
  p_publish boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_slug text;
  v_article_id uuid;
  v_version_id uuid;
  v_shared jsonb;
  v_shared_slug text;
  v_shared_id uuid;
  v_faq jsonb;
  v_quiz jsonb;
  v_dl jsonb;
  v_src jsonb;
  v_rel_slug text;
  v_rel_id uuid;
  v_source_id uuid;
  v_sort int;
  v_related_count int := 0;
  v_body text;
  v_narrative_len int;
  v_body_section_count int;
  v_body_with_md int;
BEGIN
  IF v_uid IS NOT NULL AND NOT public.can_manage_knowledge_centre(v_uid) THEN
    RAISE EXCEPTION 'Not authorized to import Knowledge Centre guides';
  END IF;

  v_slug := trim(p_payload->>'slug');
  IF v_slug IS NULL OR v_slug = '' OR trim(p_payload->>'title') IS NULL OR trim(p_payload->>'title') = '' THEN
    RAISE EXCEPTION 'Import payload requires slug and title';
  END IF;

  v_narrative_len := jsonb_array_length(COALESCE(p_payload->'narrative_sections', '[]'::jsonb));

  IF p_replace THEN
    DELETE FROM public.kc_articles WHERE slug = v_slug;
  END IF;

  IF EXISTS (SELECT 1 FROM public.kc_articles WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Article already exists: %. Use replace.', v_slug;
  END IF;

  FOR v_shared IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'shared_articles', '[]'::jsonb))
  LOOP
    v_shared_slug := trim(v_shared->>'slug');
    IF v_shared_slug IS NULL OR v_shared_slug = '' THEN
      CONTINUE;
    END IF;
    SELECT id INTO v_shared_id FROM public.kc_articles WHERE slug = v_shared_slug;
    IF v_shared_id IS NULL THEN
      INSERT INTO public.kc_articles (slug, title, article_kind, status, metadata, created_by)
      VALUES (
        v_shared_slug,
        COALESCE(v_shared->>'title', v_shared_slug),
        COALESCE(v_shared->>'article_kind', 'shared'),
        'draft',
        jsonb_build_object(
          'tags', jsonb_build_array('shared', 'related-knowledge'),
          'categories', jsonb_build_array('counselling')
        ),
        v_uid
      )
      RETURNING id INTO v_shared_id;

      v_body := jsonb_build_object(
        'sections', COALESCE(v_shared->'narrative_sections', '[]'::jsonb)
      )::text;

      INSERT INTO public.kc_article_versions (
        article_id, version_number, version_label, status, content_format, content_body, created_by
      )
      VALUES (
        v_shared_id, 1, '1.0.0', 'draft', 'structured', v_body, v_uid
      );

      UPDATE public.kc_articles SET current_version_id = (
        SELECT id FROM public.kc_article_versions WHERE article_id = v_shared_id ORDER BY version_number DESC LIMIT 1
      ) WHERE id = v_shared_id;

      IF jsonb_array_length(COALESCE(v_shared->'country_codes', '[]'::jsonb)) > 0 THEN
        INSERT INTO public.kc_article_countries (article_id, country_code)
        SELECT v_shared_id, trim(code)
        FROM jsonb_array_elements_text(v_shared->'country_codes') AS code
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.kc_articles (slug, title, article_kind, status, metadata, created_by)
  VALUES (
    v_slug,
    trim(p_payload->>'title'),
    COALESCE(p_payload->>'article_kind', 'service'),
    'draft',
    jsonb_build_object(
      'tags', COALESCE(p_payload->'tags', '[]'::jsonb),
      'categories', COALESCE(p_payload->'categories', '[]'::jsonb),
      'guide_sections', COALESCE(p_payload->'guide_sections', '[]'::jsonb),
      'external_module_refs', COALESCE(p_payload->'external_module_refs', '[]'::jsonb),
      'estimated_reading_minutes', (p_payload->>'estimated_reading_minutes')::int
    ),
    v_uid
  )
  RETURNING id INTO v_article_id;

  -- Reader contract: content_body JSON string with key "sections" (not narrative_sections).
  v_body := jsonb_build_object(
    'sections', COALESCE(p_payload->'narrative_sections', '[]'::jsonb)
  )::text;

  INSERT INTO public.kc_article_versions (
    article_id, version_number, version_label, status, content_format, content_body, created_by
  )
  VALUES (
    v_article_id,
    1,
    COALESCE(p_payload->>'version_label', '1.0.0'),
    'draft',
    'structured',
    v_body,
    v_uid
  )
  RETURNING id INTO v_version_id;

  UPDATE public.kc_articles SET current_version_id = v_version_id WHERE id = v_article_id;

  IF v_narrative_len > 0 THEN
    SELECT
      jsonb_array_length(COALESCE((v_body::jsonb)->'sections', '[]'::jsonb)),
      (
        SELECT COUNT(*)
        FROM jsonb_array_elements(COALESCE((v_body::jsonb)->'sections', '[]'::jsonb)) AS elem
        WHERE COALESCE(trim(elem->>'body_md'), '') <> ''
      )
    INTO v_body_section_count, v_body_with_md;

    IF v_body_section_count < v_narrative_len OR v_body_with_md = 0 THEN
      RAISE EXCEPTION 'kc_import_guide: narrative_sections not stored in content_body (sections=% with_md=% expected=%)',
        v_body_section_count, v_body_with_md, v_narrative_len;
    END IF;
  END IF;

  IF jsonb_array_length(COALESCE(p_payload->'country_codes', '[]'::jsonb)) > 0 THEN
    INSERT INTO public.kc_article_countries (article_id, country_code)
    SELECT v_article_id, trim(code)
    FROM jsonb_array_elements_text(p_payload->'country_codes') AS code
    ON CONFLICT DO NOTHING;
  END IF;

  IF jsonb_array_length(COALESCE(p_payload->'service_library_ids', '[]'::jsonb)) > 0 THEN
    INSERT INTO public.kc_article_services (article_id, service_library_id)
    SELECT v_article_id, trim(code)::uuid
    FROM jsonb_array_elements_text(p_payload->'service_library_ids') AS code
    ON CONFLICT DO NOTHING;
  END IF;

  FOR v_faq IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'faqs', '[]'::jsonb))
  LOOP
    INSERT INTO public.kc_faq_items (article_id, version_id, sort_order, question, answer)
    VALUES (
      v_article_id,
      v_version_id,
      COALESCE((v_faq->>'sort_order')::int, 0),
      COALESCE(v_faq->>'question', ''),
      COALESCE(v_faq->>'answer', '')
    );
  END LOOP;

  FOR v_quiz IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'quiz', '[]'::jsonb))
  LOOP
    INSERT INTO public.kc_quiz_questions (
      article_id, version_id, sort_order, question, options, correct_index, explanation, level
    )
    VALUES (
      v_article_id,
      v_version_id,
      COALESCE((v_quiz->>'sort_order')::int, 0),
      COALESCE(v_quiz->>'question', ''),
      COALESCE(v_quiz->'options', '[]'::jsonb),
      COALESCE((v_quiz->>'correct_index')::int, 0),
      v_quiz->>'explanation',
      (v_quiz->>'level')::int
    );
  END LOOP;

  v_sort := 0;
  FOR v_src IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'official_sources', '[]'::jsonb))
  LOOP
    INSERT INTO public.kc_official_sources (
      title, official_url, authority, category, country_code, metadata
    )
    VALUES (
      COALESCE(v_src->>'title', ''),
      COALESCE(v_src->>'official_url', ''),
      COALESCE(v_src->>'authority', ''),
      COALESCE(v_src->>'category', 'general'),
      NULLIF(v_src->>'country_code', ''),
      CASE WHEN v_src->>'reason' IS NOT NULL THEN jsonb_build_object('reason', v_src->>'reason') ELSE '{}'::jsonb END
    )
    ON CONFLICT (official_url) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_source_id;

    v_sort := v_sort + 1;
    INSERT INTO public.kc_article_source_refs (version_id, official_source_id, anchor_label, sort_order)
    VALUES (v_version_id, v_source_id, COALESCE(v_src->>'title', ''), v_sort);
  END LOOP;

  FOR v_dl IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'downloads', '[]'::jsonb))
  LOOP
    INSERT INTO public.kc_download_assets (
      article_id, version_id, title, storage_path, download_type, sort_order, metadata
    )
    VALUES (
      v_article_id,
      v_version_id,
      COALESCE(v_dl->>'title', 'Download'),
      COALESCE(v_dl->>'storage_path', v_slug || '/templates/' || COALESCE(v_dl->>'sort_order', '1') || '.pdf'),
      COALESCE(v_dl->>'download_type', 'other'),
      COALESCE((v_dl->>'sort_order')::int, 0),
      jsonb_strip_nulls(jsonb_build_object(
        'journey_stage', v_dl->>'journey_stage',
        'subtype', v_dl->>'subtype'
      ))
    );
  END LOOP;

  FOR v_rel_slug IN SELECT trim(jsonb_array_elements_text(COALESCE(p_payload->'related_article_slugs', '[]'::jsonb)))
  LOOP
    IF v_rel_slug IS NULL OR v_rel_slug = '' THEN
      CONTINUE;
    END IF;
    SELECT id INTO v_rel_id FROM public.kc_articles WHERE slug = v_rel_slug;
    IF v_rel_id IS NOT NULL THEN
      INSERT INTO public.kc_internal_links (from_version_id, to_article_id, link_type, anchor_text)
      VALUES (
        v_version_id,
        v_rel_id,
        'related',
        (SELECT title FROM public.kc_articles WHERE id = v_rel_id)
      )
      ON CONFLICT (from_version_id, to_article_id, link_type) DO NOTHING;
      v_related_count := v_related_count + 1;
    END IF;
  END LOOP;

  IF p_publish THEN
    UPDATE public.kc_article_versions
    SET status = 'superseded', updated_at = now()
    WHERE article_id = v_article_id AND status = 'published';

    UPDATE public.kc_article_versions
    SET
      status = 'published',
      published_at = now(),
      published_by = v_uid,
      updated_at = now()
    WHERE id = v_version_id;

    UPDATE public.kc_articles
    SET
      current_version_id = v_version_id,
      status = 'published',
      updated_at = now()
    WHERE id = v_article_id;
  END IF;

  RETURN jsonb_build_object(
    'article_id', v_article_id,
    'version_id', v_version_id,
    'slug', v_slug,
    'counts', jsonb_build_object(
      'narrative_sections', v_narrative_len,
      'faqs', jsonb_array_length(COALESCE(p_payload->'faqs', '[]'::jsonb)),
      'quiz', jsonb_array_length(COALESCE(p_payload->'quiz', '[]'::jsonb)),
      'downloads', jsonb_array_length(COALESCE(p_payload->'downloads', '[]'::jsonb)),
      'official_sources', jsonb_array_length(COALESCE(p_payload->'official_sources', '[]'::jsonb)),
      'related_links', v_related_count,
      'content_sections_written', v_body_section_count,
      'content_sections_with_body_md', v_body_with_md
    )
  );
END;
$$;
