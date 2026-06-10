-- Sprint 0: RLS for wallet + incentive tables (idempotent policy creation)

-- ── Incentive: admin/manager full; counselors read own targets/line items ───
DO $pol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_plans_admin' AND tablename = 'incentive_plans') THEN
    CREATE POLICY incentive_plans_admin ON public.incentive_plans FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_plans_view' AND tablename = 'incentive_plans') THEN
    CREATE POLICY incentive_plans_view ON public.incentive_plans FOR SELECT TO authenticated
      USING (public.user_has_module(auth.uid(), 'incentives', 'view'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_targets_admin' AND tablename = 'incentive_targets') THEN
    CREATE POLICY incentive_targets_admin ON public.incentive_targets FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_targets_self_view' AND tablename = 'incentive_targets') THEN
    CREATE POLICY incentive_targets_self_view ON public.incentive_targets FOR SELECT TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.user_has_module(auth.uid(), 'incentives', 'view')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_runs_staff' AND tablename = 'incentive_runs') THEN
    CREATE POLICY incentive_runs_staff ON public.incentive_runs FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'view')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_line_items_staff' AND tablename = 'incentive_line_items') THEN
    CREATE POLICY incentive_line_items_staff ON public.incentive_line_items FOR SELECT TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'view')
      );
  END IF;
END
$pol$;

-- ── Wallet: counsellor owns wallet; admin manages all ───────────────────────
DO $pol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discount_wallets_self_select' AND tablename = 'discount_wallets') THEN
    CREATE POLICY discount_wallets_self_select ON public.discount_wallets FOR SELECT TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'discount_wallet', 'view')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discount_wallets_admin_write' AND tablename = 'discount_wallets') THEN
    CREATE POLICY discount_wallets_admin_write ON public.discount_wallets FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'discount_wallet', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'discount_wallet', 'edit')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wallet_allocations_self' AND tablename = 'wallet_allocations') THEN
    CREATE POLICY wallet_allocations_self ON public.wallet_allocations FOR ALL TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wallet_topups_admin' AND tablename = 'wallet_topups') THEN
    CREATE POLICY wallet_topups_admin ON public.wallet_topups FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'discount_wallet', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'discount_wallet', 'edit')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wallet_ledger_read' AND tablename = 'wallet_ledger') THEN
    CREATE POLICY wallet_ledger_read ON public.wallet_ledger FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.discount_wallets dw
           WHERE dw.id = wallet_id
             AND (
               dw.counselor_id = auth.uid()
               OR public.has_role(auth.uid(), 'admin'::public.app_role)
               OR public.has_role(auth.uid(), 'administrator'::public.app_role)
               OR public.has_role(auth.uid(), 'manager'::public.app_role)
             )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wallet_topup_rules_admin' AND tablename = 'wallet_topup_rules') THEN
    CREATE POLICY wallet_topup_rules_admin ON public.wallet_topup_rules FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wallet_settings_admin' AND tablename = 'wallet_settings') THEN
    CREATE POLICY wallet_settings_admin ON public.wallet_settings FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;
END
$pol$;
