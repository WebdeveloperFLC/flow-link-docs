-- Apply Direct Institution UAT demo data (separate from function DDL so fn persists if seed fails).
-- Re-run safely: SELECT public.fn_seed_commission_direct_partner_demo();

SELECT public.fn_seed_commission_direct_partner_demo();
