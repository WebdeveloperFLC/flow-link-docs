-- HR Payroll UAT — one-shot staging verification
-- Run in Supabase SQL Editor before human UAT (HR-UAT-SETUP-001)
-- Demo org: 00000000-0000-0000-0000-0000000000f1

-- 1) Core tables
SELECT 'employees' AS check_name,
       count(*)::text AS actual,
       '>= 5' AS expected,
       CASE WHEN count(*) >= 5 THEN 'PASS' ELSE 'FAIL' END AS status
FROM employees
WHERE org_id = '00000000-0000-0000-0000-0000000000f1';

-- 2) Active demo cycle
SELECT 'payroll_cycle' AS check_name,
       concat(label, ' · ', status, ' · ', payroll_days, ' days') AS actual,
       '26 May 2026 – 25 Jun 2026 · Draft · 30' AS expected,
       CASE
         WHEN label ILIKE '%26 May%25 Jun%' AND status IN ('Draft', 'Processed', 'Approved', 'Locked', 'Paid')
         THEN 'PASS'
         ELSE 'FAIL'
       END AS status
FROM payroll_cycles
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
ORDER BY start_date DESC
LIMIT 1;

-- 3) TV02 golden anchor — Isha FL-1042
SELECT 'TV02_isha' AS check_name,
       concat('payable=', payable_days, ' net=', net_salary) AS actual,
       'payable=29.5 net=39500' AS expected,
       CASE WHEN payable_days = 29.5 AND net_salary = 39500 THEN 'PASS' ELSE 'FAIL' END AS status
FROM v_payroll_preview
WHERE emp_code = 'FL-1042';

-- 4) Phase 2 lifecycle RPCs (migrations 19–20)
SELECT 'lifecycle_rpcs' AS check_name,
       string_agg(proname, ', ' ORDER BY proname) AS actual,
       'fn_approve_payroll_cycle, fn_mark_payroll_paid, fn_process_payroll_cycle' AS expected,
       CASE
         WHEN count(*) FILTER (WHERE proname = 'fn_process_payroll_cycle') = 1
          AND count(*) FILTER (WHERE proname = 'fn_approve_payroll_cycle') = 1
          AND count(*) FILTER (WHERE proname = 'fn_mark_payroll_paid') = 1
         THEN 'PASS'
         ELSE 'FAIL'
       END AS status
FROM pg_proc
WHERE proname IN (
  'fn_process_payroll_cycle',
  'fn_approve_payroll_cycle',
  'fn_mark_payroll_paid'
);

-- 5) Phase 2 profile columns (migration 18)
SELECT 'profile_columns' AS check_name,
       string_agg(column_name, ', ' ORDER BY column_name) AS actual,
       'middle_name, payroll_country, salary_currency' AS expected,
       CASE
         WHEN count(*) FILTER (WHERE column_name = 'middle_name') = 1
          AND count(*) FILTER (WHERE column_name = 'payroll_country') = 1
          AND count(*) FILTER (WHERE column_name = 'salary_currency') = 1
         THEN 'PASS'
         ELSE 'FAIL'
       END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employees'
  AND column_name IN ('middle_name', 'payroll_country', 'salary_currency');

-- 6) Canada demo employee (migration 20)
SELECT 'canada_demo' AS check_name,
       COALESCE(
         (SELECT concat(emp_code, ' · ', salary_currency, ' · ', payroll_country)
          FROM employees
          WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND emp_code = 'FL-CA01'),
         'missing'
       ) AS actual,
       'FL-CA01 · CAD · CA' AS expected,
       CASE
         WHEN EXISTS (
           SELECT 1 FROM employees
           WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
             AND emp_code = 'FL-CA01'
             AND upper(payroll_country) = 'CA'
             AND upper(salary_currency) = 'CAD'
         ) THEN 'PASS'
         ELSE 'FAIL'
       END AS status;

-- 7) Canada payroll preview (HR-UAT-P2-007 rough anchor)
SELECT 'canada_net' AS check_name,
       concat('net=', round(net_salary::numeric, 2)) AS actual,
       'net~4157 (±50)' AS expected,
       CASE
         WHEN net_salary BETWEEN 4100 AND 4200 THEN 'PASS'
         ELSE 'FAIL'
       END AS status
FROM v_payroll_preview
WHERE emp_code = 'FL-CA01';

-- 8) Employee roster
SELECT emp_code, full_name, salary_currency, payroll_country, staff_id IS NOT NULL AS crm_linked
FROM employees
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
ORDER BY emp_code;
