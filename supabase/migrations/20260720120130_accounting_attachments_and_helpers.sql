-- =====================================================================
-- Phase 1 — Attachments storage + helper RPCs
-- Decision #7: attachment support for trust disbursements, payroll runs,
-- tax remittances and journal reversals. One private bucket, accessible
-- to accounting users. Plus a read-only trust available-balance helper.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'accounting-attachments',
  'accounting-attachments',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS acct_attach_select ON storage.objects;
DROP POLICY IF EXISTS acct_attach_insert ON storage.objects;
DROP POLICY IF EXISTS acct_attach_update ON storage.objects;
DROP POLICY IF EXISTS acct_attach_delete ON storage.objects;

CREATE POLICY acct_attach_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accounting-attachments' AND public.is_accounting_user(auth.uid()));

CREATE POLICY acct_attach_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accounting-attachments' AND public.is_accounting_user(auth.uid()));

CREATE POLICY acct_attach_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'accounting-attachments' AND public.is_accounting_user(auth.uid()))
  WITH CHECK (bucket_id = 'accounting-attachments' AND public.is_accounting_user(auth.uid()));

CREATE POLICY acct_attach_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'accounting-attachments' AND public.is_accounting_admin(auth.uid()));

-- ── Read-only trust available balance helper ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trust_available_balance(
  p_client_id UUID,
  p_role_key  TEXT,
  p_entity_id TEXT,
  p_currency  TEXT DEFAULT 'CAD'
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT balance FROM public.accounting_trust_accounts
      WHERE client_id = p_client_id
        AND role_key  = p_role_key
        AND entity_id = p_entity_id
        AND currency  = p_currency
      LIMIT 1), 0);
$$;

GRANT EXECUTE ON FUNCTION public.fn_trust_available_balance(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_trust_available_balance(UUID, TEXT, TEXT, TEXT) TO service_role;
