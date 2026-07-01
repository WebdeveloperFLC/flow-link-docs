-- Phase 3 F3.4: RLS remediation on commission financial tables
-- EXTEND two-tier RLS with institution scope + accounting entity/country scope.
-- Split SELECT vs mutate; remove FOR ALL policies that granted write to view-only users.
-- Policies apply only to tables that exist (Phase 2B aggregator tables may be unpublished).

-- ---------------------------------------------------------------------------
-- Scope helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.commission_institution_country_iso(_institution_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT c.iso_alpha2
      FROM public.upi_institutions i
      JOIN public.upi_countries c ON c.id = i.country_id
      WHERE i.id = _institution_id
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.accounting_user_scoped_institution(
  _uid uuid,
  _institution_id uuid,
  _require_edit boolean
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _institution_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.accounting_users au
      JOIN public.accounting_user_entity_scope s ON s.accounting_user_id = au.id
      WHERE au.auth_user_id = _uid
        AND au.status = 'ACTIVE'
        AND (
          (_require_edit AND s.can_edit)
          OR (NOT _require_edit AND s.can_view)
        )
        AND (
          (
            s.scope_type = 'country'
            AND s.country_code = public.commission_institution_country_iso(_institution_id)
          )
          OR (
            s.scope_type = 'entity'
            AND EXISTS (
              SELECT 1
              FROM public.accounting_entities ae
              WHERE ae.id = s.entity_id
                AND COALESCE(ae.is_active, true)
                AND (
                  ae.country IS NULL
                  OR ae.country = public.commission_institution_country_iso(_institution_id)
                )
            )
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_commission_financial(_uid uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_uid, 'admin'::app_role)
    OR public.is_commission_admin(_uid)
    OR public.user_has_module(_uid, 'commissions', 'view')
    OR public.user_has_module(_uid, 'commissions', 'edit')
    OR public.is_accounting_admin(_uid)
    OR (
      public.is_accounting_user(_uid)
      AND NOT public.is_accounting_admin(_uid)
      AND public.accounting_user_scoped_institution(_uid, _institution_id, false)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_commission_financial(_uid uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_uid, 'admin'::app_role)
    OR public.is_commission_admin(_uid)
    OR public.user_has_module(_uid, 'commissions', 'edit')
    OR public.is_accounting_admin(_uid)
    OR (
      public.is_accounting_user(_uid)
      AND NOT public.is_accounting_admin(_uid)
      AND public.accounting_user_scoped_institution(_uid, _institution_id, true)
    );
$$;

CREATE OR REPLACE FUNCTION public.commission_receipt_scope_institution_id(_receipt_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(r.context_institution_id, r.institution_id)
  FROM public.upi_commission_receipts r
  WHERE r.id = _receipt_id;
$$;

GRANT EXECUTE ON FUNCTION public.commission_institution_country_iso(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounting_user_scoped_institution(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_commission_financial(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_commission_financial(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commission_receipt_scope_institution_id(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Drop existing policies on financial tables that exist (clean re-apply)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
  t text;
  financial_tables text[] := ARRAY[
    'upi_commission_students', 'upi_commission_invoices', 'upi_claim_cycles',
    'upi_invoice_line_items', 'upi_invoices',
    'upi_billing_profiles', 'upi_commission_eligibility_configs',
    'upi_commission_snapshots', 'upi_commission_transfer_events',
    'upi_commission_remittance_batches', 'upi_commission_receipts',
    'upi_commission_receipt_invoice_allocations',
    'upi_commission_receipt_student_allocations',
    'upi_commission_receipt_attachments',
    'upi_commission_aggregator_invoices', 'upi_commission_aggregator_invoice_lines'
  ];
BEGIN
  FOREACH t IN ARRAY financial_tables LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;
    FOR r IN
      SELECT pol.polname
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.polname, t);
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Direct institution_id tables — standard 4-policy pattern (existing tables only)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  inst_tables text[] := ARRAY[
    'upi_commission_students', 'upi_commission_invoices', 'upi_claim_cycles',
    'upi_invoices', 'upi_billing_profiles', 'upi_commission_eligibility_configs',
    'upi_commission_remittance_batches', 'upi_commission_aggregator_invoice_lines'
  ];
BEGIN
  FOREACH t IN ARRAY inst_tables LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'F3.4 skip (table missing): %', t;
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS uc_fin_%s_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS uc_fin_%s_insert ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS uc_fin_%s_update ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS uc_fin_%s_delete ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY uc_fin_%s_select ON public.%I FOR SELECT TO authenticated USING (public.can_view_commission_financial(auth.uid(), institution_id))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY uc_fin_%s_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage_commission_financial(auth.uid(), institution_id))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY uc_fin_%s_update ON public.%I FOR UPDATE TO authenticated USING (public.can_manage_commission_financial(auth.uid(), institution_id)) WITH CHECK (public.can_manage_commission_financial(auth.uid(), institution_id))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY uc_fin_%s_delete ON public.%I FOR DELETE TO authenticated USING (public.can_manage_commission_financial(auth.uid(), institution_id))',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Table-specific policies (existing tables only)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.upi_commission_snapshots') IS NOT NULL THEN
    CREATE POLICY uc_fin_upi_commission_snapshots_select ON public.upi_commission_snapshots
      FOR SELECT TO authenticated
      USING (public.can_view_commission_financial(auth.uid(), institution_id));
    CREATE POLICY uc_fin_upi_commission_snapshots_insert ON public.upi_commission_snapshots
      FOR INSERT TO authenticated
      WITH CHECK (public.can_manage_commission_financial(auth.uid(), institution_id));
  END IF;

  IF to_regclass('public.upi_commission_receipts') IS NOT NULL THEN
    CREATE POLICY uc_fin_upi_commission_receipts_select ON public.upi_commission_receipts
      FOR SELECT TO authenticated
      USING (
        public.can_view_commission_financial(
          auth.uid(),
          COALESCE(context_institution_id, institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_commission_receipts_insert ON public.upi_commission_receipts
      FOR INSERT TO authenticated
      WITH CHECK (
        public.can_manage_commission_financial(
          auth.uid(),
          COALESCE(context_institution_id, institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_commission_receipts_update ON public.upi_commission_receipts
      FOR UPDATE TO authenticated
      USING (
        public.can_manage_commission_financial(
          auth.uid(),
          COALESCE(context_institution_id, institution_id)
        )
      )
      WITH CHECK (
        public.can_manage_commission_financial(
          auth.uid(),
          COALESCE(context_institution_id, institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_commission_receipts_delete ON public.upi_commission_receipts
      FOR DELETE TO authenticated
      USING (
        public.can_manage_commission_financial(
          auth.uid(),
          COALESCE(context_institution_id, institution_id)
        )
      );
  END IF;

  IF to_regclass('public.upi_invoice_line_items') IS NOT NULL THEN
    CREATE POLICY uc_fin_upi_invoice_line_items_select ON public.upi_invoice_line_items
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_invoices inv
          WHERE inv.id = upi_invoice_line_items.invoice_id
            AND public.can_view_commission_financial(auth.uid(), inv.institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_invoice_line_items_insert ON public.upi_invoice_line_items
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_invoices inv
          WHERE inv.id = upi_invoice_line_items.invoice_id
            AND public.can_manage_commission_financial(auth.uid(), inv.institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_invoice_line_items_update ON public.upi_invoice_line_items
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_invoices inv
          WHERE inv.id = upi_invoice_line_items.invoice_id
            AND public.can_manage_commission_financial(auth.uid(), inv.institution_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_invoices inv
          WHERE inv.id = upi_invoice_line_items.invoice_id
            AND public.can_manage_commission_financial(auth.uid(), inv.institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_invoice_line_items_delete ON public.upi_invoice_line_items
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_invoices inv
          WHERE inv.id = upi_invoice_line_items.invoice_id
            AND public.can_manage_commission_financial(auth.uid(), inv.institution_id)
        )
      );
  END IF;

  IF to_regclass('public.upi_commission_transfer_events') IS NOT NULL THEN
    CREATE POLICY uc_fin_upi_commission_transfer_events_select ON public.upi_commission_transfer_events
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_transfer_events.source_student_commission_id
            AND public.can_view_commission_financial(auth.uid(), s.institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_commission_transfer_events_insert ON public.upi_commission_transfer_events
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_transfer_events.source_student_commission_id
            AND public.can_manage_commission_financial(auth.uid(), s.institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_commission_transfer_events_update ON public.upi_commission_transfer_events
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_transfer_events.source_student_commission_id
            AND public.can_manage_commission_financial(auth.uid(), s.institution_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_transfer_events.source_student_commission_id
            AND public.can_manage_commission_financial(auth.uid(), s.institution_id)
        )
      );
    CREATE POLICY uc_fin_upi_commission_transfer_events_delete ON public.upi_commission_transfer_events
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_transfer_events.source_student_commission_id
            AND public.can_manage_commission_financial(auth.uid(), s.institution_id)
        )
      );
  END IF;

  IF to_regclass('public.upi_commission_receipt_invoice_allocations') IS NOT NULL THEN
    CREATE POLICY uc_fin_ucria_select ON public.upi_commission_receipt_invoice_allocations
      FOR SELECT TO authenticated
      USING (
        public.can_view_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
        OR EXISTS (
          SELECT 1 FROM public.upi_commission_invoices inv
          WHERE inv.id = upi_commission_receipt_invoice_allocations.invoice_id
            AND public.can_view_commission_financial(auth.uid(), inv.institution_id)
        )
      );
    CREATE POLICY uc_fin_ucria_insert ON public.upi_commission_receipt_invoice_allocations
      FOR INSERT TO authenticated
      WITH CHECK (
        public.can_manage_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      );
    CREATE POLICY uc_fin_ucria_update ON public.upi_commission_receipt_invoice_allocations
      FOR UPDATE TO authenticated
      USING (
        public.can_manage_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      )
      WITH CHECK (
        public.can_manage_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      );
    CREATE POLICY uc_fin_ucria_delete ON public.upi_commission_receipt_invoice_allocations
      FOR DELETE TO authenticated
      USING (
        public.can_manage_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      );
  END IF;

  IF to_regclass('public.upi_commission_receipt_student_allocations') IS NOT NULL THEN
    CREATE POLICY uc_fin_ucrsa_select ON public.upi_commission_receipt_student_allocations
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_receipt_student_allocations.student_commission_id
            AND public.can_view_commission_financial(auth.uid(), s.institution_id)
        )
      );
    CREATE POLICY uc_fin_ucrsa_insert ON public.upi_commission_receipt_student_allocations
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_receipt_student_allocations.student_commission_id
            AND public.can_manage_commission_financial(auth.uid(), s.institution_id)
        )
      );
    CREATE POLICY uc_fin_ucrsa_update ON public.upi_commission_receipt_student_allocations
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_receipt_student_allocations.student_commission_id
            AND public.can_manage_commission_financial(auth.uid(), s.institution_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_receipt_student_allocations.student_commission_id
            AND public.can_manage_commission_financial(auth.uid(), s.institution_id)
        )
      );
    CREATE POLICY uc_fin_ucrsa_delete ON public.upi_commission_receipt_student_allocations
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.upi_commission_students s
          WHERE s.id = upi_commission_receipt_student_allocations.student_commission_id
            AND public.can_manage_commission_financial(auth.uid(), s.institution_id)
        )
      );
  END IF;

  IF to_regclass('public.upi_commission_receipt_attachments') IS NOT NULL THEN
    CREATE POLICY uc_fin_ucra_select ON public.upi_commission_receipt_attachments
      FOR SELECT TO authenticated
      USING (
        public.can_view_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      );
    CREATE POLICY uc_fin_ucra_insert ON public.upi_commission_receipt_attachments
      FOR INSERT TO authenticated
      WITH CHECK (
        public.can_manage_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      );
    CREATE POLICY uc_fin_ucra_update ON public.upi_commission_receipt_attachments
      FOR UPDATE TO authenticated
      USING (
        public.can_manage_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      )
      WITH CHECK (
        public.can_manage_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      );
    CREATE POLICY uc_fin_ucra_delete ON public.upi_commission_receipt_attachments
      FOR DELETE TO authenticated
      USING (
        public.can_manage_commission_financial(
          auth.uid(),
          public.commission_receipt_scope_institution_id(receipt_id)
        )
      );
  END IF;

  IF to_regclass('public.upi_commission_aggregator_invoices') IS NOT NULL THEN
    IF to_regclass('public.upi_commission_aggregator_invoice_lines') IS NOT NULL THEN
      CREATE POLICY uc_fin_ucai_select ON public.upi_commission_aggregator_invoices
        FOR SELECT TO authenticated
        USING (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR public.is_commission_admin(auth.uid())
          OR public.is_accounting_admin(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.upi_commission_aggregator_invoice_lines l
            WHERE l.aggregator_invoice_id = upi_commission_aggregator_invoices.id
              AND public.can_view_commission_financial(auth.uid(), l.institution_id)
          )
        );
    ELSE
      CREATE POLICY uc_fin_ucai_select ON public.upi_commission_aggregator_invoices
        FOR SELECT TO authenticated
        USING (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR public.is_commission_admin(auth.uid())
          OR public.is_accounting_admin(auth.uid())
          OR public.user_has_module(auth.uid(), 'commissions', 'view')
          OR public.user_has_module(auth.uid(), 'commissions', 'edit')
        );
    END IF;

    CREATE POLICY uc_fin_ucai_insert ON public.upi_commission_aggregator_invoices
      FOR INSERT TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.is_commission_admin(auth.uid())
        OR public.is_accounting_admin(auth.uid())
        OR public.user_has_module(auth.uid(), 'commissions', 'edit')
      );
    CREATE POLICY uc_fin_ucai_update ON public.upi_commission_aggregator_invoices
      FOR UPDATE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.is_commission_admin(auth.uid())
        OR public.is_accounting_admin(auth.uid())
        OR public.user_has_module(auth.uid(), 'commissions', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.is_commission_admin(auth.uid())
        OR public.is_accounting_admin(auth.uid())
        OR public.user_has_module(auth.uid(), 'commissions', 'edit')
      );
    CREATE POLICY uc_fin_ucai_delete ON public.upi_commission_aggregator_invoices
      FOR DELETE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.is_commission_admin(auth.uid())
      );
  END IF;
END $$;

COMMENT ON FUNCTION public.can_view_commission_financial(uuid, uuid) IS
  'Phase 3 F3.4: institution-scoped read for commission financial tables.';
COMMENT ON FUNCTION public.can_manage_commission_financial(uuid, uuid) IS
  'Phase 3 F3.4: institution-scoped mutate for commission financial tables.';
