-- =====================================================================
-- Phase 1 — COA seed (global accounts, entity_id NULL)
-- Seeds the bank/AR/AP/tax/payroll/equity accounts the journal engine
-- needs. Idempotent: only inserts a code if no NULL-entity row exists
-- (the (code, entity_id) unique index treats NULLs as distinct, so we
-- guard with an anti-join). Existing client-fund accounts (2401-2411)
-- are left untouched.
-- =====================================================================

INSERT INTO public.accounting_coa
  (code, name, group_code, type_code, currency, normal_balance, entity_id, is_active, description)
SELECT v.code, v.name, v.grp, v.typ, v.cur, v.nb, NULL, TRUE, v.descr
FROM (VALUES
  -- ── Banks & receivables ──
  ('1010','Operating Bank','ASSET','BANK','CAD','DEBIT','Default operating bank account'),
  ('1201','Student Trust Bank','ASSET','BANK','CAD','DEBIT','Segregated student trust bank account'),
  ('1200','Accounts Receivable — Students','ASSET','AR','CAD','DEBIT','Receivable from students (corporate AR only)'),
  ('1205','Accounts Receivable — Corporate','ASSET','AR','CAD','DEBIT','Receivable from internal/corporate clients'),
  -- ── Input tax credits ──
  ('1340','GST/HST Input Tax Credit','ASSET','TAX_INPUT','CAD','DEBIT','Recoverable GST/HST on purchases'),
  ('1370','GST Input Tax Credit (India)','ASSET','TAX_INPUT','INR','DEBIT','Recoverable GST on purchases (India)'),
  -- ── Payables ──
  ('2000','Accounts Payable — Trade','LIABILITY','AP','CAD','CREDIT','Trade vendor payables'),
  ('2420','College / Institution Payable','LIABILITY','AP','CAD','CREDIT','Amounts owed to institutions for student funds'),
  ('2480','Student Funds Clearing','LIABILITY','AP','CAD','CREDIT','Unallocated student funds clearing'),
  ('2481','Refundable Deposits — Service','LIABILITY','AP','CAD','CREDIT','Refundable service deposits held'),
  -- ── Output tax — Canada ──
  ('2310','GST/HST Output Payable','LIABILITY','TAX_PAYABLE','CAD','CREDIT','GST/HST collected on sales'),
  -- ── Output tax — India ──
  ('2360','CGST Output Payable','LIABILITY','TAX_PAYABLE','INR','CREDIT','CGST collected on sales'),
  ('2361','SGST Output Payable','LIABILITY','TAX_PAYABLE','INR','CREDIT','SGST collected on sales'),
  ('2362','IGST Output Payable','LIABILITY','TAX_PAYABLE','INR','CREDIT','IGST collected on sales'),
  ('2370','TDS Payable — Vendors','LIABILITY','TAX_PAYABLE','INR','CREDIT','Tax deducted at source on vendor payments'),
  ('2371','TDS Payable — Salary','LIABILITY','TAX_PAYABLE','INR','CREDIT','Tax deducted at source on salaries'),
  -- ── Payroll liabilities ──
  ('2330','CPP Payable','LIABILITY','PAYROLL_LIAB','CAD','CREDIT','Canada Pension Plan payable'),
  ('2332','EI Payable','LIABILITY','PAYROLL_LIAB','CAD','CREDIT','Employment Insurance payable'),
  ('2334','Income Tax Withheld','LIABILITY','PAYROLL_LIAB','CAD','CREDIT','Employee income tax withheld (Canada)'),
  ('2340','Net Payroll Payable','LIABILITY','PAYROLL_LIAB','CAD','CREDIT','Net salaries payable to employees'),
  ('2350','PF Payable','LIABILITY','PAYROLL_LIAB','INR','CREDIT','Provident Fund payable (India)'),
  ('2352','ESIC Payable','LIABILITY','PAYROLL_LIAB','INR','CREDIT','ESIC payable (India)'),
  ('2354','Professional Tax Payable','LIABILITY','PAYROLL_LIAB','INR','CREDIT','Professional tax payable (India)'),
  -- ── Payroll expenses ──
  ('6100','Salaries & Wages','EXPENSE','SALARIES','CAD','DEBIT','Gross salaries and wages'),
  ('6110','CPP Employer Expense','EXPENSE','SALARIES','CAD','DEBIT','Employer CPP contributions'),
  ('6111','EI Employer Expense','EXPENSE','SALARIES','CAD','DEBIT','Employer EI contributions'),
  ('6120','PF Employer Expense','EXPENSE','SALARIES','INR','DEBIT','Employer PF contributions (India)'),
  ('6121','ESIC Employer Expense','EXPENSE','SALARIES','INR','DEBIT','Employer ESIC contributions (India)'),
  -- ── Equity ──
  ('3900','Retained Earnings','EQUITY','RETAINED','CAD','CREDIT','Accumulated retained earnings')
) AS v(code, name, grp, typ, cur, nb, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounting_coa c
   WHERE c.code = v.code AND c.entity_id IS NULL
);
