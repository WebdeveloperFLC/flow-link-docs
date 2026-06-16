-- Per-service-case outcomes and reapplication lineage (one client, many independent cases).

CREATE TABLE IF NOT EXISTS public.client_service_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_code text NOT NULL,
  pipeline_id uuid REFERENCES public.stage_pipelines(id) ON DELETE SET NULL,
  attempt_number int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  outcome text CHECK (outcome IS NULL OR outcome IN ('approved', 'refused', 'withdrawn')),
  outcome_at timestamptz,
  outcome_by uuid REFERENCES auth.users(id),
  outcome_document_id uuid REFERENCES public.client_documents(id) ON DELETE SET NULL,
  refusal_doc_pending boolean NOT NULL DEFAULT false,
  reapplication_of uuid REFERENCES public.client_service_cases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE (client_id, service_code, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_client_service_cases_client
  ON public.client_service_cases (client_id, service_code, attempt_number DESC);

CREATE TABLE IF NOT EXISTS public.client_case_outcome_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.client_service_cases(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approved', 'refused', 'withdrawn', 'reapply_created', 'refusal_doc_uploaded')),
  note text,
  document_id uuid REFERENCES public.client_documents(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_case_outcome_log_case
  ON public.client_case_outcome_log (case_id, created_at DESC);

ALTER TABLE public.client_service_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_case_outcome_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_service_cases view scoped" ON public.client_service_cases;
CREATE POLICY "client_service_cases view scoped"
  ON public.client_service_cases FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_service_cases edit scoped" ON public.client_service_cases;
CREATE POLICY "client_service_cases edit scoped"
  ON public.client_service_cases FOR ALL TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_case_outcome_log view scoped" ON public.client_case_outcome_log;
CREATE POLICY "client_case_outcome_log view scoped"
  ON public.client_case_outcome_log FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "client_case_outcome_log insert scoped" ON public.client_case_outcome_log;
CREATE POLICY "client_case_outcome_log insert scoped"
  ON public.client_case_outcome_log FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- Scope stage completions to a case (attempt).
ALTER TABLE public.client_stage_completions
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.client_service_cases(id) ON DELETE CASCADE;

ALTER TABLE public.client_stage_completion_log
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.client_service_cases(id) ON DELETE SET NULL;

ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.client_service_cases(id) ON DELETE SET NULL;

-- Backfill one open case per client with an active pipeline.
INSERT INTO public.client_service_cases (client_id, service_code, pipeline_id, attempt_number, status)
SELECT
  c.id,
  COALESCE(
    c.visa_services[1],
    c.coaching_services[1],
    c.admission_services[1],
    c.allied_services[1],
    c.travel_financial_services[1],
    'legacy::Unknown'
  ),
  c.pipeline_id,
  1,
  'open'
FROM public.clients c
WHERE c.pipeline_id IS NOT NULL
ON CONFLICT (client_id, service_code, attempt_number) DO NOTHING;

UPDATE public.client_stage_completions comp
SET case_id = cs.id
FROM public.client_service_cases cs
WHERE comp.case_id IS NULL
  AND comp.client_id = cs.client_id
  AND cs.attempt_number = 1
  AND cs.pipeline_id = (
    SELECT c.pipeline_id FROM public.clients c WHERE c.id = comp.client_id
  );

UPDATE public.client_stage_completion_log log
SET case_id = comp.case_id
FROM public.client_stage_completions comp
WHERE log.case_id IS NULL
  AND log.client_id = comp.client_id
  AND log.stage_id = comp.stage_id
  AND comp.case_id IS NOT NULL;

-- Replace client+stage unique with case+stage when case_id present.
ALTER TABLE public.client_stage_completions
  DROP CONSTRAINT IF EXISTS client_stage_completions_client_id_stage_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_stage_completions_case_stage
  ON public.client_stage_completions (case_id, stage_id)
  WHERE case_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_stage_completions_client_stage_legacy
  ON public.client_stage_completions (client_id, stage_id)
  WHERE case_id IS NULL;

COMMENT ON TABLE public.client_service_cases IS
  'Independent service-case attempts per client. Outcome and journey scoped here, not on clients row.';
COMMENT ON TABLE public.client_case_outcome_log IS
  'Audit log for case outcomes, reapplications, and deferred refusal documents.';
