-- Performance Hub UAT — allow offer_events.event_type = 'sent' (Phase 5D+ analytics)
-- Fixes PH-R-015 / PH-R-019: O10 influence card and A/B sent metrics

ALTER TABLE public.offer_events DROP CONSTRAINT IF EXISTS offer_events_event_type_check;

ALTER TABLE public.offer_events ADD CONSTRAINT offer_events_event_type_check
  CHECK (event_type IN ('viewed', 'claimed', 'redeemed', 'delivered', 'sent'));
