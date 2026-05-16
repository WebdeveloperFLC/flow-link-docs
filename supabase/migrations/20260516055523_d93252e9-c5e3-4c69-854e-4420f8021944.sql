
-- =========================
-- Main CRM module permissions
-- =========================
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (user_id, module)
);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage module permissions"
  ON public.user_module_permissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own module permissions"
  ON public.user_module_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.user_has_module(_uid uuid, _module text, _level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_uid, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_module_permissions p
      WHERE p.user_id = _uid
        AND p.module = _module
        AND CASE _level
              WHEN 'view'   THEN p.can_view
              WHEN 'edit'   THEN p.can_edit
              WHEN 'delete' THEN p.can_delete
              ELSE false
            END
    )
$$;

-- =========================
-- Accounting module permissions
-- =========================
CREATE TABLE IF NOT EXISTS public.accounting_user_module_permissions (
  accounting_user_id uuid NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (accounting_user_id, module)
);

ALTER TABLE public.accounting_user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounting admins manage acct module permissions"
  ON public.accounting_user_module_permissions
  FOR ALL
  USING (public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.is_accounting_admin(auth.uid()));

CREATE POLICY "Acct users read own module permissions"
  ON public.accounting_user_module_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accounting_users au
      WHERE au.id = accounting_user_id
        AND au.auth_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.acct_user_has_module(_uid uuid, _module text, _level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_accounting_admin(_uid)
    OR EXISTS (
      SELECT 1
      FROM public.accounting_user_module_permissions p
      JOIN public.accounting_users au ON au.id = p.accounting_user_id
      WHERE au.auth_user_id = _uid
        AND p.module = _module
        AND CASE _level
              WHEN 'view'   THEN p.can_view
              WHEN 'edit'   THEN p.can_edit
              WHEN 'delete' THEN p.can_delete
              ELSE false
            END
    )
$$;
