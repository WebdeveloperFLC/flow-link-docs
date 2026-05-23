
-- A. Column-level REVOKEs on secret columns
REVOKE SELECT (sbc_password, sbc_user_id) ON public.telephony_agents FROM authenticated;
REVOKE SELECT (password) ON public.smtp_settings FROM authenticated;
REVOKE SELECT (secret, webhook_secret) ON public.telephony_provider_settings FROM authenticated;
REVOKE SELECT (bank_account, bank_swift, bank_ifsc, tax_id) ON public.accounting_vendors FROM authenticated;

-- B. Entity-scoped policies on accounting_bank_accounts
DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_bank_accounts;

CREATE POLICY "bank_accounts_select_entity_scoped"
ON public.accounting_bank_accounts
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.accounting_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.status = 'ACTIVE'
      AND (
        '*' = ANY(au.entity_scope)
        OR accounting_bank_accounts.entity = ANY(au.entity_scope)
      )
  )
);

CREATE POLICY "bank_accounts_modify_entity_scoped"
ON public.accounting_bank_accounts
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.accounting_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.status = 'ACTIVE'
      AND (
        '*' = ANY(au.entity_scope)
        OR accounting_bank_accounts.entity = ANY(au.entity_scope)
      )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.accounting_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.status = 'ACTIVE'
      AND (
        '*' = ANY(au.entity_scope)
        OR accounting_bank_accounts.entity = ANY(au.entity_scope)
      )
  )
);

-- C. Safe vendors view (masks banking fields unless SUPER_ADMIN/FINANCE_ADMIN)
CREATE OR REPLACE VIEW public.accounting_vendors_safe
WITH (security_invoker = true)
AS
SELECT
  v.id, v.name, v.company_name, v.category, v.email, v.phone,
  v.country, v.currency, v.payment_terms, v.bank_name,
  v.linked_coa_id, v.status, v.notes, v.created_by,
  v.created_at, v.updated_at,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.accounting_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('SUPER_ADMIN','FINANCE_ADMIN')
      AND au.status = 'ACTIVE'
  ) THEN v.bank_account ELSE NULL END AS bank_account,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.accounting_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('SUPER_ADMIN','FINANCE_ADMIN')
      AND au.status = 'ACTIVE'
  ) THEN v.bank_swift ELSE NULL END AS bank_swift,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.accounting_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('SUPER_ADMIN','FINANCE_ADMIN')
      AND au.status = 'ACTIVE'
  ) THEN v.bank_ifsc ELSE NULL END AS bank_ifsc,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.accounting_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('SUPER_ADMIN','FINANCE_ADMIN')
      AND au.status = 'ACTIVE'
  ) THEN v.tax_id ELSE NULL END AS tax_id
FROM public.accounting_vendors v;

GRANT SELECT ON public.accounting_vendors_safe TO authenticated;

-- D. Scoped email logs
DROP POLICY IF EXISTS "app_email_logs_staff_read" ON public.app_email_logs;
DROP POLICY IF EXISTS "Admins read app_email_logs" ON public.app_email_logs;

CREATE POLICY "email_logs_select_scoped"
ON public.app_email_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR triggered_by = auth.uid()
);

-- E. Ensure RLS enabled
ALTER TABLE public.accounting_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_vendors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_email_logs           ENABLE ROW LEVEL SECURITY;
