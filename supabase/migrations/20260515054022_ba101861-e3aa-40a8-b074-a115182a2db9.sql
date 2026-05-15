-- Real accounting users table backed by auth.users
CREATE TABLE public.accounting_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN','FINANCE_ADMIN','ACCOUNTANT','AUDITOR','FINAL_AUDITOR','BRANCH_MANAGER','COMPLIANCE_OFFICER','VIEWER')),
  entity_scope text[] NOT NULL DEFAULT ARRAY['*'],
  mfa_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','INVITED')),
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_users ENABLE ROW LEVEL SECURITY;

-- Admin check: any signed-in user counts as admin while table is empty (bootstrap),
-- otherwise must be active SUPER_ADMIN or FINANCE_ADMIN.
CREATE OR REPLACE FUNCTION public.is_accounting_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid IS NOT NULL AND (
    NOT EXISTS (
      SELECT 1 FROM public.accounting_users
      WHERE role IN ('SUPER_ADMIN','FINANCE_ADMIN') AND status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM public.accounting_users
      WHERE auth_user_id = _uid
        AND role IN ('SUPER_ADMIN','FINANCE_ADMIN')
        AND status = 'ACTIVE'
    )
  )
$$;

CREATE POLICY "Admins or self can read" ON public.accounting_users
  FOR SELECT TO authenticated
  USING (public.is_accounting_admin(auth.uid()) OR auth_user_id = auth.uid());

CREATE POLICY "Admins can insert" ON public.accounting_users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_accounting_admin(auth.uid()));

CREATE POLICY "Admins can update" ON public.accounting_users
  FOR UPDATE TO authenticated
  USING (public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.is_accounting_admin(auth.uid()));

CREATE POLICY "Admins can delete" ON public.accounting_users
  FOR DELETE TO authenticated
  USING (public.is_accounting_admin(auth.uid()));

-- updated_at touch
CREATE TRIGGER trg_accounting_users_touch
  BEFORE UPDATE ON public.accounting_users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();