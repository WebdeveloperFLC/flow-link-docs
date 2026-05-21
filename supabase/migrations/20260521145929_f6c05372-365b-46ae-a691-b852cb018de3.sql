
-- Enums
DO $$ BEGIN
  CREATE TYPE public.dsh_content_type AS ENUM (
    'testimonial','review','visa_approval','promo_video','reel','poster','document',
    'social','branch_promo','institution_promo','country_promo','visa_category_promo','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsh_content_scope AS ENUM ('common','country','institution','service_category');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsh_source_type AS ENUM ('upload','link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsh_upload_source AS ENUM ('upload','onedrive','google_drive','external_url');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsh_link_type AS ENUM (
    'onedrive_file','onedrive_folder','google_drive_file','google_drive_folder',
    'download','video','shared_folder','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsh_owner_department AS ENUM (
    'marketing','admissions','visa_team','pr_team','ielts_team','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsh_status AS ENUM ('active','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main table
CREATE TABLE IF NOT EXISTS public.dsh_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  campaign_name text,
  content_type public.dsh_content_type NOT NULL,
  content_scope public.dsh_content_scope NOT NULL,
  content_owner_department public.dsh_owner_department,
  visa_category text,
  service_master_key text,
  service_sub_category text,

  source_type public.dsh_source_type NOT NULL,
  upload_source public.dsh_upload_source NOT NULL,
  link_type public.dsh_link_type,
  external_url text,
  storage_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  preview_image_url text,

  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  institution_id uuid,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  department_id uuid,
  country_name text,
  visible_to_all_branches boolean NOT NULL DEFAULT false,

  is_pinned boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  is_front_desk boolean NOT NULL DEFAULT false,
  front_desk_priority int,
  display_until timestamptz,
  status public.dsh_status NOT NULL DEFAULT 'active',

  is_google_review boolean NOT NULL DEFAULT false,
  google_review_url text,
  google_review_text text,
  google_review_rating smallint,
  google_review_screenshot_path text,
  client_link_url text,

  search_doc tsvector,
  last_notified_at timestamptz,
  notify_count int NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsh_media_search ON public.dsh_media USING gin(search_doc);
CREATE INDEX IF NOT EXISTS idx_dsh_media_order ON public.dsh_media (is_pinned DESC, sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_media_front_desk ON public.dsh_media (is_front_desk, front_desk_priority) WHERE is_front_desk;
CREATE INDEX IF NOT EXISTS idx_dsh_media_status ON public.dsh_media (status, display_until);
CREATE INDEX IF NOT EXISTS idx_dsh_media_scope ON public.dsh_media (content_scope);
CREATE INDEX IF NOT EXISTS idx_dsh_media_client ON public.dsh_media (client_id);
CREATE INDEX IF NOT EXISTS idx_dsh_media_country ON public.dsh_media (country_name);
CREATE INDEX IF NOT EXISTS idx_dsh_media_institution ON public.dsh_media (institution_id);
CREATE INDEX IF NOT EXISTS idx_dsh_media_service ON public.dsh_media (service_master_key);
CREATE INDEX IF NOT EXISTS idx_dsh_media_google ON public.dsh_media (is_google_review) WHERE is_google_review;

-- Search doc refresh trigger
CREATE OR REPLACE FUNCTION public.dsh_media_refresh_search()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_branch text;
  v_service text;
BEGIN
  SELECT name INTO v_branch FROM public.branches WHERE id = NEW.branch_id;
  SELECT string_agg(DISTINCT service_name, ' ') INTO v_service
    FROM public.service_catalogue
   WHERE master_key = NEW.service_master_key
     AND (NEW.service_sub_category IS NULL OR sub_category = NEW.service_sub_category);

  NEW.search_doc :=
      setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A')
   || setweight(to_tsvector('simple', coalesce(NEW.campaign_name,'')), 'A')
   || setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B')
   || setweight(to_tsvector('simple', coalesce(NEW.content_type::text,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(NEW.country_name,'')), 'B')
   || setweight(to_tsvector('simple', coalesce(v_branch,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(NEW.service_master_key,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(NEW.service_sub_category,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(v_service,'')), 'C')
   || setweight(to_tsvector('simple', coalesce(NEW.google_review_text,'')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_media_search ON public.dsh_media;
CREATE TRIGGER trg_dsh_media_search
BEFORE INSERT OR UPDATE ON public.dsh_media
FOR EACH ROW EXECUTE FUNCTION public.dsh_media_refresh_search();

-- Validation trigger
CREATE OR REPLACE FUNCTION public.dsh_media_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.content_scope = 'country' AND (NEW.country_name IS NULL OR NEW.country_name = '') THEN
    RAISE EXCEPTION 'country_name required for country-scoped media';
  END IF;
  IF NEW.content_scope = 'institution' AND NEW.institution_id IS NULL THEN
    RAISE EXCEPTION 'institution_id required for institution-scoped media';
  END IF;
  IF NEW.content_scope = 'service_category' AND (NEW.service_master_key IS NULL OR NEW.service_master_key = '') THEN
    RAISE EXCEPTION 'service_master_key required for service-scoped media';
  END IF;

  IF NEW.is_google_review THEN
    NEW.content_type := 'review'::public.dsh_content_type;
    IF NEW.client_id IS NULL OR NEW.country_name IS NULL OR NEW.branch_id IS NULL
       OR NEW.service_master_key IS NULL THEN
      RAISE EXCEPTION 'Google review requires client, country, branch and service category';
    END IF;
  END IF;

  -- Source must match
  IF NEW.source_type = 'link' AND (NEW.external_url IS NULL OR NEW.external_url = '') THEN
    RAISE EXCEPTION 'external_url required for link source';
  END IF;
  IF NEW.source_type = 'upload' AND (NEW.storage_path IS NULL OR NEW.storage_path = '') THEN
    RAISE EXCEPTION 'storage_path required for upload source';
  END IF;

  -- No video uploads (OneDrive only)
  IF NEW.source_type = 'upload' AND NEW.mime_type IS NOT NULL
     AND NEW.mime_type LIKE 'video/%' THEN
    RAISE EXCEPTION 'Video uploads not allowed — use an OneDrive link';
  END IF;

  -- 10 MB cap on uploads
  IF NEW.source_type = 'upload' AND NEW.file_size IS NOT NULL AND NEW.file_size > 10 * 1024 * 1024 THEN
    RAISE EXCEPTION 'Upload exceeds 10 MB limit — use an OneDrive link';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_media_validate ON public.dsh_media;
CREATE TRIGGER trg_dsh_media_validate
BEFORE INSERT OR UPDATE ON public.dsh_media
FOR EACH ROW EXECUTE FUNCTION public.dsh_media_validate();

-- Branch notifications audit
CREATE TABLE IF NOT EXISTS public.dsh_branch_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.dsh_media(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  message_id bigint,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dsh_notif_media ON public.dsh_branch_notifications (media_id);

-- Branch contacts
CREATE TABLE IF NOT EXISTS public.dsh_branch_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  email text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_branch_contact ON public.dsh_branch_contacts (branch_id, lower(email));

-- RLS
ALTER TABLE public.dsh_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsh_branch_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsh_branch_contacts ENABLE ROW LEVEL SECURITY;

-- Helper to check permission level via existing user_module_permissions
CREATE OR REPLACE FUNCTION public.dsh_can(_uid uuid, _level text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.user_has_module(_uid, 'digital_success_hub', _level)
$$;

-- dsh_media policies
DROP POLICY IF EXISTS "dsh_media view" ON public.dsh_media;
CREATE POLICY "dsh_media view" ON public.dsh_media FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.dsh_can(auth.uid(),'view')
);

DROP POLICY IF EXISTS "dsh_media insert" ON public.dsh_media;
CREATE POLICY "dsh_media insert" ON public.dsh_media FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.dsh_can(auth.uid(),'edit')
);

DROP POLICY IF EXISTS "dsh_media update" ON public.dsh_media;
CREATE POLICY "dsh_media update" ON public.dsh_media FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.dsh_can(auth.uid(),'edit')
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.dsh_can(auth.uid(),'edit')
);

DROP POLICY IF EXISTS "dsh_media delete" ON public.dsh_media;
CREATE POLICY "dsh_media delete" ON public.dsh_media FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.dsh_can(auth.uid(),'delete')
);

-- dsh_branch_notifications
DROP POLICY IF EXISTS "dsh_notif view" ON public.dsh_branch_notifications;
CREATE POLICY "dsh_notif view" ON public.dsh_branch_notifications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.dsh_can(auth.uid(),'view'));

DROP POLICY IF EXISTS "dsh_notif insert" ON public.dsh_branch_notifications;
CREATE POLICY "dsh_notif insert" ON public.dsh_branch_notifications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.dsh_can(auth.uid(),'edit'));

-- dsh_branch_contacts
DROP POLICY IF EXISTS "dsh_contacts view" ON public.dsh_branch_contacts;
CREATE POLICY "dsh_contacts view" ON public.dsh_branch_contacts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.dsh_can(auth.uid(),'view'));

DROP POLICY IF EXISTS "dsh_contacts manage" ON public.dsh_branch_contacts;
CREATE POLICY "dsh_contacts manage" ON public.dsh_branch_contacts FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.dsh_can(auth.uid(),'edit'))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.dsh_can(auth.uid(),'edit'));

-- Storage bucket for small uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('dsh-media', 'dsh-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "dsh-media read" ON storage.objects;
CREATE POLICY "dsh-media read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dsh-media');

DROP POLICY IF EXISTS "dsh-media write" ON storage.objects;
CREATE POLICY "dsh-media write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dsh-media'
  AND (public.has_role(auth.uid(),'admin'::app_role) OR public.dsh_can(auth.uid(),'edit'))
);

DROP POLICY IF EXISTS "dsh-media update" ON storage.objects;
CREATE POLICY "dsh-media update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'dsh-media'
  AND (public.has_role(auth.uid(),'admin'::app_role) OR public.dsh_can(auth.uid(),'edit'))
);

DROP POLICY IF EXISTS "dsh-media delete" ON storage.objects;
CREATE POLICY "dsh-media delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'dsh-media'
  AND (public.has_role(auth.uid(),'admin'::app_role) OR public.dsh_can(auth.uid(),'delete'))
);
