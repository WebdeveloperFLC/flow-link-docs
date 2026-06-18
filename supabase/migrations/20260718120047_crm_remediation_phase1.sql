-- CRM remediation phase 1: formal leads in telecaller queue, conversion integrity, funnel reporting.

-- ---------------------------------------------------------------------------
-- 1) Conversion integrity
-- ---------------------------------------------------------------------------
-- One client per source lead (keep earliest client; detach duplicates).
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY source_lead_id ORDER BY created_at ASC, id ASC) AS rn
    FROM public.clients
   WHERE source_lead_id IS NOT NULL
)
UPDATE public.clients c
   SET source_lead_id = NULL
  FROM ranked r
 WHERE c.id = r.id
   AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_source_lead_id
  ON public.clients(source_lead_id)
  WHERE source_lead_id IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_converted_to_client_id_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_converted_to_client_id_fkey
      FOREIGN KEY (converted_to_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) call_queue_items: bridge formal leads (client_id legacy rows remain valid)
-- ---------------------------------------------------------------------------
ALTER TABLE public.call_queue_items
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.call_queue_items
  ALTER COLUMN client_id DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'call_queue_items_target_check'
  ) THEN
    ALTER TABLE public.call_queue_items
      ADD CONSTRAINT call_queue_items_target_check
      CHECK (client_id IS NOT NULL OR lead_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_queue_lead ON public.call_queue_items(lead_id);

DROP INDEX IF EXISTS public.uq_queue_active_per_client;
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_active_per_client
  ON public.call_queue_items(client_id)
  WHERE client_id IS NOT NULL AND status IN ('queued','calling','callback');

CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_active_per_lead
  ON public.call_queue_items(lead_id)
  WHERE lead_id IS NOT NULL AND status IN ('queued','calling','callback');

-- lead_remarks: support formal leads in telecaller workflow
ALTER TABLE public.lead_remarks
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.lead_remarks
  ALTER COLUMN client_id DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_remarks_target_check'
  ) THEN
    ALTER TABLE public.lead_remarks
      ADD CONSTRAINT lead_remarks_target_check
      CHECK (client_id IS NOT NULL OR lead_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_remarks_lead ON public.lead_remarks(lead_id, created_at DESC);

-- Queue RLS: assigned telecallers may read formal leads in their queue
DROP POLICY IF EXISTS "leads telecaller queue view" ON public.leads;
CREATE POLICY "leads telecaller queue view"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR EXISTS (
      SELECT 1
        FROM public.call_queue_items cqi
        JOIN public.telephony_agents ta ON ta.id = cqi.assigned_agent_id
       WHERE cqi.lead_id = leads.id
         AND ta.user_id = auth.uid()
         AND cqi.status IN ('queued','calling','callback')
    )
  );

DROP POLICY IF EXISTS "queue read scoped" ON public.call_queue_items;
CREATE POLICY "queue read scoped" ON public.call_queue_items
  FOR SELECT TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR assigned_agent_id = public.user_telephony_agent_id(auth.uid())
    OR (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
    OR (
      lead_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.leads l
         WHERE l.id = lead_id
           AND (
             public.is_client_staff_viewer(auth.uid())
             OR l.created_by = auth.uid()
             OR l.assigned_counselor_id = auth.uid()
           )
      )
    )
  );

DROP POLICY IF EXISTS "queue insert admin or edit-rights" ON public.call_queue_items;
CREATE POLICY "queue insert admin or edit-rights" ON public.call_queue_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_telephony_admin(auth.uid())
    OR (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
    OR (
      lead_id IS NOT NULL
      AND public.is_client_staff_editor(auth.uid())
    )
  );

DROP POLICY IF EXISTS "queue update assigned agent or admin" ON public.call_queue_items;
CREATE POLICY "queue update assigned agent or admin" ON public.call_queue_items
  FOR UPDATE TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR assigned_agent_id = public.user_telephony_agent_id(auth.uid())
    OR (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
    OR (
      lead_id IS NOT NULL
      AND public.is_client_staff_editor(auth.uid())
    )
  );

DROP POLICY IF EXISTS "lead_remarks staff create" ON public.lead_remarks;
CREATE POLICY "lead_remarks staff create"
  ON public.lead_remarks
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
      OR (
        lead_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.leads l
           WHERE l.id = lead_id
             AND (
               public.is_client_staff_viewer(auth.uid())
               OR l.created_by = auth.uid()
               OR l.assigned_counselor_id = auth.uid()
             )
        )
      )
    )
  );

DROP POLICY IF EXISTS "lead_remarks view scoped" ON public.lead_remarks;
CREATE POLICY "lead_remarks view scoped"
  ON public.lead_remarks
  FOR SELECT TO authenticated
  USING (
    (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
    OR (
      lead_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.leads l
         WHERE l.id = lead_id
           AND (
             public.is_client_staff_viewer(auth.uid())
             OR l.created_by = auth.uid()
             OR l.assigned_counselor_id = auth.uid()
           )
      )
    )
  );

DROP POLICY IF EXISTS "lead_remarks staff update" ON public.lead_remarks;
CREATE POLICY "lead_remarks staff update"
  ON public.lead_remarks
  FOR UPDATE TO authenticated
  USING (
    (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
    OR (
      lead_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.leads l
         WHERE l.id = lead_id
           AND (
             public.is_client_staff_editor(auth.uid())
             OR l.created_by = auth.uid()
             OR l.assigned_counselor_id = auth.uid()
           )
      )
    )
  )
  WITH CHECK (
    (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
    OR (
      lead_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.leads l
         WHERE l.id = lead_id
           AND (
             public.is_client_staff_editor(auth.uid())
             OR l.created_by = auth.uid()
             OR l.assigned_counselor_id = auth.uid()
           )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Enqueue helper for formal leads
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_formal_lead_for_call_queue(
  _lead_id uuid,
  _campaign_id uuid DEFAULT NULL,
  _agent_id uuid DEFAULT NULL,
  _lead_status text DEFAULT NULL,
  _source text DEFAULT 'manual',
  _notes text DEFAULT NULL,
  _priority integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_status text;
  v_priority integer;
  v_id uuid;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND OR v_lead.converted_to_client_id IS NOT NULL OR v_lead.status = 'converted' THEN
    RETURN NULL;
  END IF;

  v_status := COALESCE(NULLIF(_lead_status, ''), NULLIF(v_lead.lead_temperature, ''), 'warm');
  v_priority := COALESCE(
    _priority,
    CASE v_status WHEN 'hot' THEN 100 WHEN 'warm' THEN 50 ELSE 10 END
  );

  SELECT id INTO v_id
    FROM public.call_queue_items
   WHERE lead_id = _lead_id
     AND status IN ('queued','calling','callback')
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.call_queue_items
       SET assigned_agent_id = COALESCE(_agent_id, assigned_agent_id),
           campaign_id = COALESCE(_campaign_id, campaign_id),
           lead_status = COALESCE(v_status, lead_status),
           notes = COALESCE(_notes, notes),
           priority = GREATEST(priority, v_priority)
     WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.call_queue_items(
    lead_id, campaign_id, assigned_agent_id, lead_status, source, notes, priority
  )
  VALUES (_lead_id, _campaign_id, _agent_id, v_status, COALESCE(_source, 'manual'), _notes, v_priority)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_formal_lead_for_call_queue(uuid, uuid, uuid, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_formal_lead_for_call_queue(uuid, uuid, uuid, text, text, text, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) create_lead_draft: enqueue cold-pool / telephony leads
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_lead_draft(_data jsonb)
RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.leads;
  v_counselor uuid;
BEGIN
  PERFORM public._assert_can_manage_leads(uid);

  v_counselor := COALESCE(
    NULLIF(_data ->> 'assigned_counselor_id', '')::uuid,
    uid
  );

  INSERT INTO public.leads (
    lead_type, lead_temperature, status, is_cold_pool,
    first_name, middle_name, last_name, email, phone, phone_country_code,
    gender, marital_status, country_of_citizenship, country_of_residence,
    interested_countries, coaching_services, visa_services, admission_services, allied_services,
    travel_financial_services,
    visa_locked, visa_lock_reason, last_education, last_education_other,
    education_history,
    english_test, english_test_status, english_overall, english_test_date, english_test_expiry,
    english_sections, other_tests, work_experience, language_tests,
    start_timeline, sponsor, sponsor_other, has_budget, budget_currency, budget_min, budget_max,
    lead_source, branch, department, cold_pool_campaign, notes,
    next_followup_at, followup_channel, followup_note,
    created_by, assigned_counselor_id
  ) VALUES (
    COALESCE(NULLIF(_data ->> 'lead_type', ''), 'warm'),
    COALESCE(NULLIF(_data ->> 'lead_temperature', ''), 'warm'),
    COALESCE(NULLIF(_data ->> 'status', ''), 'new'),
    COALESCE((_data ->> 'is_cold_pool')::boolean, false),
    COALESCE(_data ->> 'first_name', ''),
    NULLIF(_data ->> 'middle_name', ''),
    COALESCE(_data ->> 'last_name', ''),
    NULLIF(_data ->> 'email', ''),
    NULLIF(_data ->> 'phone', ''),
    NULLIF(_data ->> 'phone_country_code', ''),
    NULLIF(_data ->> 'gender', ''),
    NULLIF(_data ->> 'marital_status', ''),
    NULLIF(_data ->> 'country_of_citizenship', ''),
    NULLIF(_data ->> 'country_of_residence', ''),
    public._lead_json_text_array(_data, 'interested_countries'),
    public._lead_json_text_array(_data, 'coaching_services'),
    public._lead_json_text_array(_data, 'visa_services'),
    public._lead_json_text_array(_data, 'admission_services'),
    public._lead_json_text_array(_data, 'allied_services'),
    COALESCE(
      public._lead_json_text_array(_data, 'travel_financial_services'),
      public._lead_json_text_array(_data, 'travel_services'),
      '{}'::text[]
    ),
    COALESCE((_data ->> 'visa_locked')::boolean, false),
    NULLIF(_data ->> 'visa_lock_reason', ''),
    NULLIF(_data ->> 'last_education', ''),
    NULLIF(_data ->> 'last_education_other', ''),
    COALESCE(_data -> 'education_history', '[]'::jsonb),
    NULLIF(_data ->> 'english_test', ''),
    NULLIF(_data ->> 'english_test_status', ''),
    NULLIF(_data ->> 'english_overall', ''),
    NULLIF(_data ->> 'english_test_date', '')::date,
    NULLIF(_data ->> 'english_test_expiry', '')::date,
    COALESCE(_data -> 'english_sections', '{}'::jsonb),
    COALESCE(_data -> 'other_tests', '[]'::jsonb),
    COALESCE(_data -> 'work_experience', '[]'::jsonb),
    COALESCE(_data -> 'language_tests', '{}'::jsonb),
    NULLIF(_data ->> 'start_timeline', ''),
    NULLIF(_data ->> 'sponsor', ''),
    NULLIF(_data ->> 'sponsor_other', ''),
    NULLIF(_data ->> 'has_budget', ''),
    COALESCE(NULLIF(_data ->> 'budget_currency', ''), 'INR'),
    NULLIF(_data ->> 'budget_min', '')::numeric,
    NULLIF(_data ->> 'budget_max', '')::numeric,
    NULLIF(_data ->> 'lead_source', ''),
    NULLIF(_data ->> 'branch', ''),
    NULLIF(_data ->> 'department', ''),
    NULLIF(_data ->> 'cold_pool_campaign', ''),
    NULLIF(_data ->> 'notes', ''),
    NULLIF(_data ->> 'next_followup_at', '')::timestamptz,
    NULLIF(_data ->> 'followup_channel', ''),
    NULLIF(_data ->> 'followup_note', ''),
    uid,
    v_counselor
  )
  RETURNING * INTO rec;

  IF rec.is_cold_pool OR rec.lead_type = 'cold' THEN
    PERFORM public.enqueue_formal_lead_for_call_queue(
      rec.id,
      NULL,
      NULL,
      rec.lead_temperature,
      'crm',
      rec.notes,
      NULL
    );
  END IF;

  RETURN rec;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) CSV import → formal leads table + queue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_lead(
  _full_name text, _phone text, _email text DEFAULT NULL,
  _country text DEFAULT 'India', _service text DEFAULT 'Student Visa (SDS)',
  _academics text DEFAULT NULL, _ielts text DEFAULT NULL,
  _lead_status text DEFAULT 'warm',
  _assigned_telecaller_email text DEFAULT NULL,
  _assigned_counselor_email text DEFAULT NULL,
  _campaign_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL,
  _dedupe_action text DEFAULT 'skip'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  lid uuid;
  existing_id uuid;
  tc_user uuid;
  co_user uuid;
  tc_agent uuid;
  status_text text := 'created';
  v_first text;
  v_last text;
  v_parts text[];
  v_temp text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  IF NOT (public.has_role(uid,'admin'::app_role) OR public.has_role(uid,'counselor'::app_role)) THEN
    RAISE EXCEPTION 'Only admins or counselors can import leads' USING ERRCODE='42501';
  END IF;
  IF _phone IS NULL OR length(btrim(_phone))<6 THEN
    RAISE EXCEPTION 'Phone required' USING ERRCODE='22023';
  END IF;

  SELECT id INTO existing_id FROM public.leads
   WHERE phone = btrim(_phone)
      OR (NULLIF(_email,'') IS NOT NULL AND lower(email)=lower(_email))
   ORDER BY created_at ASC LIMIT 1;

  IF existing_id IS NOT NULL AND _dedupe_action = 'skip' THEN
    RETURN jsonb_build_object('lead_id', existing_id, 'status', 'skipped');
  END IF;

  v_parts := regexp_split_to_array(btrim(COALESCE(_full_name, '')), '\s+');
  v_first := COALESCE(v_parts[1], 'Lead');
  v_last := CASE WHEN array_length(v_parts, 1) > 1
    THEN array_to_string(v_parts[2:array_length(v_parts, 1)], ' ')
    ELSE '—' END;

  v_temp := CASE lower(COALESCE(_lead_status, 'warm'))
    WHEN 'hot' THEN 'hot'
    WHEN 'cold' THEN 'cold'
    WHEN 'not_interested' THEN 'cold'
    ELSE 'warm' END;

  IF _assigned_counselor_email IS NOT NULL THEN
    SELECT id INTO co_user FROM public.profiles WHERE lower(email)=lower(_assigned_counselor_email) LIMIT 1;
  END IF;

  IF existing_id IS NULL THEN
    INSERT INTO public.leads(
      lead_type, lead_temperature, status, is_cold_pool,
      first_name, last_name, email, phone,
      country_of_residence, interested_countries, visa_services,
      last_education, english_overall, notes, lead_source,
      created_by, assigned_counselor_id
    )
    VALUES (
      v_temp, v_temp, 'new', true,
      v_first, v_last, NULLIF(_email,''), btrim(_phone),
      _country, ARRAY[_country]::text[], ARRAY[_service]::text[],
      _academics, _ielts, COALESCE(_notes, ''),
      'csv_import', uid, co_user
    )
    RETURNING id INTO lid;
  ELSE
    lid := existing_id;
    IF _dedupe_action IN ('update','merge') THEN
      UPDATE public.leads SET
        first_name = COALESCE(NULLIF(v_first,''), first_name),
        last_name = COALESCE(NULLIF(v_last,''), last_name),
        email = COALESCE(NULLIF(_email,''), email),
        country_of_residence = COALESCE(NULLIF(_country,''), country_of_residence),
        interested_countries = CASE
          WHEN _country IS NOT NULL AND NOT (_country = ANY(COALESCE(interested_countries, '{}'::text[])))
            THEN array_append(COALESCE(interested_countries, '{}'::text[]), _country)
          ELSE interested_countries END,
        assigned_counselor_id = COALESCE(co_user, assigned_counselor_id),
        notes = CASE WHEN _dedupe_action='merge'
          THEN COALESCE(notes,'') || E'\n' || COALESCE(_notes,'')
          ELSE COALESCE(NULLIF(_notes,''), notes) END,
        updated_at = now()
      WHERE id = lid;
      status_text := 'updated';
    END IF;
  END IF;

  IF co_user IS NOT NULL AND existing_id IS NULL THEN
    UPDATE public.leads SET assigned_counselor_id = co_user WHERE id = lid AND assigned_counselor_id IS NULL;
  END IF;

  IF _assigned_telecaller_email IS NOT NULL THEN
    SELECT id INTO tc_user FROM public.profiles WHERE lower(email)=lower(_assigned_telecaller_email) LIMIT 1;
    IF tc_user IS NOT NULL THEN
      SELECT id INTO tc_agent FROM public.telephony_agents WHERE user_id = tc_user LIMIT 1;
    END IF;
  END IF;

  PERFORM public.enqueue_formal_lead_for_call_queue(
    lid, _campaign_id, tc_agent, COALESCE(_lead_status,'warm'), 'csv', _notes, NULL
  );

  RETURN jsonb_build_object('lead_id', lid, 'status', status_text);
END $$;

-- ---------------------------------------------------------------------------
-- 6) distribute_leads: formal leads + legacy clients
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.distribute_leads(_lead_ids uuid[], _rule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); rule public.distribution_rules; members uuid[];
  member_count int; i int := 0; cid uuid; picked uuid; agent_id uuid;
  per_user jsonb := '{}'::jsonb; cnt int; perm public.client_permission;
  is_formal boolean;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  SELECT * INTO rule FROM public.distribution_rules WHERE id=_rule_id AND active;
  IF rule.id IS NULL THEN RAISE EXCEPTION 'Rule not found or inactive'; END IF;
  perm := CASE WHEN rule.target_role = 'counselor' THEN 'full'::public.client_permission
               ELSE 'edit'::public.client_permission END;
  SELECT COALESCE(array_agg(user_id ORDER BY created_at), ARRAY[]::uuid[]) INTO members
    FROM public.distribution_rule_members WHERE rule_id=_rule_id;
  member_count := COALESCE(array_length(members,1),0);
  IF member_count = 0 THEN RAISE EXCEPTION 'No members in rule'; END IF;
  FOREACH cid IN ARRAY _lead_ids LOOP
    IF rule.mode = 'random' THEN picked := members[1 + floor(random()*member_count)::int];
    ELSE picked := members[1 + (i % member_count)]; END IF;

    SELECT EXISTS (SELECT 1 FROM public.leads WHERE id = cid) INTO is_formal;

    IF is_formal THEN
      IF rule.target_role = 'counselor' THEN
        UPDATE public.leads SET assigned_counselor_id = picked WHERE id = cid;
      ELSE
        PERFORM public.enqueue_formal_lead_for_call_queue(cid);
        SELECT id INTO agent_id FROM public.telephony_agents WHERE user_id=picked LIMIT 1;
        UPDATE public.call_queue_items SET assigned_agent_id = agent_id
         WHERE lead_id=cid AND status IN ('queued','callback');
      END IF;
    ELSE
      INSERT INTO public.client_access(client_id, user_id, permission, granted_by)
        VALUES (cid, picked, perm, uid)
        ON CONFLICT (client_id, user_id) WHERE user_id IS NOT NULL
        DO UPDATE SET permission=EXCLUDED.permission, revoked_at=NULL;
      IF rule.target_role = 'telecaller' THEN
        SELECT id INTO agent_id FROM public.telephony_agents WHERE user_id=picked LIMIT 1;
        UPDATE public.call_queue_items SET assigned_agent_id = agent_id
         WHERE client_id=cid AND status IN ('queued','callback');
      END IF;
    END IF;

    cnt := COALESCE((per_user->>picked::text)::int,0) + 1;
    per_user := per_user || jsonb_build_object(picked::text, cnt);
    i := i + 1;
  END LOOP;
  INSERT INTO public.distribution_runs(rule_id, executed_by, lead_count, summary)
    VALUES (_rule_id, uid, array_length(_lead_ids,1), per_user);
  INSERT INTO public.activity_logs(user_id, action, entity_type, details)
    VALUES (uid, 'leads.distributed', 'distribution_rule',
            jsonb_build_object('rule_id',_rule_id,'count',array_length(_lead_ids,1),'per_user',per_user,'role',rule.target_role));
  RETURN jsonb_build_object('per_user', per_user, 'total', array_length(_lead_ids,1), 'role', rule.target_role);
END $function$;

-- ---------------------------------------------------------------------------
-- 7) Reporting views — funnel uses formal leads; counselor uses assigned_counselor_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_lead_funnel WITH (security_invoker=on) AS
SELECT coalesce(lead_temperature, 'unset') AS temperature,
       coalesce(status::text, 'new') AS stage,
       count(*) AS leads
  FROM public.leads
 WHERE converted_to_client_id IS NULL
   AND status NOT IN ('lost', 'unqualified')
 GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.vw_counselor_productivity WITH (security_invoker=on) AS
SELECT p.id AS user_id, coalesce(p.full_name,p.email,'Counselor') AS name,
       count(DISTINCT lh.id) FILTER (WHERE lh.to_user=p.id AND lh.status='accepted') AS handoffs_accepted,
       count(DISTINCT t.id) FILTER (WHERE t.assigned_to=p.id AND t.status='done') AS tasks_done,
       count(DISTINCT c.id) FILTER (
         WHERE coalesce(c.assigned_counselor_id, c.owner_id) = p.id
           AND c.status IN ('enrolled','visa_approved')
       ) AS enrollments
  FROM public.profiles p
  LEFT JOIN public.lead_handoffs lh ON lh.to_user=p.id
  LEFT JOIN public.client_tasks t ON t.assigned_to=p.id
  LEFT JOIN public.clients c ON coalesce(c.assigned_counselor_id, c.owner_id) = p.id
 GROUP BY p.id, p.full_name, p.email;

-- ---------------------------------------------------------------------------
-- 8) client profile sync trigger — watch english_test_status + language_tests
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS clients_sync_client_profile ON public.clients;

CREATE TRIGGER clients_sync_client_profile
  AFTER INSERT OR UPDATE OF
    date_of_birth, gender, marital_status, country_of_citizenship, country_of_residence,
    passport_number, passport_expiry, last_education, institution_name, year_of_passing,
    percentage_cgpa, sponsor, sponsor_other, start_timeline, has_budget, budget_currency,
    budget_min, budget_max, interested_countries, lead_source, counselor_notes,
    english_test, english_test_status, english_overall, english_test_date, english_test_expiry,
    english_sections, other_tests, education_history, work_experience, language_tests
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_client_profile_from_client();

NOTIFY pgrst, 'reload schema';
