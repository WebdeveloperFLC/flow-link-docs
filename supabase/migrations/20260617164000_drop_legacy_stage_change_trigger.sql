-- Legacy fn_on_stage_change duplicated client_stage_history rows (empty metadata {}).
-- Superseded by trg_log_client_stage_change from 20260617160000_stage_history_and_portal_unify.sql.

DROP TRIGGER IF EXISTS trg_on_stage_change ON public.clients;

-- Remove empty duplicate rows where the new trigger already logged the same change.
DELETE FROM public.client_stage_history empty_row
WHERE empty_row.metadata = '{}'::jsonb
  AND EXISTS (
    SELECT 1
    FROM public.client_stage_history good_row
    WHERE good_row.client_id = empty_row.client_id
      AND good_row.stage_id = empty_row.stage_id
      AND good_row.entered_at = empty_row.entered_at
      AND good_row.metadata <> '{}'::jsonb
  );
