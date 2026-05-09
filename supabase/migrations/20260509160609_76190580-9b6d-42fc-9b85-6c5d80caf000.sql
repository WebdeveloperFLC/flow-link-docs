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
     AND lower(COALESCE(remark,'')) ~ '(interested|hot|ready|enroll)';
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