-- Application Foundation (Q1): student application anchor, deposit/tuition tracks, timeline events
DO $$ BEGIN
  CREATE TYPE public.qualification_lifecycle_status AS ENUM (
    'DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED', 'REFUSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.institution_application_status AS ENUM (
    'APPLIED', 'OFFER_RECEIVED', 'CONDITIONAL_OFFER', 'UNCONDITIONAL_OFFER', 'LOA_RECEIVED',
    'DEPOSIT_PENDING', 'DEPOSIT_PAID', 'VISA_FILED', 'VISA_APPROVED', 'ENROLLED', 'WITHDRAWN', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.qualification_track_status AS ENUM (
    'NOT_STARTED', 'PARTIAL', 'SATISFIED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.qualification_hold_reason_code AS ENUM (
    'WAITING_TUITION_PAYMENT', 'WAITING_LOAN_APPROVAL', 'WAITING_VISA_RESULT', 'DEFERRED_INTAKE',
    'MEDICAL_ISSUE', 'PERSONAL_REASONS', 'MISSING_INSTITUTION_DOCS', 'OTHER_OPERATIONAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.client_institution_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_service_case_id uuid NOT NULL REFERENCES public.client_service_cases(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE RESTRICT,
  program_name text,
  intake_term text NOT NULL,
  intake_date date,
  status public.qualification_lifecycle_status NOT NULL DEFAULT 'DRAFT',
  status_reason_code text,
  status_reason_notes text,
  hold_reason_code public.qualification_hold_reason_code,
  status_changed_at timestamptz,
  status_changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  qualification_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_application_status public.institution_application_status DEFAULT 'APPLIED',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_client ON public.client_institution_qualifications (client_id);
CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_case ON public.client_institution_qualifications (client_service_case_id);
CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_institution ON public.client_institution_qualifications (institution_id);
CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_status ON public.client_institution_qualifications (status);
CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_owner ON public.client_institution_qualifications (qualification_owner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_institution_qualifications_active_unique
  ON public.client_institution_qualifications (client_id, client_service_case_id, institution_id, intake_term)
  WHERE status IN ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED');

CREATE TABLE IF NOT EXISTS public.qualification_deposit_track (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL UNIQUE REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  required_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (required_amount >= 0),
  due_date date,
  paid_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  outstanding_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0),
  currency text NOT NULL DEFAULT 'CAD',
  status public.qualification_track_status NOT NULL DEFAULT 'NOT_STARTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qualification_tuition_track (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL UNIQUE REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  total_tuition numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_tuition >= 0),
  paid_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  outstanding_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0),
  currency text NOT NULL DEFAULT 'CAD',
  status public.qualification_track_status NOT NULL DEFAULT 'NOT_STARTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualification_deposit_track_qual ON public.qualification_deposit_track (qualification_id);
CREATE INDEX IF NOT EXISTS idx_qualification_tuition_track_qual ON public.qualification_tuition_track (qualification_id);

CREATE TABLE IF NOT EXISTS public.qualification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualification_events_idempotency ON public.qualification_events (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qualification_events_qual_created ON public.qualification_events (qualification_id, created_at DESC);

COMMENT ON TABLE public.client_institution_qualifications IS 'Application Foundation anchor: institution deposit/tuition tracking — not commission eligibility.';
COMMENT ON TABLE public.qualification_events IS 'Application timeline audit log for student applications.';