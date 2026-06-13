-- =====================================================================
-- HR Payroll — Performance Hub incentives + Accounting payout batch
-- Run after 20260717120005_hr_payroll_workflows.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS accounting_payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid NOT NULL DEFAULT gen_random_uuid(),
  cycle_id        uuid NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL,
  company_id      uuid REFERENCES companies(id),
  branch_id       uuid REFERENCES public.branches(id),
  employee_id     uuid NOT NULL REFERENCES employees(id),
  employee_code   text NOT NULL,
  employee_name   text NOT NULL,
  gross_earned    numeric(12,2) NOT NULL,
  incentive       numeric(12,2) NOT NULL DEFAULT 0,
  bonus           numeric(12,2) NOT NULL DEFAULT 0,
  pf_employee     numeric(12,2) NOT NULL DEFAULT 0,
  esic_employee   numeric(12,2) NOT NULL DEFAULT 0,
  net_salary      numeric(12,2) NOT NULL,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Disbursed','Acknowledged'))
);
CREATE INDEX IF NOT EXISTS idx_accounting_payouts_cycle ON accounting_payouts (cycle_id);
CREATE INDEX IF NOT EXISTS idx_accounting_payouts_batch ON accounting_payouts (batch_id);

ALTER TABLE accounting_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounting_payouts_hr ON accounting_payouts;
CREATE POLICY accounting_payouts_hr ON accounting_payouts FOR ALL TO authenticated
  USING (is_hr(org_id)) WITH CHECK (is_hr(org_id));

-- Pull approved incentives from Performance Hub (reads incentive_payouts when present)
CREATE OR REPLACE FUNCTION fn_pull_incentives(p_cycle uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  c record; n int := 0; r record;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.status <> 'Draft' THEN
    RAISE EXCEPTION 'Cannot pull incentives into % cycle', c.status;
  END IF;

  IF to_regclass('public.incentive_payouts') IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT pl.id AS line_id, pl.employee_id,
           COALESCE(SUM(ip.amount), 0) AS incentive_amt,
           COALESCE(SUM(ip.bonus_amount), 0) AS bonus_amt
    FROM payroll_lines pl
    JOIN employees e ON e.id = pl.employee_id
    LEFT JOIN incentive_payouts ip ON ip.staff_id = e.staff_id
      AND ip.payroll_status IN ('pending', 'sent_to_payroll', 'acknowledged')
    WHERE pl.cycle_id = p_cycle
    GROUP BY pl.id, pl.employee_id
  LOOP
    UPDATE payroll_lines
    SET incentive = r.incentive_amt, bonus = r.bonus_amt
    WHERE id = r.line_id;
    n := n + 1;
  END LOOP;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (c.org_id, 'System', 'Incentives Synced', c.label, n::text || ' lines');
  RETURN n;
END; $$;

-- Export accounting batch when cycle is locked
CREATE OR REPLACE FUNCTION fn_export_accounting_batch(p_cycle uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  c record; v_batch uuid := gen_random_uuid(); n int := 0;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.status NOT IN ('Locked', 'Paid') THEN
    RAISE EXCEPTION 'Cycle must be locked before export';
  END IF;

  DELETE FROM accounting_payouts WHERE cycle_id = p_cycle;

  INSERT INTO accounting_payouts (
    batch_id, cycle_id, org_id, company_id, branch_id,
    employee_id, employee_code, employee_name,
    gross_earned, incentive, bonus, pf_employee, esic_employee, net_salary
  )
  SELECT
    v_batch, pl.cycle_id, pl.org_id, e.company_id, e.branch_id,
    e.id, e.emp_code, e.full_name,
    pl.gross_earned, pl.incentive, pl.bonus, pl.pf_employee, pl.esic_employee, pl.net_salary
  FROM payroll_lines pl
  JOIN employees e ON e.id = pl.employee_id
  WHERE pl.cycle_id = p_cycle;

  GET DIAGNOSTICS n = ROW_COUNT;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (c.org_id, 'System', 'Accounting Batch Exported', c.label, n::text || ' rows · ' || v_batch::text);

  RETURN v_batch;
END; $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN ('fn_pull_incentives', 'fn_export_accounting_batch')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
