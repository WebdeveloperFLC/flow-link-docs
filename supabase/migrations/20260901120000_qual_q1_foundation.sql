-- Q1 Foundation: qualification anchor, tracks, events scaffold, commission period extension
-- Scope: no commission bridge, no payments, no schedule tables (Q2+)

-- ---------------------------------------------------------------------------
-- M1a: Commission period master extension
-- ---------------------------------------------------------------------------
INSERT INTO public.upi_commission_periods (code, label, description, sort_order) VALUES
  ('deposit', 'Deposit', 'Deposit-stage commission', 35),
  ('semester_3', 'Semester 3', 'Third semester payout', 55)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.qualification_lifecycle_status AS ENUM (
    'DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED', 'REFUSED', 'TRANSFERRED'
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

-- ---------------------------------------------------------------------------
-- M1b: Core qualification anchor
-- ---------------------------------------------------------------------------
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
  transfer_target_case_id uuid REFERENCES public.client_service_cases(id) ON DELETE SET NULL,
  transfer_target_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  qualification_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_application_status public.institution_application_status DEFAULT 'APPLIED',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_client
  ON public.client_institution_qualifications (client_id);

CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_case
  ON public.client_institution_qualifications (client_service_case_id);

CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_institution
  ON public.client_institution_qualifications (institution_id);

CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_status
  ON public.client_institution_qualifications (status);

CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_owner
  ON public.client_institution_qualifications (qualification_owner_user_id);

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
  active_schedule_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qualification_funding_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active boolean NOT NULL DEFAULT true,
  deposit_sources text[] NOT NULL DEFAULT '{}',
  tuition_sources text[] NOT NULL DEFAULT '{}',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualification_funding_plans_active
  ON public.qualification_funding_plans (qualification_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_qualification_deposit_track_qual
  ON public.qualification_deposit_track (qualification_id);

CREATE INDEX IF NOT EXISTS idx_qualification_tuition_track_qual
  ON public.qualification_tuition_track (qualification_id);

-- ---------------------------------------------------------------------------
-- M1c: Event scaffold
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qualification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload_jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualification_events_idempotency
  ON public.qualification_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qualification_events_qual_created
  ON public.qualification_events (qualification_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.qualification_adjustment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL DEFAULT 'placeholder',
  amount numeric(14, 2),
  currency text,
  reason text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qualification_external_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL,
  event_type text NOT NULL,
  external_reference text NOT NULL,
  qualification_id uuid REFERENCES public.client_institution_qualifications(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  payload_jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'matched', 'ignored', 'failed')),
  matched_payment_record_id uuid,
  idempotency_key text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_message text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualification_external_events_idempotency
  ON public.qualification_external_events (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_qualification_external_events_received
  ON public.qualification_external_events (received_at DESC);

COMMENT ON TABLE public.client_institution_qualifications IS
  'Q1 operational SoR anchor for institution deposit/tuition — not commission eligibility.';
COMMENT ON TABLE public.qualification_external_events IS
  'Webhook placeholder (A3). Q1 stub only — no payment auto-creation.';
