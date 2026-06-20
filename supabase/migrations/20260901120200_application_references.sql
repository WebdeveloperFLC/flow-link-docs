-- Application References: multiple institution reference numbers per student application
-- No master table — reference_type is free text with country defaults in the UI only.

CREATE TABLE IF NOT EXISTS public.qualification_application_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reference_type text NOT NULL CHECK (char_length(trim(reference_type)) > 0),
  reference_number text NOT NULL DEFAULT '' CHECK (char_length(reference_number) <= 500),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualification_application_references_qual
  ON public.qualification_application_references (qualification_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qualification_application_references_client
  ON public.qualification_application_references (client_id);

-- One row per reference type per application (case-insensitive, trimmed).
CREATE UNIQUE INDEX IF NOT EXISTS idx_qualification_application_references_type_unique
  ON public.qualification_application_references (qualification_id, lower(trim(reference_type)));

CREATE TRIGGER qualification_application_references_touch
  BEFORE UPDATE ON public.qualification_application_references
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.qualification_application_references IS
  'Institution reference numbers (application ID, CAS, SEVIS, etc.) per student application.';

ALTER TABLE public.qualification_application_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qualification_application_references_select ON public.qualification_application_references;
CREATE POLICY qualification_application_references_select ON public.qualification_application_references
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

GRANT SELECT ON public.qualification_application_references TO authenticated;

-- ---------------------------------------------------------------------------
-- RPCs (writes via SECURITY DEFINER — same pattern as other Application Foundation tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_upsert_application_reference(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_qualification_id uuid;
  v_client_id uuid;
  v_lifecycle public.qualification_lifecycle_status;
  v_reference_type text;
  v_reference_number text;
  v_notes text;
  v_existing_type text;
  v_duplicate_type text;
BEGIN
  v_id := NULLIF(p_payload->>'id', '')::uuid;
  v_qualification_id := (p_payload->>'qualification_id')::uuid;
  v_reference_type := NULLIF(trim(p_payload->>'reference_type'), '');
  v_reference_number := COALESCE(trim(p_payload->>'reference_number'), '');
  v_notes := NULLIF(trim(p_payload->>'notes'), '');

  IF v_qualification_id IS NULL OR v_reference_type IS NULL THEN
    RAISE EXCEPTION 'qualification_id and reference_type are required';
  END IF;

  IF char_length(v_reference_number) = 0 THEN
    RAISE EXCEPTION 'reference_number is required';
  END IF;

  SELECT q.client_id, q.status
  INTO v_client_id, v_lifecycle
  FROM public.client_institution_qualifications q
  WHERE q.id = v_qualification_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF public.fn_qualification_is_terminal(v_lifecycle) THEN
    RAISE EXCEPTION 'Cannot edit references on a closed application';
  END IF;

  SELECT r.reference_type
  INTO v_duplicate_type
  FROM public.qualification_application_references r
  WHERE r.qualification_id = v_qualification_id
    AND lower(trim(r.reference_type)) = lower(trim(v_reference_type))
    AND (v_id IS NULL OR r.id <> v_id)
  LIMIT 1;

  IF v_duplicate_type IS NOT NULL THEN
    RAISE EXCEPTION 'This application already has a reference of type %', v_duplicate_type;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.qualification_application_references (
      qualification_id, client_id, reference_type, reference_number, notes, created_by
    ) VALUES (
      v_qualification_id, v_client_id, v_reference_type, v_reference_number, v_notes, auth.uid()
    )
    RETURNING id INTO v_id;

    PERFORM public.fn_qualification_ingest_event(
      v_qualification_id,
      'APPLICATION_REFERENCE_ADDED',
      jsonb_build_object(
        'reference_id', v_id,
        'reference_type', v_reference_type,
        'reference_number', v_reference_number,
        'actor_id', auth.uid()
      ),
      NULL
    );
  ELSE
    SELECT r.reference_type INTO v_existing_type
    FROM public.qualification_application_references r
    WHERE r.id = v_id AND r.qualification_id = v_qualification_id;

    IF v_existing_type IS NULL THEN
      RAISE EXCEPTION 'Reference not found';
    END IF;

    UPDATE public.qualification_application_references SET
      reference_type = v_reference_type,
      reference_number = v_reference_number,
      notes = v_notes,
      updated_at = now()
    WHERE id = v_id;

    PERFORM public.fn_qualification_ingest_event(
      v_qualification_id,
      'APPLICATION_REFERENCE_UPDATED',
      jsonb_build_object(
        'reference_id', v_id,
        'from_type', v_existing_type,
        'to_type', v_reference_type,
        'reference_number', v_reference_number,
        'actor_id', auth.uid()
      ),
      NULL
    );
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_application_reference(p_reference_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qualification_id uuid;
  v_client_id uuid;
  v_lifecycle public.qualification_lifecycle_status;
  v_reference_type text;
BEGIN
  SELECT r.qualification_id, r.client_id, r.reference_type
  INTO v_qualification_id, v_client_id, v_reference_type
  FROM public.qualification_application_references r
  WHERE r.id = p_reference_id;

  IF v_qualification_id IS NULL THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT q.status INTO v_lifecycle
  FROM public.client_institution_qualifications q
  WHERE q.id = v_qualification_id;

  IF public.fn_qualification_is_terminal(v_lifecycle) THEN
    RAISE EXCEPTION 'Cannot edit references on a closed application';
  END IF;

  DELETE FROM public.qualification_application_references WHERE id = p_reference_id;

  PERFORM public.fn_qualification_ingest_event(
    v_qualification_id,
    'APPLICATION_REFERENCE_REMOVED',
    jsonb_build_object(
      'reference_id', p_reference_id,
      'reference_type', v_reference_type,
      'actor_id', auth.uid()
    ),
    NULL
  );

  RETURN p_reference_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_application_reference(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_application_reference(uuid) TO authenticated;
