-- CRM release candidate: align call KPI aggregation and create pipeline distribution view.
-- Issue 2: vw_call_stats_daily excluded sessions with NULL start_time (KPI = 0 while productivity = 23).
-- Issue 4: vw_stage_distribution was referenced in app code but never created in repo migrations.

CREATE OR REPLACE VIEW public.vw_call_stats_daily WITH (security_invoker = on) AS
SELECT
  date_trunc('day', COALESCE(start_time, created_at))::date AS day,
  agent_id,
  count(*) FILTER (WHERE status = 'completed') AS answered,
  count(*) FILTER (WHERE status IN ('failed', 'no_answer', 'busy', 'cancelled')) AS unanswered,
  count(*) AS total_calls,
  coalesce(avg(duration_seconds) FILTER (WHERE status = 'completed'), 0)::int AS avg_duration
FROM public.call_sessions
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.vw_stage_distribution WITH (security_invoker = on) AS
SELECT
  sp.id AS pipeline_id,
  sp.name AS pipeline_name,
  sp.country,
  sp.service_category,
  ps.id AS stage_id,
  ps.key AS stage_key,
  ps.label AS stage_label,
  ps.sort_order,
  count(c.id)::int AS client_count
FROM public.stage_pipelines sp
JOIN public.pipeline_stages ps ON ps.pipeline_id = sp.id
LEFT JOIN public.clients c
  ON c.pipeline_id = sp.id
 AND c.current_stage_id = ps.id
WHERE sp.is_active = true
GROUP BY
  sp.id,
  sp.name,
  sp.country,
  sp.service_category,
  ps.id,
  ps.key,
  ps.label,
  ps.sort_order;
