
ALTER TABLE public.distribution_rules
  ADD COLUMN IF NOT EXISTS target_role text NOT NULL DEFAULT 'telecaller'
  CHECK (target_role IN ('telecaller','counselor'));

CREATE OR REPLACE FUNCTION public.distribute_leads(_lead_ids uuid[], _rule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); rule public.distribution_rules; members uuid[];
  member_count int; i int := 0; cid uuid; picked uuid; agent_id uuid;
  per_user jsonb := '{}'::jsonb; cnt int; perm public.client_permission;
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
    INSERT INTO public.client_access(client_id, user_id, permission, granted_by)
      VALUES (cid, picked, perm, uid)
      ON CONFLICT (client_id, user_id) WHERE user_id IS NOT NULL DO UPDATE SET permission=EXCLUDED.permission, revoked_at=NULL;
    IF rule.target_role = 'telecaller' THEN
      SELECT id INTO agent_id FROM public.telephony_agents WHERE user_id=picked LIMIT 1;
      UPDATE public.call_queue_items SET assigned_agent_id = agent_id
       WHERE client_id=cid AND status IN ('queued','callback');
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

DROP POLICY IF EXISTS "remark_presets admin write" ON public.remark_presets;
CREATE POLICY "remark_presets staff insert" ON public.remark_presets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'counselor'::app_role) OR has_role(auth.uid(),'telecaller'::app_role));
CREATE POLICY "remark_presets admin update" ON public.remark_presets
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "remark_presets admin delete" ON public.remark_presets
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
