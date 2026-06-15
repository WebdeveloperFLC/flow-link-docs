-- DEPRECATED — do not run after migration 27 (20260717120027)
--
-- Business rule: all India employees have Professional Tax (default ₹200).
-- Isha (FL-1042) net with PT = ₹39,300 (not ₹39,500 Excel baseline without PT).
--
-- To apply PT for all India staff on staging, run instead:
--   supabase/migrations/20260717120027_hr_payroll_professional_tax_all_india.sql
--
-- To change PT amount later: HR → Config → Professional Tax tab (no SQL needed).

SELECT 'Use migration 27 + Config tab — this script is deprecated' AS notice;
