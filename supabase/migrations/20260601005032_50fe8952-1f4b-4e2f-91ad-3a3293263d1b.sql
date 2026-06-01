
-- ============================================================
-- 1. Extend service_library with new text sections
-- ============================================================
ALTER TABLE public.service_library
  ADD COLUMN IF NOT EXISTS quick_guide_what_to_do text,
  ADD COLUMN IF NOT EXISTS quick_guide_common_mistakes text,
  ADD COLUMN IF NOT EXISTS quick_guide_escalation_rules text,
  ADD COLUMN IF NOT EXISTS quick_guide_important_reminders text,
  ADD COLUMN IF NOT EXISTS cost_summary_html text,
  ADD COLUMN IF NOT EXISTS internal_sop_html text;

-- Country scope on existing child tables (NULL = applies to all assigned countries)
ALTER TABLE public.service_library_fee_items
  ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.service_library_attachments
  ADD COLUMN IF NOT EXISTS country text;

-- ============================================================
-- 2. New tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_library_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  country text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (library_id, country)
);
CREATE INDEX IF NOT EXISTS idx_sl_countries_country ON public.service_library_countries(country);
CREATE INDEX IF NOT EXISTS idx_sl_countries_library ON public.service_library_countries(library_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_countries TO authenticated;
GRANT ALL ON public.service_library_countries TO service_role;
ALTER TABLE public.service_library_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_countries view auth" ON public.service_library_countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_countries insert manage" ON public.service_library_countries FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_countries update manage" ON public.service_library_countries FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_countries delete manage" ON public.service_library_countries FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));

CREATE TABLE IF NOT EXISTS public.service_library_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  country text NOT NULL,
  quick_guide_what_to_do text,
  quick_guide_common_mistakes text,
  quick_guide_escalation_rules text,
  quick_guide_important_reminders text,
  checklist_text text,
  process_flow jsonb,
  cost_summary_html text,
  internal_sop_html text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (library_id, country)
);
CREATE INDEX IF NOT EXISTS idx_sl_overrides_library ON public.service_library_overrides(library_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_overrides TO authenticated;
GRANT ALL ON public.service_library_overrides TO service_role;
ALTER TABLE public.service_library_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_overrides view auth" ON public.service_library_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_overrides insert manage" ON public.service_library_overrides FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_overrides update manage" ON public.service_library_overrides FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_overrides delete manage" ON public.service_library_overrides FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE TRIGGER trg_sl_overrides_updated BEFORE UPDATE ON public.service_library_overrides FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.service_library_checklist_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  country text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sl_cfiles_library ON public.service_library_checklist_files(library_id);
CREATE INDEX IF NOT EXISTS idx_sl_cfiles_current ON public.service_library_checklist_files(library_id, is_current);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_checklist_files TO authenticated;
GRANT ALL ON public.service_library_checklist_files TO service_role;
ALTER TABLE public.service_library_checklist_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_cfiles view auth" ON public.service_library_checklist_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_cfiles insert manage" ON public.service_library_checklist_files FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_cfiles update manage" ON public.service_library_checklist_files FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_cfiles delete manage" ON public.service_library_checklist_files FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE TRIGGER trg_sl_cfiles_updated BEFORE UPDATE ON public.service_library_checklist_files FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.service_library_sop_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  country text,
  task_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sl_sop_tasks_library ON public.service_library_sop_tasks(library_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_sop_tasks TO authenticated;
GRANT ALL ON public.service_library_sop_tasks TO service_role;
ALTER TABLE public.service_library_sop_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_sop_tasks view auth" ON public.service_library_sop_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_sop_tasks insert manage" ON public.service_library_sop_tasks FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_sop_tasks update manage" ON public.service_library_sop_tasks FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_sop_tasks delete manage" ON public.service_library_sop_tasks FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE TRIGGER trg_sl_sop_tasks_updated BEFORE UPDATE ON public.service_library_sop_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.service_library_sop_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.service_library_sop_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid,
  client_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_sop_completions
  ON public.service_library_sop_completions(task_id, user_id, COALESCE(lead_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_sop_completions TO authenticated;
GRANT ALL ON public.service_library_sop_completions TO service_role;
ALTER TABLE public.service_library_sop_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_sop_comp view auth" ON public.service_library_sop_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_sop_comp insert self" ON public.service_library_sop_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sl_sop_comp update self" ON public.service_library_sop_completions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sl_sop_comp delete self" ON public.service_library_sop_completions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.service_library_submission_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  country text,
  item_key text NOT NULL,
  item_label text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sl_sub_checklist_library ON public.service_library_submission_checklist(library_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_submission_checklist TO authenticated;
GRANT ALL ON public.service_library_submission_checklist TO service_role;
ALTER TABLE public.service_library_submission_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_sub_chk view auth" ON public.service_library_submission_checklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_sub_chk insert manage" ON public.service_library_submission_checklist FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_sub_chk update manage" ON public.service_library_submission_checklist FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_sub_chk delete manage" ON public.service_library_submission_checklist FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE TRIGGER trg_sl_sub_chk_updated BEFORE UPDATE ON public.service_library_submission_checklist FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.service_library_submission_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.service_library_submission_checklist(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid,
  client_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_sub_completions
  ON public.service_library_submission_completions(item_id, user_id, COALESCE(lead_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_submission_completions TO authenticated;
GRANT ALL ON public.service_library_submission_completions TO service_role;
ALTER TABLE public.service_library_submission_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_sub_comp view auth" ON public.service_library_submission_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_sub_comp insert self" ON public.service_library_submission_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sl_sub_comp update self" ON public.service_library_submission_completions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sl_sub_comp delete self" ON public.service_library_submission_completions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.service_library_migration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duplicates_merged integer NOT NULL DEFAULT 0,
  masters_remaining integer NOT NULL DEFAULT 0,
  country_mappings_created integer NOT NULL DEFAULT 0,
  overrides_created integer NOT NULL DEFAULT 0,
  ran_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_migration_log TO authenticated;
GRANT ALL ON public.service_library_migration_log TO service_role;
ALTER TABLE public.service_library_migration_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_mig_log view auth" ON public.service_library_migration_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_mig_log manage" ON public.service_library_migration_log FOR ALL TO authenticated USING (public.can_manage_service_library(auth.uid())) WITH CHECK (public.can_manage_service_library(auth.uid()));

-- ============================================================
-- 3. Country allow-list trigger on service_library_countries
-- ============================================================
CREATE OR REPLACE FUNCTION public.service_library_country_allow_list_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed text[] := ARRAY[
    'United Kingdom','Germany','Ireland','France','Italy','Spain','Netherlands','Sweden',
    'Switzerland','Austria','Poland','Malta','Cyprus','Portugal','Finland','Denmark','Norway',
    'Hungary','Lithuania','Latvia','Estonia','Georgia','Russia','Romania','Serbia','Turkey',
    'Canada','United States','Australia','New Zealand','United Arab Emirates','Singapore',
    'Malaysia','Japan','South Korea','Uzbekistan','Kazakhstan','Kyrgyzstan','Philippines','China'
  ];
BEGIN
  IF NEW.country IS NULL OR NOT (NEW.country = ANY(allowed)) THEN
    RAISE EXCEPTION 'Country % is not in the Service Library allow-list', NEW.country;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sl_countries_allow_list ON public.service_library_countries;
CREATE TRIGGER trg_sl_countries_allow_list
  BEFORE INSERT OR UPDATE ON public.service_library_countries
  FOR EACH ROW EXECUTE FUNCTION public.service_library_country_allow_list_check();

-- ============================================================
-- 4. Dedupe pass
-- ============================================================
DO $$
DECLARE
  v_dupes integer := 0;
  v_masters integer := 0;
  v_mappings integer := 0;
  v_overrides integer := 0;
  v_allowed text[] := ARRAY[
    'United Kingdom','Germany','Ireland','France','Italy','Spain','Netherlands','Sweden',
    'Switzerland','Austria','Poland','Malta','Cyprus','Portugal','Finland','Denmark','Norway',
    'Hungary','Lithuania','Latvia','Estonia','Georgia','Russia','Romania','Serbia','Turkey',
    'Canada','United States','Australia','New Zealand','United Arab Emirates','Singapore',
    'Malaysia','Japan','South Korea','Uzbekistan','Kazakhstan','Kyrgyzstan','Philippines','China'
  ];
BEGIN
  -- Pick canonical row per (service_category, service, sub_service)
  CREATE TEMP TABLE _sl_canonical AS
  SELECT DISTINCT ON (service_category, service, sub_service)
         id AS canonical_id, service_category, service, sub_service,
         checklist_text, process_flow
    FROM public.service_library
   ORDER BY service_category, service, sub_service,
            COALESCE(length(checklist_text), 0) DESC,
            created_at ASC;

  -- Move country values to mapping table (allow-list only)
  INSERT INTO public.service_library_countries (library_id, country)
  SELECT c.canonical_id, sl.country
    FROM public.service_library sl
    JOIN _sl_canonical c
      ON c.service_category = sl.service_category
     AND c.service = sl.service
     AND c.sub_service = sl.sub_service
   WHERE sl.country = ANY(v_allowed)
   GROUP BY c.canonical_id, sl.country
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_mappings = ROW_COUNT;

  -- Create overrides for non-canonical rows whose text differs
  INSERT INTO public.service_library_overrides (library_id, country, checklist_text, process_flow)
  SELECT c.canonical_id, sl.country, sl.checklist_text, sl.process_flow
    FROM public.service_library sl
    JOIN _sl_canonical c
      ON c.service_category = sl.service_category
     AND c.service = sl.service
     AND c.sub_service = sl.sub_service
   WHERE sl.id <> c.canonical_id
     AND sl.country = ANY(v_allowed)
     AND (
       COALESCE(sl.checklist_text,'') <> COALESCE(c.checklist_text,'')
       OR COALESCE(sl.process_flow::text,'') <> COALESCE(c.process_flow::text,'')
     )
  ON CONFLICT (library_id, country) DO NOTHING;
  GET DIAGNOSTICS v_overrides = ROW_COUNT;

  -- Re-point fee items and attachments from non-canonical to canonical
  UPDATE public.service_library_fee_items f
     SET library_id = c.canonical_id
    FROM public.service_library sl
    JOIN _sl_canonical c
      ON c.service_category = sl.service_category
     AND c.service = sl.service
     AND c.sub_service = sl.sub_service
   WHERE f.library_id = sl.id
     AND sl.id <> c.canonical_id;

  UPDATE public.service_library_attachments a
     SET library_id = c.canonical_id
    FROM public.service_library sl
    JOIN _sl_canonical c
      ON c.service_category = sl.service_category
     AND c.service = sl.service
     AND c.sub_service = sl.sub_service
   WHERE a.library_id = sl.id
     AND sl.id <> c.canonical_id;

  -- Delete non-canonical rows
  WITH del AS (
    DELETE FROM public.service_library sl
     USING _sl_canonical c
     WHERE c.service_category = sl.service_category
       AND c.service = sl.service
       AND c.sub_service = sl.sub_service
       AND sl.id <> c.canonical_id
    RETURNING sl.id
  )
  SELECT count(*) INTO v_dupes FROM del;

  -- Also delete any disallowed-country canonical rows that have no mapping
  DELETE FROM public.service_library sl
   WHERE NOT EXISTS (
     SELECT 1 FROM public.service_library_countries m WHERE m.library_id = sl.id
   )
   AND NOT (sl.country = ANY(v_allowed));

  -- Backfill mapping for canonical rows where the canonical's own country is allow-listed
  INSERT INTO public.service_library_countries (library_id, country)
  SELECT sl.id, sl.country
    FROM public.service_library sl
   WHERE sl.country = ANY(v_allowed)
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_masters FROM public.service_library;

  INSERT INTO public.service_library_migration_log
    (duplicates_merged, masters_remaining, country_mappings_created, overrides_created)
  VALUES (v_dupes, v_masters, v_mappings, v_overrides);

  DROP TABLE _sl_canonical;
END $$;

-- ============================================================
-- 5. Drop old country column, enforce new unique key
-- ============================================================
ALTER TABLE public.service_library DROP COLUMN IF EXISTS country;

-- Drop any previous unique constraint built on country
ALTER TABLE public.service_library
  DROP CONSTRAINT IF EXISTS service_library_country_service_sub_service_key;
DROP INDEX IF EXISTS public.service_library_country_service_sub_service_key;

ALTER TABLE public.service_library
  ADD CONSTRAINT service_library_cat_service_sub_key
  UNIQUE (service_category, service, sub_service);

-- ============================================================
-- 6. Seed default submission checklist items for every master
-- ============================================================
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order)
SELECT sl.id, x.item_key, x.item_label, true, x.sort_order
  FROM public.service_library sl
  CROSS JOIN (VALUES
    ('documents_verified',      'Documents verified',       1),
    ('checklist_completed',     'Checklist completed',      2),
    ('fees_collected',          'Fees collected',           3),
    ('client_approval_received','Client approval received', 4),
    ('quality_review_completed','Quality review completed', 5),
    ('submission_approved',     'Submission approved',      6)
  ) AS x(item_key, item_label, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.service_library_submission_checklist s
    WHERE s.library_id = sl.id AND s.item_key = x.item_key
 );
