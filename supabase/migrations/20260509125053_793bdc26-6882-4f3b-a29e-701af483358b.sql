
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS lead_temperature text,
  ADD COLUMN IF NOT EXISTS lead_stage text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS intake text,
  ADD COLUMN IF NOT EXISTS interested_country text,
  ADD COLUMN IF NOT EXISTS interested_course text,
  ADD COLUMN IF NOT EXISTS budget numeric,
  ADD COLUMN IF NOT EXISTS preferred_language text,
  ADD COLUMN IF NOT EXISTS preferred_contact_time text,
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrollment_probability int,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alternate_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS parent_contact text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS lead_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_score_reasons jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_clients_lead_temperature ON public.clients(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_clients_lead_stage ON public.clients(lead_stage);
CREATE INDEX IF NOT EXISTS idx_clients_lead_score ON public.clients(lead_score DESC);

ALTER TABLE public.client_profile
  ADD COLUMN IF NOT EXISTS pte_score numeric,
  ADD COLUMN IF NOT EXISTS duolingo_score numeric,
  ADD COLUMN IF NOT EXISTS gre_score numeric,
  ADD COLUMN IF NOT EXISTS gmat_score numeric,
  ADD COLUMN IF NOT EXISTS toefl_score numeric,
  ADD COLUMN IF NOT EXISTS gap_years int,
  ADD COLUMN IF NOT EXISTS work_experience_years numeric,
  ADD COLUMN IF NOT EXISTS visa_refusal_history boolean,
  ADD COLUMN IF NOT EXISTS passport_available boolean;

CREATE TABLE IF NOT EXISTS public.distribution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('round_robin','random','fixed_qty','team')),
  campaign_id uuid REFERENCES public.call_campaigns(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  fixed_qty int, active boolean NOT NULL DEFAULT true, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.distribution_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rules admin manage" ON public.distribution_rules;
CREATE POLICY "rules admin manage" ON public.distribution_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "rules read auth" ON public.distribution_rules;
CREATE POLICY "rules read auth" ON public.distribution_rules FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS trg_distribution_rules_touch ON public.distribution_rules;
CREATE TRIGGER trg_distribution_rules_touch BEFORE UPDATE ON public.distribution_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.distribution_rule_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.distribution_rules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, weight int NOT NULL DEFAULT 1, daily_cap int,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(rule_id, user_id));
ALTER TABLE public.distribution_rule_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rule members admin" ON public.distribution_rule_members;
CREATE POLICY "rule members admin" ON public.distribution_rule_members FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "rule members read auth" ON public.distribution_rule_members;
CREATE POLICY "rule members read auth" ON public.distribution_rule_members FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.distribution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.distribution_rules(id) ON DELETE SET NULL,
  executed_by uuid, lead_count int NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.distribution_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "runs admin read" ON public.distribution_runs;
CREATE POLICY "runs admin read" ON public.distribution_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.distribute_leads(_lead_ids uuid[], _rule_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); rule public.distribution_rules; members uuid[];
  member_count int; i int := 0; cid uuid; picked uuid; agent_id uuid;
  per_user jsonb := '{}'::jsonb; cnt int;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  SELECT * INTO rule FROM public.distribution_rules WHERE id=_rule_id AND active;
  IF rule.id IS NULL THEN RAISE EXCEPTION 'Rule not found or inactive'; END IF;
  SELECT COALESCE(array_agg(user_id ORDER BY created_at), ARRAY[]::uuid[]) INTO members
    FROM public.distribution_rule_members WHERE rule_id=_rule_id;
  member_count := COALESCE(array_length(members,1),0);
  IF member_count = 0 THEN RAISE EXCEPTION 'No members in rule'; END IF;
  FOREACH cid IN ARRAY _lead_ids LOOP
    IF rule.mode = 'random' THEN picked := members[1 + floor(random()*member_count)::int];
    ELSE picked := members[1 + (i % member_count)]; END IF;
    SELECT id INTO agent_id FROM public.telephony_agents WHERE user_id=picked LIMIT 1;
    INSERT INTO public.client_access(client_id, user_id, permission, granted_by)
      VALUES (cid, picked, 'edit'::client_permission, uid)
      ON CONFLICT (client_id, user_id) WHERE user_id IS NOT NULL DO UPDATE SET revoked_at=NULL;
    UPDATE public.call_queue_items SET assigned_agent_id = agent_id
     WHERE client_id=cid AND status IN ('queued','callback');
    cnt := COALESCE((per_user->>picked::text)::int,0) + 1;
    per_user := per_user || jsonb_build_object(picked::text, cnt);
    i := i + 1;
  END LOOP;
  INSERT INTO public.distribution_runs(rule_id, executed_by, lead_count, summary)
    VALUES (_rule_id, uid, array_length(_lead_ids,1), per_user);
  INSERT INTO public.activity_logs(user_id, action, entity_type, details)
    VALUES (uid, 'leads.distributed', 'distribution_rule',
            jsonb_build_object('rule_id',_rule_id,'count',array_length(_lead_ids,1),'per_user',per_user));
  RETURN jsonb_build_object('per_user', per_user, 'total', array_length(_lead_ids,1));
END $$;

CREATE OR REPLACE FUNCTION public.reassign_leads(_lead_ids uuid[], _to_user uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); agent uuid; cid uuid; n int := 0;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  SELECT id INTO agent FROM public.telephony_agents WHERE user_id=_to_user LIMIT 1;
  FOREACH cid IN ARRAY _lead_ids LOOP
    INSERT INTO public.client_access(client_id, user_id, permission, granted_by)
      VALUES (cid,_to_user,'edit'::client_permission,uid)
      ON CONFLICT (client_id,user_id) WHERE user_id IS NOT NULL DO UPDATE SET revoked_at=NULL;
    UPDATE public.call_queue_items SET assigned_agent_id=agent
     WHERE client_id=cid AND status IN ('queued','callback');
    n := n+1;
  END LOOP;
  INSERT INTO public.activity_logs(user_id, action, entity_type, details)
    VALUES (uid,'leads.reassigned','user', jsonb_build_object('to_user',_to_user,'count',n));
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.fn_recalc_lead_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := NEW.id; score int := 0; reasons jsonb := '[]'::jsonb;
  prof public.client_profile; unanswered int; positive_recent int;
BEGIN
  SELECT * INTO prof FROM public.client_profile WHERE client_id=cid LIMIT 1;
  IF prof.ielts_overall IS NOT NULL AND prof.ielts_overall >= 6.5 THEN
    score := score + 20; reasons := reasons || to_jsonb('IELTS >= 6.5'::text); END IF;
  IF COALESCE(prof.passport_available,false) THEN
    score := score + 15; reasons := reasons || to_jsonb('Passport available'::text); END IF;
  IF NEW.budget IS NOT NULL AND NEW.budget > 0 THEN
    score := score + 10; reasons := reasons || to_jsonb('Budget set'::text); END IF;
  IF NEW.intake IS NOT NULL AND NEW.intake <> '' THEN
    score := score + 5; reasons := reasons || to_jsonb('Intake known'::text); END IF;
  SELECT count(*) INTO unanswered FROM public.call_sessions
   WHERE client_id=cid AND status IN ('failed','no_answer','busy') AND created_at > now()-interval '14 days';
  IF unanswered >= 2 THEN
    score := score - 15; reasons := reasons || to_jsonb('2+ unanswered calls'::text); END IF;
  SELECT count(*) INTO positive_recent FROM public.lead_remarks
   WHERE client_id=cid AND created_at > now()-interval '14 days'
     AND lower(COALESCE(remark_text,'')) ~ '(interested|hot|ready|enroll)';
  IF positive_recent > 0 THEN
    score := score + 15; reasons := reasons || to_jsonb('Recent positive remark'::text); END IF;
  NEW.lead_score := GREATEST(0, LEAST(100, score));
  NEW.lead_score_reasons := reasons;
  IF NEW.lead_temperature IS NULL OR NEW.lead_temperature = '' THEN
    NEW.lead_temperature := CASE WHEN NEW.lead_score >= 70 THEN 'hot'
                                 WHEN NEW.lead_score >= 40 THEN 'warm' ELSE 'cold' END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_clients_lead_score ON public.clients;
CREATE TRIGGER trg_clients_lead_score BEFORE INSERT OR UPDATE OF budget, intake, lead_temperature ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.fn_recalc_lead_score();

CREATE OR REPLACE FUNCTION public.import_lead_v2(payload jsonb, _dedupe text DEFAULT 'skip')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); cid uuid; existing uuid;
  ph text := btrim(coalesce(payload->>'phone',''));
  em text := nullif(payload->>'email','');
  fn text := btrim(coalesce(payload->>'first_name','') || ' ' || coalesce(payload->>'last_name',''));
  status_text text := 'created';
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'counselor'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF length(ph) < 6 THEN RAISE EXCEPTION 'Phone required'; END IF;
  SELECT id INTO existing FROM public.clients
   WHERE phone = ph OR (em IS NOT NULL AND lower(email)=lower(em))
   ORDER BY created_at LIMIT 1;
  IF existing IS NOT NULL AND _dedupe='skip' THEN
    RETURN jsonb_build_object('client_id',existing,'status','skipped'); END IF;
  IF existing IS NULL THEN
    INSERT INTO public.clients(
      full_name, phone, email, country, application_type, owner_id, created_by, notes,
      lead_source, lead_temperature, lead_stage, priority, intake, interested_country,
      interested_course, budget, preferred_language, preferred_contact_time, next_followup_at,
      whatsapp, alternate_phone, parent_contact, timezone, tags
    ) VALUES (
      NULLIF(btrim(fn),''), ph, em,
      COALESCE(NULLIF(payload->>'country',''),'India'),
      COALESCE(NULLIF(payload->>'service_interested',''), NULLIF(payload->>'application_type',''), 'Student Visa (SDS)'),
      uid, uid,
      NULLIF(payload->>'notes',''),
      NULLIF(payload->>'lead_source',''),
      NULLIF(payload->>'lead_temperature',''),
      NULLIF(payload->>'lead_stage',''),
      NULLIF(payload->>'priority',''),
      NULLIF(payload->>'intake',''),
      NULLIF(payload->>'interested_country',''),
      NULLIF(payload->>'interested_course',''),
      NULLIF(payload->>'budget','')::numeric,
      NULLIF(payload->>'preferred_language',''),
      NULLIF(payload->>'preferred_contact_time',''),
      NULLIF(payload->>'next_followup_at','')::timestamptz,
      NULLIF(payload->>'whatsapp',''),
      NULLIF(payload->>'alternate_phone',''),
      NULLIF(payload->>'parent_contact',''),
      NULLIF(payload->>'timezone',''),
      COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(payload->'tags')), '{}')
    ) RETURNING id INTO cid;
    INSERT INTO public.client_profile(client_id, gender, date_of_birth, address_city, address_state,
        nationality, ielts_overall, pte_score, duolingo_score, gre_score, gmat_score, toefl_score,
        gap_years, work_experience_years, visa_refusal_history, passport_available)
    VALUES (cid,
      NULLIF(payload->>'gender',''),
      NULLIF(payload->>'dob','')::date,
      NULLIF(payload->>'city',''),
      NULLIF(payload->>'state',''),
      NULLIF(payload->>'nationality',''),
      NULLIF(payload->>'ielts','')::numeric,
      NULLIF(payload->>'pte','')::numeric,
      NULLIF(payload->>'duolingo','')::numeric,
      NULLIF(payload->>'gre','')::numeric,
      NULLIF(payload->>'gmat','')::numeric,
      NULLIF(payload->>'toefl','')::numeric,
      NULLIF(payload->>'gap_years','')::int,
      NULLIF(payload->>'work_experience','')::numeric,
      CASE WHEN payload->>'visa_refusal_history' IN ('true','yes','1') THEN true
           WHEN payload->>'visa_refusal_history' IN ('false','no','0') THEN false ELSE NULL END,
      CASE WHEN payload->>'passport_available' IN ('true','yes','1') THEN true
           WHEN payload->>'passport_available' IN ('false','no','0') THEN false ELSE NULL END
    ) ON CONFLICT DO NOTHING;
  ELSE
    cid := existing;
    IF _dedupe IN ('update','merge') THEN
      UPDATE public.clients SET
        full_name = COALESCE(NULLIF(btrim(fn),''), full_name),
        email = COALESCE(em, email),
        country = COALESCE(NULLIF(payload->>'country',''), country),
        notes = CASE WHEN _dedupe='merge'
                     THEN COALESCE(notes,'') || E'\n' || COALESCE(payload->>'notes','')
                     ELSE COALESCE(NULLIF(payload->>'notes',''), notes) END,
        lead_source = COALESCE(NULLIF(payload->>'lead_source',''), lead_source),
        intake = COALESCE(NULLIF(payload->>'intake',''), intake),
        interested_country = COALESCE(NULLIF(payload->>'interested_country',''), interested_country),
        interested_course = COALESCE(NULLIF(payload->>'interested_course',''), interested_course),
        budget = COALESCE(NULLIF(payload->>'budget','')::numeric, budget)
      WHERE id = cid;
      status_text := 'updated';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.call_queue_items WHERE client_id=cid AND status IN ('queued','calling','callback')) THEN
    INSERT INTO public.call_queue_items(client_id, lead_status, source, priority)
    VALUES (cid, COALESCE(NULLIF(payload->>'lead_temperature',''),'warm'), 'csv', 50);
  END IF;
  INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
  VALUES (cid, 'note', uid, 'Imported via CSV/XLSX', jsonb_build_object('lead_source', payload->>'lead_source'));
  RETURN jsonb_build_object('client_id', cid, 'status', status_text);
END $$;

CREATE OR REPLACE VIEW public.vw_call_stats_daily WITH (security_invoker=on) AS
SELECT date_trunc('day', start_time)::date AS day, agent_id,
       count(*) FILTER (WHERE status='completed') AS answered,
       count(*) FILTER (WHERE status IN ('failed','no_answer','busy','cancelled')) AS unanswered,
       count(*) AS total_calls,
       coalesce(avg(duration_seconds) FILTER (WHERE status='completed'),0)::int AS avg_duration
  FROM public.call_sessions WHERE start_time IS NOT NULL GROUP BY 1,2;

CREATE OR REPLACE VIEW public.vw_lead_funnel WITH (security_invoker=on) AS
SELECT coalesce(lead_temperature,'unset') AS temperature,
       coalesce(lead_stage, status, 'new') AS stage, count(*) AS leads
  FROM public.clients GROUP BY 1,2;

CREATE OR REPLACE VIEW public.vw_telecaller_productivity WITH (security_invoker=on) AS
SELECT a.user_id, coalesce(p.full_name, p.email, 'Agent') AS name,
       count(DISTINCT cs.id) AS calls,
       coalesce(sum(cs.duration_seconds),0) AS talk_seconds,
       count(DISTINCT cs.id) FILTER (WHERE cs.status='completed') AS answered,
       count(DISTINCT cqi.id) FILTER (WHERE cqi.status='callback') AS callbacks_pending
  FROM public.telephony_agents a
  LEFT JOIN public.profiles p ON p.id=a.user_id
  LEFT JOIN public.call_sessions cs ON cs.agent_id=a.id AND cs.created_at > now()-interval '30 days'
  LEFT JOIN public.call_queue_items cqi ON cqi.assigned_agent_id=a.id
 GROUP BY a.user_id, p.full_name, p.email;

CREATE OR REPLACE VIEW public.vw_counselor_productivity WITH (security_invoker=on) AS
SELECT p.id AS user_id, coalesce(p.full_name,p.email,'Counselor') AS name,
       count(DISTINCT lh.id) FILTER (WHERE lh.to_user=p.id AND lh.status='accepted') AS handoffs_accepted,
       count(DISTINCT t.id) FILTER (WHERE t.assigned_to=p.id AND t.status='done') AS tasks_done,
       count(DISTINCT c.id) FILTER (WHERE c.owner_id=p.id AND c.status IN ('enrolled','visa_approved')) AS enrollments
  FROM public.profiles p
  LEFT JOIN public.lead_handoffs lh ON lh.to_user=p.id
  LEFT JOIN public.client_tasks t ON t.assigned_to=p.id
  LEFT JOIN public.clients c ON c.owner_id=p.id
 GROUP BY p.id, p.full_name, p.email;

CREATE OR REPLACE VIEW public.vw_campaign_performance WITH (security_invoker=on) AS
SELECT cc.id AS campaign_id, cc.name,
       count(DISTINCT cqi.client_id) AS leads,
       count(DISTINCT cqi.client_id) FILTER (WHERE c.lead_temperature='hot') AS hot,
       count(DISTINCT cqi.client_id) FILTER (WHERE c.lead_temperature='warm') AS warm,
       count(DISTINCT cqi.client_id) FILTER (WHERE c.lead_temperature='cold') AS cold,
       count(DISTINCT cqi.client_id) FILTER (WHERE cqi.status='callback') AS callbacks_pending,
       count(DISTINCT c.id) FILTER (WHERE c.status IN ('enrolled','visa_approved')) AS converted
  FROM public.call_campaigns cc
  LEFT JOIN public.call_queue_items cqi ON cqi.campaign_id=cc.id
  LEFT JOIN public.clients c ON c.id=cqi.client_id
 GROUP BY cc.id, cc.name;

CREATE OR REPLACE VIEW public.vw_country_intake_trends WITH (security_invoker=on) AS
SELECT coalesce(interested_country, country, 'Unknown') AS country,
       coalesce(intake,'Unspecified') AS intake, count(*) AS leads
  FROM public.clients GROUP BY 1,2;
