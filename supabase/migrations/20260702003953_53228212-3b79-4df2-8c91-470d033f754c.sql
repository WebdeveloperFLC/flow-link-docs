-- Document Workflow Phase 1 — RPCs

CREATE OR REPLACE FUNCTION public.fn_document_workflow_slug(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      regexp_replace(lower(trim(COALESCE(p_text, ''))), '[^a-z0-9]+', '_', 'g'),
      ''
    ),
    'item'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_document_master_code(p_label text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT mi.code INTO v_code
  FROM public.master_items mi
  WHERE mi.list_key = 'document_types'
    AND mi.is_active = true
    AND lower(trim(mi.label)) = lower(trim(COALESCE(p_label, '')))
  LIMIT 1;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  RETURN public.fn_document_workflow_slug(p_label);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_document_workflow_is_milestone(
  p_section_key text,
  p_item_name text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    COALESCE(p_section_key, '') IN (
      'submission',
      'fees_submission',
      'fees_qa_lodgement'
    )
    OR lower(COALESCE(p_item_name, '')) IN (
      'government visa fee paid; official receipt saved',
      'government visa fee paid; official receipt saved on file',
      'application lodged; confirmation / reference number saved on file',
      'client reviewed, signed, and dated this checklist',
      'quality review / qa sign-off — eligibility, funds, and forms cross-checked',
      'application lodged; immiaccount confirmation / trn saved on client file',
      'biometrics completed',
      'application submitted',
      'aor received',
      'medical passed',
      'passport request',
      'visa issued'
    )
    OR lower(COALESCE(p_item_name, '')) LIKE '%fee paid%'
    OR lower(COALESCE(p_item_name, '')) LIKE '%application lodged%'
    OR lower(COALESCE(p_item_name, '')) LIKE '%confirmation%reference%'
$$;

CREATE OR REPLACE FUNCTION public.fn_document_workflow_infer_display_group(
  p_section_key text,
  p_party_scope text,
  p_item jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(trim(p_item->>'display_group'), ''),
    CASE
      WHEN COALESCE(p_section_key, '') IN ('financial', 'finance', 'financial_capacity_genuine_visitor')
        OR lower(COALESCE(p_item->>'name', '')) LIKE '%bank%'
        OR lower(COALESCE(p_item->>'name', '')) LIKE '%fund%'
        OR lower(COALESCE(p_item->>'name', '')) LIKE '%gic%'
        OR lower(COALESCE(p_item->>'name', '')) LIKE '%tuition%'
      THEN CASE COALESCE(p_party_scope, 'applicant')
        WHEN 'sponsor' THEN 'sponsor_funds'
        WHEN 'co_applicant' THEN 'co_applicant_funds'
        WHEN 'dependent' THEN 'dependent_funds'
        ELSE 'applicant_funds'
      END
      ELSE NULL
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_workflow_template_for_case(p_case_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.client_service_cases%ROWTYPE;
  v_template_id uuid;
  v_library_id text;
  v_country text;
BEGIN
  SELECT * INTO v_case
  FROM public.client_service_cases
  WHERE id = p_case_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_case.workflow_template_id IS NOT NULL THEN
    RETURN v_case.workflow_template_id;
  END IF;

  SELECT wt.id INTO v_template_id
  FROM public.workflow_templates wt
  WHERE wt.category = v_case.service_code
  ORDER BY wt.version DESC, wt.updated_at DESC
  LIMIT 1;

  IF v_template_id IS NOT NULL THEN
    RETURN v_template_id;
  END IF;

  v_library_id := split_part(v_case.service_code, '::', 1);
  v_country := NULLIF(split_part(v_case.service_code, '::', 2), '');

  IF v_country IS NOT NULL THEN
    SELECT wt.id INTO v_template_id
    FROM public.workflow_templates wt
    WHERE wt.category IN (v_case.service_code, v_library_id)
      AND wt.country = v_country
    ORDER BY wt.version DESC, wt.updated_at DESC
    LIMIT 1;
  ELSE
    SELECT wt.id INTO v_template_id
    FROM public.workflow_templates wt
    WHERE wt.category = v_library_id
    ORDER BY wt.version DESC, wt.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_template_id IS NULL THEN
    SELECT cl.template_id INTO v_template_id
    FROM public.clients cl
    WHERE cl.id = v_case.client_id;
  END IF;

  RETURN v_template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_materialize_case_document_requirements(
  p_case_id uuid,
  p_skip_existing_manual boolean DEFAULT true
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.client_service_cases%ROWTYPE;
  v_tpl public.workflow_templates%ROWTYPE;
  v_groups jsonb;
  v_items jsonb;
  v_group jsonb;
  v_item_id text;
  v_item jsonb;
  v_item_map jsonb := '{}'::jsonb;
  v_section_key text;
  v_section_label text;
  v_master_code text;
  v_kind text;
  v_party text;
  v_display_group text;
  v_sort int;
  v_upserted int := 0;
  g record;
BEGIN
  SELECT * INTO v_case FROM public.client_service_cases WHERE id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service case not found';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.can_edit_client(auth.uid(), v_case.client_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO v_tpl
  FROM public.workflow_templates
  WHERE id = COALESCE(v_case.workflow_template_id, public.fn_resolve_workflow_template_for_case(p_case_id));

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_items := COALESCE(v_tpl.items, '[]'::jsonb);
  v_groups := COALESCE(v_tpl.groups, '[]'::jsonb);

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_item_map := v_item_map || jsonb_build_object(v_item->>'id', v_item);
  END LOOP;

  v_sort := 0;

  FOR g IN
    SELECT value AS grp
    FROM jsonb_array_elements(v_groups)
    ORDER BY COALESCE((value->>'sort_order')::int, 0)
  LOOP
    v_group := g.grp;
    v_section_key := COALESCE(NULLIF(trim(v_group->>'section_key'), ''), public.fn_document_workflow_slug(v_group->>'label'));
    v_section_label := COALESCE(NULLIF(trim(v_group->>'label'), ''), initcap(replace(v_section_key, '_', ' ')));

    FOR v_item_id IN SELECT jsonb_array_elements_text(COALESCE(v_group->'item_ids', '[]'::jsonb))
    LOOP
      v_item := v_item_map->v_item_id;
      IF v_item IS NULL OR v_item = 'null'::jsonb THEN
        CONTINUE;
      END IF;

      v_master_code := COALESCE(
        NULLIF(trim(v_item->>'master_item_code'), ''),
        public.fn_resolve_document_master_code(v_item->>'name')
      );

      v_kind := CASE
        WHEN COALESCE(v_item->>'requirement_kind', '') = 'milestone'
          OR public.fn_document_workflow_is_milestone(v_section_key, v_item->>'name')
        THEN 'milestone'
        ELSE 'document'
      END;

      v_party := COALESCE(NULLIF(trim(v_item->>'party_scope'), ''), 'applicant');
      IF v_party NOT IN ('applicant', 'co_applicant', 'sponsor', 'dependent', 'shared', 'any') THEN
        v_party := 'applicant';
      END IF;

      v_display_group := public.fn_document_workflow_infer_display_group(v_section_key, v_party, v_item);
      v_sort := v_sort + 10;

      INSERT INTO public.application_document_requirements (
        client_service_case_id,
        client_id,
        source,
        template_item_id,
        workflow_template_id,
        master_item_code,
        display_name,
        mandatory,
        requirement_kind,
        section_key,
        section_label,
        display_group,
        party_scope,
        sort_order
      )
      VALUES (
        p_case_id,
        v_case.client_id,
        'template',
        v_item_id,
        v_tpl.id,
        v_master_code,
        COALESCE(NULLIF(trim(v_item->>'name'), ''), v_master_code),
        COALESCE((v_item->>'mandatory')::boolean, true),
        v_kind,
        v_section_key,
        v_section_label,
        v_display_group,
        v_party,
        v_sort
      )
      ON CONFLICT ON CONSTRAINT adr_unique_case_item
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        mandatory = EXCLUDED.mandatory,
        requirement_kind = EXCLUDED.requirement_kind,
        section_key = EXCLUDED.section_key,
        section_label = EXCLUDED.section_label,
        display_group = EXCLUDED.display_group,
        party_scope = EXCLUDED.party_scope,
        workflow_template_id = EXCLUDED.workflow_template_id,
        sort_order = EXCLUDED.sort_order,
        updated_at = now()
      WHERE application_document_requirements.source = 'template'
        AND application_document_requirements.is_suppressed = false;

      v_upserted := v_upserted + 1;

      IF v_kind = 'milestone' THEN
        INSERT INTO public.application_document_milestones (
          client_service_case_id,
          client_id,
          requirement_id
        )
        SELECT
          p_case_id,
          v_case.client_id,
          adr.id
        FROM public.application_document_requirements adr
        WHERE adr.client_service_case_id = p_case_id
          AND adr.master_item_code = v_master_code
          AND adr.requirement_kind = 'milestone'
        ON CONFLICT (requirement_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_groups) grp
      WHERE grp->'item_ids' ? (v_item->>'id')
    );

    v_section_key := 'other';
    v_section_label := 'Other Documents';
    v_master_code := COALESCE(
      NULLIF(trim(v_item->>'master_item_code'), ''),
      public.fn_resolve_document_master_code(v_item->>'name')
    );
    v_kind := CASE
      WHEN public.fn_document_workflow_is_milestone(v_section_key, v_item->>'name') THEN 'milestone'
      ELSE 'document'
    END;
    v_party := COALESCE(NULLIF(trim(v_item->>'party_scope'), ''), 'applicant');
    v_display_group := public.fn_document_workflow_infer_display_group(v_section_key, v_party, v_item);
    v_sort := v_sort + 10;

    INSERT INTO public.application_document_requirements (
      client_service_case_id, client_id, source, template_item_id, workflow_template_id,
      master_item_code, display_name, mandatory, requirement_kind,
      section_key, section_label, display_group, party_scope, sort_order
    )
    VALUES (
      p_case_id, v_case.client_id, 'template', v_item->>'id', v_tpl.id,
      v_master_code, COALESCE(v_item->>'name', v_master_code),
      COALESCE((v_item->>'mandatory')::boolean, true), v_kind,
      v_section_key, v_section_label, v_display_group, v_party, v_sort
    )
    ON CONFLICT ON CONSTRAINT adr_unique_case_item DO NOTHING;

    v_upserted := v_upserted + 1;
  END LOOP;

  RETURN v_upserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_assign_case_workflow_template(
  p_case_id uuid,
  p_template_id uuid DEFAULT NULL,
  p_rematerialize boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.client_service_cases%ROWTYPE;
  v_template_id uuid;
  v_count int := 0;
BEGIN
  SELECT * INTO v_case
  FROM public.client_service_cases
  WHERE id = p_case_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service case not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_case.client_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  v_template_id := COALESCE(p_template_id, public.fn_resolve_workflow_template_for_case(p_case_id));

  IF v_template_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_template_found');
  END IF;

  UPDATE public.client_service_cases
  SET
    workflow_template_id = v_template_id,
    template_assigned_at = now()
  WHERE id = p_case_id;

  IF p_rematerialize THEN
    v_count := public.fn_materialize_case_document_requirements(p_case_id, false);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'case_id', p_case_id,
    'workflow_template_id', v_template_id,
    'requirements_upserted', v_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_add_case_document_requirement(
  p_case_id uuid,
  p_master_item_code text,
  p_mandatory boolean DEFAULT false,
  p_party_scope text DEFAULT 'applicant',
  p_person_id uuid DEFAULT NULL,
  p_section_key text DEFAULT 'other',
  p_section_label text DEFAULT 'Other Documents',
  p_display_group text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.client_service_cases%ROWTYPE;
  v_label text;
  v_id uuid;
  v_sort int;
BEGIN
  SELECT * INTO v_case FROM public.client_service_cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service case not found'; END IF;
  IF NOT public.can_edit_client(auth.uid(), v_case.client_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT mi.label INTO v_label
  FROM public.master_items mi
  WHERE mi.list_key = 'document_types' AND mi.code = p_master_item_code;

  IF v_label IS NULL THEN
    RAISE EXCEPTION 'Unknown document type code: %', p_master_item_code;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 10 INTO v_sort
  FROM public.application_document_requirements
  WHERE client_service_case_id = p_case_id;

  INSERT INTO public.application_document_requirements (
    client_service_case_id, client_id, source, master_item_code, display_name,
    mandatory, requirement_kind, section_key, section_label, display_group,
    party_scope, person_id, notes, sort_order, created_by
  )
  VALUES (
    p_case_id, v_case.client_id, 'manual_add', p_master_item_code, v_label,
    COALESCE(p_mandatory, false), 'document',
    COALESCE(NULLIF(trim(p_section_key), ''), 'other'),
    COALESCE(NULLIF(trim(p_section_label), ''), 'Other Documents'),
    NULLIF(trim(p_display_group), ''),
    COALESCE(NULLIF(trim(p_party_scope), ''), 'applicant'),
    p_person_id, NULLIF(trim(p_notes), ''), v_sort, auth.uid()
  )
  ON CONFLICT ON CONSTRAINT adr_unique_case_item
  DO UPDATE SET
    mandatory = EXCLUDED.mandatory,
    is_suppressed = false,
    notes = COALESCE(EXCLUDED.notes, application_document_requirements.notes),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_ingest_portal_document(
  p_client_id uuid,
  p_master_item_code text,
  p_storage_path text,
  p_file_name text,
  p_mime_type text DEFAULT NULL,
  p_size_bytes bigint DEFAULT NULL,
  p_case_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_label text;
  v_doc_id uuid;
  v_version int;
  v_section_id uuid;
BEGIN
  IF NOT public.is_portal_user_for(auth.uid(), p_client_id) THEN
    RAISE EXCEPTION 'Portal access denied';
  END IF;

  SELECT mi.label INTO v_label
  FROM public.master_items mi
  WHERE mi.list_key = 'document_types' AND mi.code = p_master_item_code;

  IF v_label IS NULL THEN
    RAISE EXCEPTION 'Unknown document type';
  END IF;

  v_case_id := p_case_id;
  IF v_case_id IS NULL THEN
    SELECT csc.id INTO v_case_id
    FROM public.client_service_cases csc
    WHERE csc.client_id = p_client_id AND csc.status = 'open'
    ORDER BY csc.created_at DESC
    LIMIT 1;
  END IF;

  SELECT cs.id INTO v_section_id
  FROM public.case_sections cs
  WHERE cs.key IN ('other', 'other_documents', 'supporting')
    AND cs.is_archived = false
  ORDER BY CASE cs.key WHEN 'other' THEN 0 WHEN 'other_documents' THEN 1 ELSE 2 END
  LIMIT 1;

  SELECT COALESCE(MAX(d.version), 0) + 1 INTO v_version
  FROM public.client_documents d
  WHERE d.client_id = p_client_id
    AND d.deleted_at IS NULL
    AND (
      d.master_item_code = p_master_item_code
      OR (d.document_type = v_label OR d.custom_type = v_label)
    );

  UPDATE public.client_documents
  SET is_active_version = false
  WHERE client_id = p_client_id
    AND deleted_at IS NULL
    AND is_active_version = true
    AND (
      master_item_code = p_master_item_code
      OR document_type = v_label
      OR custom_type = v_label
    );

  INSERT INTO public.client_documents (
    client_id,
    case_id,
    section_id,
    document_type,
    custom_type,
    master_item_code,
    file_name,
    storage_path,
    mime_type,
    size_bytes,
    version,
    status,
    is_active_version,
    portal_source,
    uploaded_by,
    uploaded_at
  )
  VALUES (
    p_client_id,
    v_case_id,
    v_section_id,
    v_label,
    v_label,
    p_master_item_code,
    p_file_name,
    p_storage_path,
    p_mime_type,
    p_size_bytes,
    v_version,
    'uploaded',
    true,
    true,
    auth.uid(),
    now()
  )
  RETURNING id INTO v_doc_id;

  RETURN jsonb_build_object(
    'ok', true,
    'document_id', v_doc_id,
    'case_id', v_case_id,
    'version', v_version
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_case_milestone_completed(
  p_requirement_id uuid,
  p_completed boolean,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.application_document_requirements%ROWTYPE;
BEGIN
  SELECT * INTO v_req
  FROM public.application_document_requirements
  WHERE id = p_requirement_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Requirement not found'; END IF;
  IF v_req.requirement_kind <> 'milestone' THEN RAISE EXCEPTION 'Not a milestone requirement'; END IF;
  IF NOT public.can_edit_client(auth.uid(), v_req.client_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  INSERT INTO public.application_document_milestones (
    client_service_case_id, client_id, requirement_id,
    completed, completed_at, completed_by, reference_number, notes
  )
  VALUES (
    v_req.client_service_case_id, v_req.client_id, v_req.id,
    p_completed,
    CASE WHEN p_completed THEN now() ELSE NULL END,
    CASE WHEN p_completed THEN auth.uid() ELSE NULL END,
    NULLIF(trim(p_reference_number), ''),
    NULLIF(trim(p_notes), '')
  )
  ON CONFLICT (requirement_id) DO UPDATE SET
    completed = EXCLUDED.completed,
    completed_at = EXCLUDED.completed_at,
    completed_by = EXCLUDED.completed_by,
    reference_number = COALESCE(EXCLUDED.reference_number, application_document_milestones.reference_number),
    notes = COALESCE(EXCLUDED.notes, application_document_milestones.notes),
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'requirement_id', p_requirement_id, 'completed', p_completed);
END;
$$;

DO $$
DECLARE
  r record;
  v_tpl uuid;
BEGIN
  FOR r IN
    SELECT csc.id AS case_id
    FROM public.client_service_cases csc
    WHERE csc.status = 'open'
  LOOP
    v_tpl := public.fn_resolve_workflow_template_for_case(r.case_id);
    IF v_tpl IS NOT NULL THEN
      UPDATE public.client_service_cases
      SET workflow_template_id = COALESCE(workflow_template_id, v_tpl),
          template_assigned_at = COALESCE(template_assigned_at, now())
      WHERE id = r.case_id;

      PERFORM public.fn_materialize_case_document_requirements(r.case_id, false);
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_document_workflow_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_document_master_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_workflow_template_for_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assign_case_workflow_template(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_materialize_case_document_requirements(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_add_case_document_requirement(uuid, text, boolean, text, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ingest_portal_document(uuid, text, text, text, text, bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_case_milestone_completed(uuid, boolean, text, text) TO authenticated;