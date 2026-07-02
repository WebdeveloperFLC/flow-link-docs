-- Knowledge Centre Phase 1 foundation. Bucket INSERT stripped (D21: bucket pre-exists).

CREATE OR REPLACE FUNCTION public.can_view_knowledge_centre(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_uid, 'admin'::public.app_role)
    OR public.has_role(_uid, 'administrator'::public.app_role)
    OR public.user_has_module(_uid, 'knowledge_centre', 'view')
    OR public.user_has_module(_uid, 'knowledge_centre', 'edit')
    OR public.can_view_service_library(_uid);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_knowledge_centre(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_uid, 'admin'::public.app_role)
    OR public.has_role(_uid, 'administrator'::public.app_role)
    OR public.has_role(_uid, 'documentation'::public.app_role)
    OR public.user_has_module(_uid, 'knowledge_centre', 'edit');
$$;

COMMENT ON FUNCTION public.can_view_knowledge_centre(uuid) IS 'Staff read access for Knowledge Centre (module perm or legacy service-library staff).';
COMMENT ON FUNCTION public.can_manage_knowledge_centre(uuid) IS 'KC authoring, publish, official sources edit.';
GRANT EXECUTE ON FUNCTION public.can_view_knowledge_centre(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_knowledge_centre(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.kc_official_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NULL REFERENCES public.countries(code) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general',
  authority text NOT NULL DEFAULT '',
  title text NOT NULL,
  official_url text NOT NULL,
  last_verified_at date NULL,
  review_frequency_days int NOT NULL DEFAULT 90,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_review', 'archived')),
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (official_url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_official_sources TO authenticated;
GRANT ALL ON public.kc_official_sources TO service_role;
CREATE INDEX IF NOT EXISTS idx_kc_official_sources_review ON public.kc_official_sources (status, last_verified_at);
CREATE INDEX IF NOT EXISTS idx_kc_official_sources_country ON public.kc_official_sources (country_code);

CREATE TABLE IF NOT EXISTS public.kc_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  article_kind text NOT NULL DEFAULT 'shared'
    CHECK (article_kind IN ('shared', 'country', 'service', 'faq', 'quiz', 'download')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
  current_version_id uuid NULL,
  sort_order int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_articles TO authenticated;
GRANT ALL ON public.kc_articles TO service_role;
CREATE INDEX IF NOT EXISTS idx_kc_articles_kind_status ON public.kc_articles (article_kind, status);
CREATE INDEX IF NOT EXISTS idx_kc_articles_slug ON public.kc_articles (slug);

CREATE TABLE IF NOT EXISTS public.kc_article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.kc_articles(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  version_label text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'superseded')),
  content_format text NOT NULL DEFAULT 'markdown'
    CHECK (content_format IN ('markdown', 'structured')),
  content_body text NOT NULL DEFAULT '',
  change_summary text NULL,
  published_at timestamptz NULL,
  published_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_article_versions TO authenticated;
GRANT ALL ON public.kc_article_versions TO service_role;
CREATE INDEX IF NOT EXISTS idx_kc_versions_article ON public.kc_article_versions (article_id, version_number DESC);

ALTER TABLE public.kc_articles DROP CONSTRAINT IF EXISTS kc_articles_current_version_fkey;
ALTER TABLE public.kc_articles ADD CONSTRAINT kc_articles_current_version_fkey
  FOREIGN KEY (current_version_id) REFERENCES public.kc_article_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.kc_article_countries (
  article_id uuid NOT NULL REFERENCES public.kc_articles(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES public.countries(code) ON DELETE RESTRICT,
  PRIMARY KEY (article_id, country_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_article_countries TO authenticated;
GRANT ALL ON public.kc_article_countries TO service_role;
CREATE INDEX IF NOT EXISTS idx_kc_article_countries_code ON public.kc_article_countries (country_code);

CREATE TABLE IF NOT EXISTS public.kc_article_services (
  article_id uuid NOT NULL REFERENCES public.kc_articles(id) ON DELETE CASCADE,
  service_library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, service_library_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_article_services TO authenticated;
GRANT ALL ON public.kc_article_services TO service_role;
CREATE INDEX IF NOT EXISTS idx_kc_article_services_lib ON public.kc_article_services (service_library_id);

CREATE TABLE IF NOT EXISTS public.kc_faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.kc_articles(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.kc_article_versions(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (version_id, sort_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_faq_items TO authenticated;
GRANT ALL ON public.kc_faq_items TO service_role;

CREATE TABLE IF NOT EXISTS public.kc_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.kc_articles(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.kc_article_versions(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index int NOT NULL DEFAULT 0,
  explanation text NULL,
  level int NULL CHECK (level IS NULL OR level BETWEEN 1 AND 3),
  UNIQUE (version_id, sort_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_quiz_questions TO authenticated;
GRANT ALL ON public.kc_quiz_questions TO service_role;

CREATE TABLE IF NOT EXISTS public.kc_download_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.kc_articles(id) ON DELETE CASCADE,
  version_id uuid NULL REFERENCES public.kc_article_versions(id) ON DELETE CASCADE,
  download_type text NOT NULL DEFAULT 'other'
    CHECK (download_type IN ('counsellor_guide', 'meeting_checklist', 'budget_planner', 'arrival_checklist', 'settlement_checklist', 'other')),
  title text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NULL,
  file_size_bytes bigint NULL,
  sort_order int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_download_assets TO authenticated;
GRANT ALL ON public.kc_download_assets TO service_role;

CREATE TABLE IF NOT EXISTS public.kc_article_source_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.kc_article_versions(id) ON DELETE CASCADE,
  official_source_id uuid NOT NULL REFERENCES public.kc_official_sources(id) ON DELETE RESTRICT,
  anchor_label text NULL,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (version_id, official_source_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_article_source_refs TO authenticated;
GRANT ALL ON public.kc_article_source_refs TO service_role;

CREATE TABLE IF NOT EXISTS public.kc_internal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_version_id uuid NOT NULL REFERENCES public.kc_article_versions(id) ON DELETE CASCADE,
  to_article_id uuid NOT NULL REFERENCES public.kc_articles(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'related'
    CHECK (link_type IN ('reference', 'prerequisite', 'related', 'see_also')),
  anchor_text text NULL,
  UNIQUE (from_version_id, to_article_id, link_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kc_internal_links TO authenticated;
GRANT ALL ON public.kc_internal_links TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['kc_official_sources', 'kc_articles', 'kc_article_versions'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t, t);
  END LOOP;
END $$;

ALTER TABLE public.kc_official_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_article_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_article_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_download_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_article_source_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kc_internal_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kc_sources_select ON public.kc_official_sources;
CREATE POLICY kc_sources_select ON public.kc_official_sources FOR SELECT TO authenticated
  USING (public.can_view_knowledge_centre(auth.uid()));
DROP POLICY IF EXISTS kc_sources_manage ON public.kc_official_sources;
CREATE POLICY kc_sources_manage ON public.kc_official_sources FOR ALL TO authenticated
  USING (public.can_manage_knowledge_centre(auth.uid()))
  WITH CHECK (public.can_manage_knowledge_centre(auth.uid()));

DROP POLICY IF EXISTS kc_articles_select ON public.kc_articles;
CREATE POLICY kc_articles_select ON public.kc_articles FOR SELECT TO authenticated
  USING (public.can_manage_knowledge_centre(auth.uid())
         OR (public.can_view_knowledge_centre(auth.uid()) AND status IN ('published', 'archived')));
DROP POLICY IF EXISTS kc_articles_manage ON public.kc_articles;
CREATE POLICY kc_articles_manage ON public.kc_articles FOR ALL TO authenticated
  USING (public.can_manage_knowledge_centre(auth.uid()))
  WITH CHECK (public.can_manage_knowledge_centre(auth.uid()));

DROP POLICY IF EXISTS kc_versions_select ON public.kc_article_versions;
CREATE POLICY kc_versions_select ON public.kc_article_versions FOR SELECT TO authenticated
  USING (public.can_manage_knowledge_centre(auth.uid())
         OR (public.can_view_knowledge_centre(auth.uid()) AND status IN ('published', 'superseded')));
DROP POLICY IF EXISTS kc_versions_manage ON public.kc_article_versions;
CREATE POLICY kc_versions_manage ON public.kc_article_versions FOR ALL TO authenticated
  USING (public.can_manage_knowledge_centre(auth.uid()))
  WITH CHECK (public.can_manage_knowledge_centre(auth.uid()));

DO $$
DECLARE tbl text; short text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['kc_article_countries', 'kc_article_services', 'kc_faq_items',
    'kc_quiz_questions', 'kc_download_assets', 'kc_article_source_refs', 'kc_internal_links'])
  LOOP
    short := replace(tbl, 'kc_', '');
    EXECUTE format('DROP POLICY IF EXISTS kc_%s_select ON public.%I', short, tbl);
    EXECUTE format('CREATE POLICY kc_%s_select ON public.%I FOR SELECT TO authenticated USING (public.can_view_knowledge_centre(auth.uid()) OR public.can_manage_knowledge_centre(auth.uid()))', short, tbl);
    EXECUTE format('DROP POLICY IF EXISTS kc_%s_manage ON public.%I', short, tbl);
    EXECUTE format('CREATE POLICY kc_%s_manage ON public.%I FOR ALL TO authenticated USING (public.can_manage_knowledge_centre(auth.uid())) WITH CHECK (public.can_manage_knowledge_centre(auth.uid()))', short, tbl);
  END LOOP;
END $$;

-- Storage policies (bucket INSERT stripped — D21)
DROP POLICY IF EXISTS kc_downloads_read ON storage.objects;
CREATE POLICY kc_downloads_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kc-downloads' AND public.can_view_knowledge_centre(auth.uid()));
DROP POLICY IF EXISTS kc_downloads_insert ON storage.objects;
CREATE POLICY kc_downloads_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kc-downloads' AND public.can_manage_knowledge_centre(auth.uid()));
DROP POLICY IF EXISTS kc_downloads_update ON storage.objects;
CREATE POLICY kc_downloads_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kc-downloads' AND public.can_manage_knowledge_centre(auth.uid()));
DROP POLICY IF EXISTS kc_downloads_delete ON storage.objects;
CREATE POLICY kc_downloads_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kc-downloads' AND public.can_manage_knowledge_centre(auth.uid()));

CREATE OR REPLACE FUNCTION public.kc_publish_version(p_version_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_article_id uuid;
  v_row public.kc_article_versions%ROWTYPE;
BEGIN
  IF NOT public.can_manage_knowledge_centre(v_uid) THEN
    RAISE EXCEPTION 'Not authorized to publish Knowledge Centre content';
  END IF;
  SELECT * INTO v_row FROM public.kc_article_versions WHERE id = p_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Version not found'; END IF;
  IF v_row.status NOT IN ('draft', 'in_review') THEN
    RAISE EXCEPTION 'Only draft or in_review versions can be published';
  END IF;
  v_article_id := v_row.article_id;
  UPDATE public.kc_article_versions SET status = 'superseded', updated_at = now()
    WHERE article_id = v_article_id AND status = 'published';
  UPDATE public.kc_article_versions SET status = 'published', published_at = now(),
    published_by = v_uid, updated_at = now() WHERE id = p_version_id;
  UPDATE public.kc_articles SET current_version_id = p_version_id, status = 'published',
    updated_at = now() WHERE id = v_article_id;
  RETURN jsonb_build_object('article_id', v_article_id, 'version_id', p_version_id, 'version_label', v_row.version_label);
END;
$$;
GRANT EXECUTE ON FUNCTION public.kc_publish_version(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.kc_resolve_live_article(p_slug text DEFAULT NULL, p_article_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_article public.kc_articles%ROWTYPE;
  v_version public.kc_article_versions%ROWTYPE;
BEGIN
  IF NOT public.can_view_knowledge_centre(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_article_id IS NOT NULL THEN
    SELECT * INTO v_article FROM public.kc_articles WHERE id = p_article_id;
  ELSIF p_slug IS NOT NULL AND p_slug <> '' THEN
    SELECT * INTO v_article FROM public.kc_articles WHERE slug = p_slug;
  ELSE
    RAISE EXCEPTION 'slug or article_id required';
  END IF;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_article.current_version_id IS NULL THEN
    RETURN jsonb_build_object('article', to_jsonb(v_article), 'version', NULL);
  END IF;
  SELECT * INTO v_version FROM public.kc_article_versions WHERE id = v_article.current_version_id;
  RETURN jsonb_build_object('article', to_jsonb(v_article), 'version', to_jsonb(v_version));
END;
$$;
GRANT EXECUTE ON FUNCTION public.kc_resolve_live_article(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.kc_search_articles(
  p_query text DEFAULT NULL, p_country_code text DEFAULT NULL,
  p_service_library_id uuid DEFAULT NULL, p_article_kind text DEFAULT NULL,
  p_status text DEFAULT NULL, p_tags jsonb DEFAULT NULL, p_limit int DEFAULT 50
)
RETURNS TABLE (article_id uuid, slug text, title text, article_kind text, status text,
  version_label text, snippet text, tags jsonb, categories jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_view_knowledge_centre(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT a.id, a.slug, a.title, a.article_kind, a.status, v.version_label,
    LEFT(COALESCE(v.content_body, ''), 200), COALESCE(a.metadata->'tags', '[]'::jsonb),
    COALESCE(a.metadata->'categories', '[]'::jsonb)
  FROM public.kc_articles a
  LEFT JOIN public.kc_article_versions v ON v.id = a.current_version_id
  WHERE (public.can_manage_knowledge_centre(auth.uid()) OR a.status = 'published')
    AND (p_status IS NULL OR a.status = p_status)
    AND (p_article_kind IS NULL OR a.article_kind = p_article_kind)
    AND (p_query IS NULL OR p_query = ''
         OR a.title ILIKE '%' || p_query || '%'
         OR a.slug ILIKE '%' || p_query || '%'
         OR v.content_body ILIKE '%' || p_query || '%')
    AND (p_country_code IS NULL OR EXISTS (
      SELECT 1 FROM public.kc_article_countries ac
      WHERE ac.article_id = a.id AND ac.country_code = p_country_code))
    AND (p_service_library_id IS NULL OR EXISTS (
      SELECT 1 FROM public.kc_article_services asv
      WHERE asv.article_id = a.id AND asv.service_library_id = p_service_library_id))
    AND (p_tags IS NULL OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(a.metadata->'tags', '[]'::jsonb)) tag
      WHERE tag IN (SELECT jsonb_array_elements_text(p_tags))))
  ORDER BY a.title
  LIMIT GREATEST(1, LEAST(p_limit, 200));
END;
$$;
GRANT EXECUTE ON FUNCTION public.kc_search_articles(text, text, uuid, text, text, jsonb, int) TO authenticated;