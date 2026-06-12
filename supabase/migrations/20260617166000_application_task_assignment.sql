-- Department-scoped application tasks + reminder metadata.
-- Run before deploying enhanced task assignment UI.

ALTER TABLE public.client_tasks
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pipeline_stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS client_tasks_department_idx
  ON public.client_tasks(department_id, status);

CREATE INDEX IF NOT EXISTS client_tasks_due_open_idx
  ON public.client_tasks(due_at, status)
  WHERE status IN ('open', 'in_progress') AND due_at IS NOT NULL;

COMMENT ON COLUMN public.client_tasks.department_id IS
  'Optional department routing — assignee picker filters by this department.';
COMMENT ON COLUMN public.client_tasks.pipeline_stage_id IS
  'Links task to a pipeline stage when created from application workflow.';
COMMENT ON COLUMN public.client_tasks.reminder_sent_at IS
  'Last pre-due reminder sent to assignee (notifications-reminders-tick).';
