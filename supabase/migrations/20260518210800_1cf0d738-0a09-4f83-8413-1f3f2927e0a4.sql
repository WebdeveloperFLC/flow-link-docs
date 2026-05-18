
-- Audit log for accounting section permission changes
CREATE TABLE IF NOT EXISTS public.accounting_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_auth_user_id uuid,
  target_accounting_user_id uuid NOT NULL,
  module text NOT NULL,
  action text NOT NULL,         -- 'INSERT' | 'UPDATE' | 'DELETE'
  before jsonb,
  after  jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acct_audit_target
  ON public.accounting_access_audit(target_accounting_user_id, created_at DESC);

ALTER TABLE public.accounting_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acct admins read audit"   ON public.accounting_access_audit;
DROP POLICY IF EXISTS "acct admins insert audit" ON public.accounting_access_audit;

CREATE POLICY "acct admins read audit"
  ON public.accounting_access_audit
  FOR SELECT
  USING (public.is_accounting_admin(auth.uid()));

CREATE POLICY "acct admins insert audit"
  ON public.accounting_access_audit
  FOR INSERT
  WITH CHECK (public.is_accounting_admin(auth.uid()));

-- Trigger function: log changes to accounting_user_module_permissions
CREATE OR REPLACE FUNCTION public.fn_log_acct_perm_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  before_json jsonb;
  after_json  jsonb;
  target uuid;
  mod text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    after_json := jsonb_build_object('can_view', NEW.can_view, 'can_edit', NEW.can_edit, 'can_delete', NEW.can_delete);
    target := NEW.accounting_user_id; mod := NEW.module;
  ELSIF TG_OP = 'UPDATE' THEN
    before_json := jsonb_build_object('can_view', OLD.can_view, 'can_edit', OLD.can_edit, 'can_delete', OLD.can_delete);
    after_json  := jsonb_build_object('can_view', NEW.can_view, 'can_edit', NEW.can_edit, 'can_delete', NEW.can_delete);
    IF before_json = after_json THEN RETURN NEW; END IF;
    target := NEW.accounting_user_id; mod := NEW.module;
  ELSIF TG_OP = 'DELETE' THEN
    before_json := jsonb_build_object('can_view', OLD.can_view, 'can_edit', OLD.can_edit, 'can_delete', OLD.can_delete);
    target := OLD.accounting_user_id; mod := OLD.module;
  END IF;

  INSERT INTO public.accounting_access_audit(actor_auth_user_id, target_accounting_user_id, module, action, before, after)
  VALUES (auth.uid(), target, mod, TG_OP, before_json, after_json);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_acct_perm_audit ON public.accounting_user_module_permissions;
CREATE TRIGGER trg_acct_perm_audit
AFTER INSERT OR UPDATE OR DELETE ON public.accounting_user_module_permissions
FOR EACH ROW EXECUTE FUNCTION public.fn_log_acct_perm_change();
