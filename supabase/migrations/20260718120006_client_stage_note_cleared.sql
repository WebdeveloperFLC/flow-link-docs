-- Allow note_cleared audit action when staff resolves a stage note.

ALTER TABLE public.client_stage_completion_log
  DROP CONSTRAINT IF EXISTS client_stage_completion_log_action_check;

ALTER TABLE public.client_stage_completion_log
  ADD CONSTRAINT client_stage_completion_log_action_check
  CHECK (action IN ('tick', 'untick', 'note_cleared'));
