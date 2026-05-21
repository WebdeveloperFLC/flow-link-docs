
ALTER TABLE public.dsh_media
  ADD COLUMN IF NOT EXISTS credited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_received_at date;

CREATE INDEX IF NOT EXISTS idx_dsh_media_review_month
  ON public.dsh_media (is_google_review, review_received_at, credited_user_id, branch_id)
  WHERE is_google_review;

CREATE OR REPLACE FUNCTION public.dsh_media_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    IF NEW.credited_user_id IS NULL THEN
      RAISE EXCEPTION 'Google review requires credited counselor / team member';
    END IF;
    IF NEW.review_received_at IS NULL THEN
      NEW.review_received_at := (NEW.created_at)::date;
    END IF;
  END IF;

  IF NEW.source_type = 'link' AND (NEW.external_url IS NULL OR NEW.external_url = '') THEN
    RAISE EXCEPTION 'external_url required for link source';
  END IF;
  IF NEW.source_type = 'upload' AND (NEW.storage_path IS NULL OR NEW.storage_path = '') THEN
    RAISE EXCEPTION 'storage_path required for upload source';
  END IF;
  IF NEW.source_type = 'upload' AND NEW.mime_type IS NOT NULL
     AND NEW.mime_type LIKE 'video/%' THEN
    RAISE EXCEPTION 'Video uploads not allowed — use an OneDrive link';
  END IF;
  IF NEW.source_type = 'upload' AND NEW.file_size IS NOT NULL AND NEW.file_size > 10 * 1024 * 1024 THEN
    RAISE EXCEPTION 'Upload exceeds 10 MB limit — use an OneDrive link';
  END IF;

  RETURN NEW;
END $function$;
