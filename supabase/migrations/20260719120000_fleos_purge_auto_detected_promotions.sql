-- FLEOS cleanup: remove AI auto-detected demo/sample promotions (no schema change).
-- Promotions are user-managed business data only going forward.
DELETE FROM public.upi_promotions WHERE auto_detected IS TRUE;
