-- Re-apply demo seed function with idempotent upserts (counselor_performance_scores, client_offers)
-- Run if fn_seed_performance_hub_demo() failed on duplicate counselor_id+period_key

CREATE OR REPLACE FUNCTION public.fn_seed_performance_hub_demo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text := '2026-06';
  v_branch_genda uuid;
  v_branch_ajwa uuid;
  -- Resolve demo user IDs by email (fallback to fixed UUIDs if profiles pre-linked)
  v_priya uuid;
  v_rohit uuid;
  v_manager uuid;
  v_admin uuid;
  v_director uuid;
  v_telecaller uuid;
  v_marcom uuid;
  v_journey_coaching uuid;
BEGIN
-- Resolve actors: ph demo emails first, else any existing role holders (staging)
  SELECT id INTO v_priya FROM auth.users WHERE email = 'ph.counselor1@flowlink.demo' LIMIT 1;
  IF v_priya IS NULL THEN
    SELECT ur.user_id INTO v_priya FROM public.user_roles ur
     WHERE ur.role = 'counselor'::public.app_role LIMIT 1;
  END IF;
  SELECT id INTO v_rohit FROM auth.users WHERE email = 'ph.counselor2@flowlink.demo' LIMIT 1;
  IF v_rohit IS NULL THEN
    SELECT ur.user_id INTO v_rohit FROM public.user_roles ur
     WHERE ur.role = 'counselor'::public.app_role AND ur.user_id IS DISTINCT FROM v_priya LIMIT 1;
  END IF;
  v_rohit := coalesce(v_rohit, v_priya);
  SELECT id INTO v_manager FROM auth.users WHERE email = 'ph.manager@flowlink.demo' LIMIT 1;
  IF v_manager IS NULL THEN
    SELECT ur.user_id INTO v_manager FROM public.user_roles ur
     WHERE ur.role = 'manager'::public.app_role LIMIT 1;
  END IF;
  SELECT id INTO v_admin FROM auth.users WHERE email = 'ph.admin@flowlink.demo' LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT ur.user_id INTO v_admin FROM public.user_roles ur
     WHERE ur.role = 'admin'::public.app_role LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    SELECT ur.user_id INTO v_admin FROM public.user_roles ur
     WHERE ur.role = 'administrator'::public.app_role LIMIT 1;
  END IF;
  SELECT id INTO v_director FROM auth.users WHERE email = 'ph.director@flowlink.demo' LIMIT 1;
  IF v_director IS NULL THEN
    SELECT ur.user_id INTO v_director FROM public.user_roles ur
     WHERE ur.role = 'director'::public.app_role LIMIT 1;
  END IF;
  SELECT id INTO v_telecaller FROM auth.users WHERE email = 'ph.telecaller@flowlink.demo' LIMIT 1;
  IF v_telecaller IS NULL THEN
    SELECT ur.user_id INTO v_telecaller FROM public.user_roles ur
     WHERE ur.role = 'telecaller'::public.app_role LIMIT 1;
  END IF;
  SELECT id INTO v_marcom FROM auth.users WHERE email = 'ph.marcom@flowlink.demo' LIMIT 1;
  v_marcom := coalesce(v_marcom, v_manager, v_admin, v_priya);

  IF v_priya IS NULL OR v_admin IS NULL THEN
    RAISE NOTICE 'Performance Hub demo seed skipped: need at least one counselor and one admin user in auth.users';
    RETURN;
  END IF;
  v_manager := coalesce(v_manager, v_admin);
  v_rohit := coalesce(v_rohit, v_priya);

  SELECT id INTO v_branch_genda FROM public.branches WHERE name = 'Genda Circle' LIMIT 1;
  SELECT id INTO v_branch_ajwa FROM public.branches WHERE name = 'Ajwa' LIMIT 1;
  SELECT id INTO v_journey_coaching
    FROM public.offer_automation_journeys
   WHERE template_key = 'cross_sell_coaching_abroad'
   LIMIT 1;

  IF v_branch_genda IS NULL THEN
    RAISE NOTICE 'Performance Hub demo seed skipped: branch Genda Circle not found';
    RETURN;
  END IF;

  -- ── Profiles (branch assignment) ─────────────────────────────────────────
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Priya Mehta'
   WHERE id = v_priya;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Rohit Shah'
   WHERE id = v_rohit;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Neha Manager'
   WHERE id = v_manager;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Admin Demo'
   WHERE id = v_admin;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Director Demo'
   WHERE id = v_director;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Tara Telecaller'
   WHERE id = v_telecaller;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Maya MarCom'
   WHERE id = v_marcom;

  -- ── Clients ──────────────────────────────────────────────────────────────
  INSERT INTO public.clients (
    id, application_id, application_type, full_name, country, status,
    branch, assigned_counselor_id, owner_id,
    coaching_services, admission_services, allied_services, visa_services,
    lead_score, education_history, english_sections, extra_items, suppressed_template_items, tags
  ) VALUES
  (
    'c1000001-0001-4000-8000-000000000001', 'PH-DEMO-001', 'coaching', 'Aman Shah', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY['IELTS Coaching'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    72, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','coaching-only']
  ),
  (
    'c1000002-0002-4000-8000-000000000002', 'PH-DEMO-002', 'study_abroad', 'Ritika Jain', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY[]::text[], ARRAY['University Application'], ARRAY[]::text[], ARRAY['Student Visa'],
    65, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','study-abroad']
  ),
  (
    'c1000003-0003-4000-8000-000000000003', 'PH-DEMO-003', 'study_abroad', 'Farhan Ali', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY[]::text[], ARRAY['University Application'], ARRAY[]::text[], ARRAY[]::text[],
    58, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','give-discount']
  ),
  (
    'c1000004-0004-4000-8000-000000000004', 'PH-DEMO-004', 'coaching', 'Unclassified Pay Client', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY['IELTS Coaching'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    40, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','unclassified']
  ),
  (
    'c1000005-0005-4000-8000-000000000005', 'PH-DEMO-005', 'coaching', 'AB Test Client', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY['IELTS Coaching'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    50, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','ab-test']
  ),
  (
    'c1000006-0006-4000-8000-000000000006', 'PH-DEMO-006', 'coaching', 'Legacy Reg Client', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY['IELTS Coaching'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    45, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','legacy-offer']
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    assigned_counselor_id = EXCLUDED.assigned_counselor_id,
    coaching_services = EXCLUDED.coaching_services,
    admission_services = EXCLUDED.admission_services;

  -- ── Legacy service_offers (6D banner) ────────────────────────────────────
  INSERT INTO public.service_offers (
    id, offer_name, offer_code, offer_type, discount_percent,
    valid_from, is_active, is_hidden, notes
  ) VALUES (
    'a0010001-0001-4000-8000-000000000001',
    'PH Legacy 10% IELTS', 'PH-LEGACY-10', 'PERCENT', 10,
    '2026-01-01', true, false,
    'Demo legacy offer for service_offers convergence banner (Phase 6D)'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Offers (Performance Hub library) ─────────────────────────────────────
  INSERT INTO public.offers (
    id, title, description, discount_type, discount_value, status, funding_source,
    audience, currency, is_active, requires_approval, per_client_limit,
    fl_contribution_pct, university_contribution_pct, created_by, branch_id,
    applicable_services, target_countries, valid_from, valid_to
  ) VALUES
  (
    'a0200001-0001-4000-8000-000000000001',     'PH Demo · FL 10% IELTS Coaching',
    'UAT active FL-funded coaching discount', 'percentage', 10, 'active', 'future_link',
    'global', 'INR', true, false, 1,
    100, NULL, v_priya, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  ),
  (
    'a0200002-0002-4000-8000-000000000002', 'PH Demo · University 15% Admission',
    'University-funded admission discount', 'percentage', 15, 'active', 'university',
    'global', 'INR', true, true, 1,
    0, 100, v_admin, v_branch_genda,
    ARRAY['University Application'], ARRAY['IN','CA'], '2026-06-01', '2026-06-30'
  ),
  (
    'a0200003-0003-4000-8000-000000000003', 'PH Demo · Joint 60/40 Bundle',
    'Joint funding split', 'percentage', 20, 'active', 'joint',
    'global', 'INR', true, false, 2,
    60, 40, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching','University Application'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  ),
  (
    'a0200004-0004-4000-8000-000000000004',     'PH Demo · Full Waiver (admin)',
    '100% waiver — admin only', 'percentage', 100, 'active', 'future_link',
    'global', 'INR', true, true, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['University Application'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  ),
  (
    'a0200005-0005-4000-8000-000000000005', 'PH Demo · Draft Pending Review',
    'Draft for library review flow', 'percentage', 12, 'draft', 'future_link',
    'global', 'INR', false, true, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], NULL, NULL
  ),
  (
    'a0200006-0006-4000-8000-000000000006', 'PH Demo · AB Variant A (12%)',
    'A/B experiment variant A', 'percentage', 12, 'active', 'future_link',
    'global', 'INR', true, false, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  ),
  (
    'a0200007-0007-4000-8000-000000000007', 'PH Demo · AB Variant B (8%)',
    'A/B experiment variant B', 'percentage', 8, 'active', 'future_link',
    'global', 'INR', true, false, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  )
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

  -- ── Wallets ──────────────────────────────────────────────────────────────
  INSERT INTO public.discount_wallets (
    id, counselor_id, branch_id, period_key, currency, name, budget_kind,
    assigned_target, potential_wallet, unlocked_amount, balance, base_wallet,
    achieved_revenue, achievement_pct, max_percent_per_client
  ) VALUES
  (
    'a0020001-0001-4000-8000-000000000001', v_priya, v_branch_genda, v_period, 'INR',
    'PH Demo · Priya Jun-2026', 'month_to_month',
    300000, 25000, 15000, 15000, 25000,
    320000, 64, 15
  ),
  (
    'a0020002-0002-4000-8000-000000000002', v_rohit, v_branch_genda, v_period, 'INR',
    'PH Demo · Rohit no-target', 'month_to_month',
    NULL, 12000, 8000, 8000, 12000,
    0, NULL, 10
  ),
  (
    'a0020003-0003-4000-8000-000000000003', NULL, v_branch_genda, v_period, 'INR',
    'PH Demo · Genda branch pool', 'branch_pool',
    NULL, 0, 0, 50000, 50000,
    0, NULL, 15
  ),
  (
    'a0020004-0004-4000-8000-000000000004', v_priya, v_branch_genda, v_period, 'INR',
    'PH Demo · Strategic DE', 'scoped',
    NULL, 8000, 8000, 8000, 8000,
    0, NULL, 10
  )
  ON CONFLICT (id) DO UPDATE SET
    counselor_id = EXCLUDED.counselor_id,
    period_key = EXCLUDED.period_key,
    name = EXCLUDED.name,
    budget_kind = EXCLUDED.budget_kind,
    balance = EXCLUDED.balance,
    unlocked_amount = EXCLUDED.unlocked_amount,
    closed_at = NULL;

  UPDATE public.discount_wallets
     SET scope_country_tag = 'DE'
   WHERE id = 'a0020004-0004-4000-8000-000000000004';

  -- ── Incentive target ─────────────────────────────────────────────────────
  INSERT INTO public.incentive_targets (
    id, counselor_id, branch_id, period_key, period_type,
    target_metric, target_value, target_currency, plan_id
  ) VALUES (
    'a0030001-0001-4000-8000-000000000001',
    v_priya, v_branch_genda, v_period, 'monthly',
    'net_revenue', 300000, 'INR', NULL
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Verified payments (unclassified list + hot propensity) ───────────────
  INSERT INTO public.client_invoices (
    id, client_id, invoice_number, amount, currency, status, line_items, assigned_counselor_id
  ) VALUES
  (
    'a00c0001-0001-4000-8000-000000000001',
    'c1000001-0001-4000-8000-000000000001',
    'PH-DEMO-INV-001',
    45000, 'INR', 'paid',
    jsonb_build_array(jsonb_build_object(
      'master_key', 'coaching_services',
      'service_code', 'IELTS',
      'description', 'PH Demo IELTS coaching',
      'amount', 45000
    )),
    v_priya
  ),
  (
    'a00c0004-0004-4000-8000-000000000004',
    'c1000004-0004-4000-8000-000000000004',
    'PH-DEMO-INV-004',
    22000, 'INR', 'paid',
    jsonb_build_array(jsonb_build_object(
      'description', 'PH Demo unclassified payment',
      'amount', 22000
    )),
    v_priya
  ),
  (
    'a00c0002-0002-4000-8000-000000000002',
    'c1000002-0002-4000-8000-000000000002',
    'PH-DEMO-INV-002',
    120000, 'INR', 'paid',
    jsonb_build_array(jsonb_build_object(
      'master_key', 'admission_services',
      'service_code', 'UNIV_APP',
      'description', 'PH Demo university application',
      'amount', 120000
    )),
    v_priya
  ),
  (
    'a00c0003-0003-4000-8000-000000000003',
    'c1000002-0002-4000-8000-000000000002',
    'PH-DEMO-INV-003',
    8500, 'INR', 'paid',
    jsonb_build_array(jsonb_build_object(
      'master_key', 'allied_services',
      'service_code', 'FOREX',
      'description', 'PH Demo forex allied',
      'amount', 8500
    )),
    v_priya
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.client_invoice_payments (
    id, client_id, invoice_id, amount, currency, method, paid_at,
    payment_status, payment_proof_status
  ) VALUES
  (
    'a00d0001-0001-4000-8000-000000000001',
    'c1000001-0001-4000-8000-000000000001',
    'a00c0001-0001-4000-8000-000000000001',
    45000, 'INR', 'bank_transfer', '2026-06-05',
    'verified', 'verified'
  ),
  (
    'a00d0004-0004-4000-8000-000000000004',
    'c1000004-0004-4000-8000-000000000004',
    'a00c0004-0004-4000-8000-000000000004',
    22000, 'INR', 'bank_transfer', '2026-06-12',
    'verified', 'verified'
  ),
  (
    'a00d0002-0002-4000-8000-000000000002',
    'c1000002-0002-4000-8000-000000000002',
    'a00c0002-0002-4000-8000-000000000002',
    120000, 'INR', 'bank_transfer', '2026-06-08',
    'verified', 'verified'
  ),
  (
    'a00d0003-0003-4000-8000-000000000003',
    'c1000002-0002-4000-8000-000000000002',
    'a00c0003-0003-4000-8000-000000000003',
    8500, 'INR', 'bank_transfer', '2026-06-10',
    'verified', 'verified'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Classified qualifying events (Priya revenue breakdown) ───────────────
  INSERT INTO public.incentive_qualifying_events (
    id, event_type, event_date, period_key, counselor_id, client_id, branch_id,
    amount, currency, source_type, dimensions, source_table, source_id
  ) VALUES
  (
    'a00e0001-0001-4000-8000-000000000001', 'first_verified_payment', '2026-06-03', v_period,
    v_priya, 'c1000001-0001-4000-8000-000000000001', v_branch_genda,
    45000, 'INR', 'service_revenue',
    jsonb_build_object('master_key','coaching_services','service_code','IELTS','is_first_payment','true'),
    'client_invoice_payments', 'a00d0001-0001-4000-8000-000000000001'
  ),
  (
    'a00e0002-0002-4000-8000-000000000002', 'first_verified_payment', '2026-06-08', v_period,
    v_priya, 'c1000002-0002-4000-8000-000000000002', v_branch_genda,
    120000, 'INR', 'service_revenue',
    jsonb_build_object('master_key','admission_services','service_code','UNIV_APP'),
    'client_invoice_payments', 'a00d0002-0002-4000-8000-000000000002'
  ),
  (
    'a00e0003-0003-4000-8000-000000000003', 'first_verified_payment', '2026-06-10', v_period,
    v_priya, 'c1000002-0002-4000-8000-000000000002', v_branch_genda,
    8500, 'INR', 'service_revenue',
    jsonb_build_object('master_key','allied_services','service_code','FOREX'),
    'client_invoice_payments', 'a00d0003-0003-4000-8000-000000000003'
  ),
  -- Unclassified (blocks readiness until classified)
  (
    'a00e0004-0004-4000-8000-000000000004', 'first_verified_payment', '2026-06-12', v_period,
    v_priya, 'c1000004-0004-4000-8000-000000000004', v_branch_genda,
    22000, 'INR', 'service_revenue',
    '{}'::jsonb,
    'client_invoice_payments', 'a00d0004-0004-4000-8000-000000000004'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Discount approval queue ────────────────────────────────────────────────
  INSERT INTO public.discount_approval_requests (
    id, period_key, counselor_id, client_id, wallet_id, offer_id,
    discount_amount, discount_percent, wallet_debit, approval_level, status,
    reference_amount, net_after_discount, below_floor, is_waiver, request_note
  ) VALUES
  (
    'd1000001-0001-4000-8000-000000000001', v_period, v_priya,
    'c1000001-0001-4000-8000-000000000001', 'a0020001-0001-4000-8000-000000000001',
    'a0200001-0001-4000-8000-000000000001',
    4500, 10, 4500, 'instant', 'applied',
    45000, 40500, false, false, 'PH Demo instant apply (historical)'
  ),
  (
    'd1000002-0002-4000-8000-000000000002', v_period, v_priya,
    'c1000002-0002-4000-8000-000000000002', 'a0020001-0001-4000-8000-000000000001',
    'a0200002-0002-4000-8000-000000000002',
    18000, 15, 0, 'manager', 'pending',
    120000, 102000, false, false, 'PH Demo manager queue'
  ),
  (
    'd1000003-0003-4000-8000-000000000003', v_period, v_priya,
    'c1000003-0003-4000-8000-000000000003', 'a0020001-0001-4000-8000-000000000001',
    'a0200002-0002-4000-8000-000000000002',
    30000, 25, 30000, 'admin', 'pending',
    100000, 70000, true, false, 'PH Demo below admission floor (85%)'
  ),
  (
    'd1000004-0004-4000-8000-000000000004', v_period, v_priya,
    'c1000003-0003-4000-8000-000000000003', 'a0020001-0001-4000-8000-000000000001',
    'a0200004-0004-4000-8000-000000000004',
    100000, 100, 100000, 'admin', 'pending',
    100000, 0, true, true, 'PH Demo full waiver — counselor blocked'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

  -- ── Applied wallet allocation (O10 / analytics V2) ───────────────────────
  INSERT INTO public.wallet_allocations (
    id, wallet_id, counselor_id, client_id, offer_id, invoice_id,
    amount, currency, percent, status, exceeded_cap, created_by, applied_at
  ) VALUES (
    'a0080001-0001-4000-8000-000000000001',
    'a0020001-0001-4000-8000-000000000001', v_priya,
    'c1000001-0001-4000-8000-000000000001',
    'a0200001-0001-4000-8000-000000000001',
    'a00c0001-0001-4000-8000-000000000001',
    4500, 'INR', 10, 'applied', false, v_priya, '2026-06-05'::timestamptz
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Promotion requests ───────────────────────────────────────────────────
  INSERT INTO public.promotion_requests (
    id, title, description, requested_by, branch_id, funding_source,
    proposed_discount_text, status, offer_category, target_audience
  ) VALUES
  (
    'a00f0001-0001-4000-8000-000000000001',
    'PH Demo · Monsoon IELTS push', 'Field request for June IELTS campaign',
    v_priya, v_branch_genda, 'future_link', '10% on IELTS bundle', 'pending',
    'coaching', 'coaching clients'
  ),
  (
    'a00f0002-0002-4000-8000-000000000002',
    'PH Demo · Canada intake bundle', 'MarCom review in progress',
    v_priya, v_branch_genda, 'joint', '15% joint funded', 'in_review',
    'admission', 'study abroad'
  ),
  (
    'a00f0003-0003-4000-8000-000000000003',
    'PH Demo · Approved publish ready', 'Ready to publish to offers library',
    v_priya, v_branch_genda, 'future_link', '8% coaching', 'approved',
    'coaching', 'global'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

  -- ── Wallet exception ─────────────────────────────────────────────────────
  INSERT INTO public.wallet_exception_requests (
    id, period_key, counselor_id, wallet_id, requested_amount, reason, status
  ) VALUES (
    'e1000001-0001-4000-8000-000000000001', v_period, v_rohit,
    'a0020002-0002-4000-8000-000000000002', 5000,
    'PH Demo — client retention exception', 'pending'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Counselor performance score (WIR card 5U) ────────────────────────────
  INSERT INTO public.counselor_performance_scores (
    id, counselor_id, period_key,
    revenue_achievement, wallet_impact_revenue, wallet_used, wallet_roi,
    conversion_rate, client_satisfaction, collections_received, total_score
  ) VALUES (
    'a0100001-0001-4000-8000-000000000001', v_priya, v_period,
    64, 80000, 10000, 8.0,
    72, 88, 95000, 78
  )
  ON CONFLICT (id) DO UPDATE SET
    counselor_id = EXCLUDED.counselor_id,
    period_key = EXCLUDED.period_key,
    revenue_achievement = EXCLUDED.revenue_achievement,
    wallet_impact_revenue = EXCLUDED.wallet_impact_revenue,
    wallet_used = EXCLUDED.wallet_used,
    wallet_roi = EXCLUDED.wallet_roi,
    conversion_rate = EXCLUDED.conversion_rate,
    client_satisfaction = EXCLUDED.client_satisfaction,
    collections_received = EXCLUDED.collections_received,
    total_score = EXCLUDED.total_score;

  -- ── Incentive plan + open run + line item ────────────────────────────────
  INSERT INTO public.incentive_plans (
    id, name, description, branch_id, period_type, settlement_currency,
    revenue_basis, scope_type, is_active, created_by
  ) VALUES (
    'a0040001-0001-4000-8000-000000000001',
    'PH Demo Counselor Plan', 'UAT plan for Performance Hub home + runs',
    v_branch_genda, 'monthly', 'INR', 'net', 'branch', true, v_admin
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.incentive_runs (
    id, plan_id, branch_id, period_key, period_type, settlement_currency,
    status, total_settlement, locked, calculated_at, calculated_by
  ) VALUES (
    'a0050001-0001-4000-8000-000000000001',
    'a0040001-0001-4000-8000-000000000001', v_branch_genda, v_period, 'monthly', 'INR',
    'calculated', 12500, false, now(), v_admin
  )
  ON CONFLICT (id) DO UPDATE SET locked = EXCLUDED.locked;

  INSERT INTO public.incentive_line_items (
    id, run_id, counselor_id, source_type, client_id,
    base_amount, base_currency, earned_amount, settlement_currency, note
  ) VALUES
  (
    'a0060001-0001-4000-8000-000000000001',
    'a0050001-0001-4000-8000-000000000001', v_priya, 'service_revenue',
    'c1000001-0001-4000-8000-000000000001',
    45000, 'INR', 12500, 'INR', 'PH Demo calculated line'
  ),
  (
    'a0060002-0002-4000-8000-000000000002',
    'a0050001-0001-4000-8000-000000000001', v_priya, 'service_revenue',
    'c1000002-0002-4000-8000-000000000002',
    120000, 'INR', 8000, 'INR', 'PH Demo second line — update for Q4 ticker test'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.incentive_payouts (
    id, run_id, counselor_id, gross_amount, net_amount, tds_amount, tds_percent,
    settlement_currency, status, notes, approved_by, approved_at
  ) VALUES (
    'a0070001-0001-4000-8000-000000000001',
    'a0050001-0001-4000-8000-000000000001', v_priya,
    12500, 11250, 1250, 10, 'INR', 'approved',
    'PH Demo payout — prior period sample', v_admin, now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Offer events (O10 influence card 5V) ─────────────────────────────────
  -- Requires migration 20260712120000_performance_hub_offer_events_sent.sql ('sent' in CHECK)

  INSERT INTO public.offer_events (counselor_id, client_id, offer_id, event_type, channel)
  SELECT v_priya, 'c1000001-0001-4000-8000-000000000001',
         'a0200001-0001-4000-8000-000000000001', 'sent', 'ph-demo'
   WHERE NOT EXISTS (
     SELECT 1 FROM public.offer_events oe
      WHERE oe.counselor_id = v_priya AND oe.event_type = 'sent'
        AND oe.offer_id = 'a0200001-0001-4000-8000-000000000001'
        AND oe.created_at::date >= '2026-06-01'
   );

  INSERT INTO public.offer_events (counselor_id, client_id, offer_id, event_type, channel)
  SELECT v_priya, 'c1000001-0001-4000-8000-000000000001',
         'a0200001-0001-4000-8000-000000000001', 'redeemed', 'ph-demo'
   WHERE NOT EXISTS (
     SELECT 1 FROM public.offer_events oe
      WHERE oe.counselor_id = v_priya AND oe.event_type = 'redeemed'
        AND oe.offer_id = 'a0200001-0001-4000-8000-000000000001'
        AND oe.created_at::date >= '2026-06-01'
   );

  -- ── A/B experiment (5R) ──────────────────────────────────────────────────
  INSERT INTO public.offer_ab_experiments (
    id, name, description, status, min_conversions, started_at, created_by
  ) VALUES (
    'ab100001-0001-4000-8000-000000000001',
    'PH Demo · IELTS discount test', 'UAT A/B on PH Demo variants', 'running', 5,
    '2026-06-01', v_admin
  )
  ON CONFLICT (id) DO UPDATE SET status = 'running';

  INSERT INTO public.offer_ab_variants (id, experiment_id, offer_id, variant_code, label)
  VALUES
  ('a00b0001-0001-4000-8000-000000000001', 'ab100001-0001-4000-8000-000000000001',
   'a0200006-0006-4000-8000-000000000006', 'A', 'Variant A · 12%'),
  ('a00b0002-0002-4000-8000-000000000002', 'ab100001-0001-4000-8000-000000000001',
   'a0200007-0007-4000-8000-000000000007', 'B', 'Variant B · 8%')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.offer_ab_assignments (
    id, experiment_id, variant_id, client_id, counselor_id
  ) VALUES (
    'a1000001-0001-4000-8000-000000000001',
    'ab100001-0001-4000-8000-000000000001',
    'a00b0001-0001-4000-8000-000000000001',
    'c1000005-0005-4000-8000-000000000005', v_priya
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Journey enrollment (5Q) ──────────────────────────────────────────────
  IF v_journey_coaching IS NOT NULL THEN
    INSERT INTO public.offer_journey_enrollments (
      id, journey_id, client_id, counselor_id, status, enrolled_at, next_step_at
    ) VALUES (
      'a00a0001-0001-4000-8000-000000000001',
      v_journey_coaching,
      'c1000001-0001-4000-8000-000000000001', v_priya,
      'active', '2026-06-01', '2026-06-08'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- ── Branch contest ───────────────────────────────────────────────────────
  INSERT INTO public.incentive_branch_contests (
    id, name, period_key, metric, pool_amount, settlement_currency,
    min_branch_total, winner_mode, split_mode, status, is_active
  ) VALUES (
    'a0090001-0001-4000-8000-000000000001',
    'PH Demo · June branch challenge', v_period, 'net_revenue', 25000, 'INR',
    100000, 'top_branch', 'by_contribution', 'active', true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.incentive_contest_branches (contest_id, branch_id)
  VALUES
  ('a0090001-0001-4000-8000-000000000001', v_branch_genda),
  ('a0090001-0001-4000-8000-000000000001', v_branch_ajwa)
  ON CONFLICT DO NOTHING;

-- ── Lifecycle offers (library filters + status history) ───────────────────
  INSERT INTO public.offers (
    id, title, description, discount_type, discount_value, status, funding_source,
    audience, currency, is_active, requires_approval, per_client_limit,
    fl_contribution_pct, university_contribution_pct, created_by, branch_id,
    applicable_services, target_countries, valid_from, valid_to
  ) VALUES
  (
    'a0200008-0008-4000-8000-000000000008', 'PH Demo · Approved Canada push',
    'Approved — awaiting schedule', 'percentage', 12, 'approved', 'university',
    'global', 'INR', false, true, 1,
    0, 100, v_marcom, v_branch_genda,
    ARRAY['University Application'], ARRAY['CA'], '2026-07-01', '2026-07-31'
  ),
  (
    'a0200009-0009-4000-8000-000000000009', 'PH Demo · Scheduled July intake',
    'Scheduled activation', 'percentage', 10, 'scheduled', 'future_link',
    'global', 'INR', false, false, 1,
    100, NULL, v_marcom, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-25', '2026-07-15'
  ),
  (
    'a0200010-0010-4000-8000-000000000010', 'PH Demo · Pending review draft',
    'Submitted for MarCom review', 'percentage', 14, 'pending_review', 'future_link',
    'global', 'INR', false, true, 1,
    100, NULL, v_marcom, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], NULL, NULL
  ),
  (
    'a0200011-0011-4000-8000-000000000011', 'PH Demo · Expiring soon IELTS',
    'Ends this month', 'percentage', 8, 'expiring_soon', 'future_link',
    'global', 'INR', true, false, 1,
    100, NULL, v_marcom, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-28'
  ),
  (
    'a0200012-0012-4000-8000-000000000012', 'PH Demo · Archived winter promo',
    'Past campaign — archived', 'percentage', 15, 'archived', 'future_link',
    'global', 'INR', false, false, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2025-12-01', '2025-12-31'
  ),
  (
    'a0200013-0013-4000-8000-000000000013', 'PH Demo · Published field offer 8%',
    'Sample published promotion offer', 'percentage', 8, 'active', 'future_link',
    'group', 'INR', true, false, 2,
    100, NULL, v_marcom, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, title = EXCLUDED.title;

  INSERT INTO public.offer_status_history (id, offer_id, from_status, to_status, changed_by, note, created_at)
  VALUES
  ('a0120001-0001-4000-8000-000000000001', 'a0200008-0008-4000-8000-000000000008', 'draft', 'pending_review', v_marcom, 'PH Demo submitted', '2026-06-02'::timestamptz),
  ('a0120002-0002-4000-8000-000000000002', 'a0200008-0008-4000-8000-000000000008', 'pending_review', 'approved', v_admin, 'PH Demo approved', '2026-06-04'::timestamptz),
  ('a0120003-0003-4000-8000-000000000003', 'a0200009-0009-4000-8000-000000000009', 'approved', 'scheduled', v_marcom, 'PH Demo scheduled', '2026-06-05'::timestamptz),
  ('a0120004-0004-4000-8000-000000000004', 'a0200011-0011-4000-8000-000000000011', 'active', 'expiring_soon', NULL, 'PH Demo expiry tick', '2026-06-20'::timestamptz),
  ('a0120005-0005-4000-8000-000000000005', 'a0200012-0012-4000-8000-000000000012', 'expired', 'archived', v_admin, 'PH Demo archived', '2026-01-05'::timestamptz)
  ON CONFLICT (id) DO NOTHING;

  -- ── Corporate calendar (Offers studio → Calendar) ────────────────────────
  INSERT INTO public.campaign_calendar (
    id, name, campaign_type, start_date, end_date, owner_name, status, linked_offer_id, notes, created_by
  ) VALUES
  (
    'cc100001-0001-4000-8000-000000000001', 'PH Demo · Monsoon IELTS push', 'seasonal',
    '2026-06-01', '2026-06-30', 'Maya MarCom', 'live',
    'a0200001-0001-4000-8000-000000000001', 'Linked to active IELTS offer', v_marcom
  ),
  (
    'cc100002-0002-4000-8000-000000000002', 'PH Demo · Canada intake window', 'intake',
    '2026-06-15', '2026-07-15', 'Maya MarCom', 'planned',
    'a0200002-0002-4000-8000-000000000002', 'Admission discount campaign', v_marcom
  ),
  (
    'cc100003-0003-4000-8000-000000000003', 'PH Demo · Rakhi branch celebration', 'festival',
    '2026-08-10', '2026-08-20', 'Neha Manager', 'planned', NULL,
    'Branch event — offer TBD', v_manager
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, linked_offer_id = EXCLUDED.linked_offer_id;

  -- ── Segment library (Offers studio → Segments) ───────────────────────────
  INSERT INTO public.offer_groups (id, name, description, definition, is_active, created_by)
  VALUES
  (
    'a0110001-0001-4000-8000-000000000001', 'PH Demo · Coaching hot list',
    'Clients with recent coaching payments', 'coaching_services + verified payment in 30d', true, v_marcom
  ),
  (
    'a0110002-0002-4000-8000-000000000002', 'PH Demo · Study abroad prospects',
    'Admission interest without allied bundle', 'admission_services OR study_abroad profile', true, v_marcom
  ),
  (
    'a0110003-0003-4000-8000-000000000003', 'PH Demo · Birthday cohort June',
    'DOB in June — birthday auto-offer audience', 'date_of_birth month = 6', true, v_marcom
  )
  ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  INSERT INTO public.offer_group_members (group_id, client_id)
  VALUES
  ('a0110001-0001-4000-8000-000000000001', 'c1000001-0001-4000-8000-000000000001'),
  ('a0110001-0001-4000-8000-000000000001', 'c1000005-0005-4000-8000-000000000005'),
  ('a0110002-0002-4000-8000-000000000002', 'c1000002-0002-4000-8000-000000000002'),
  ('a0110002-0002-4000-8000-000000000002', 'c1000003-0003-4000-8000-000000000003'),
  ('a0110003-0003-4000-8000-000000000003', 'c1000001-0001-4000-8000-000000000001')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.offer_audience_targets (id, offer_id, group_id)
  VALUES
  ('a0130001-0001-4000-8000-000000000001', 'a0200001-0001-4000-8000-000000000001', 'a0110001-0001-4000-8000-000000000001'),
  ('a0130002-0002-4000-8000-000000000002', 'a0200013-0013-4000-8000-000000000013', 'a0110002-0002-4000-8000-000000000002')
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.offers SET audience = 'group'
   WHERE id IN (
     'a0200001-0001-4000-8000-000000000001',
     'a0200013-0013-4000-8000-000000000013'
   );

  -- ── Auto-offer rules (Offers studio → Automation) ──────────────────────────
  INSERT INTO public.offer_templates (
    id, name, trigger_type, discount_type, discount_value, max_discount_amount,
    validity_days_before, validity_days_after, trigger_event, target_countries,
    applicable_services, is_active, created_by
  ) VALUES
  (
    'a0140001-0001-4000-8000-000000000001', 'PH Demo · Birthday 10% coaching',
    'birthday', 'percentage', 10, 5000, 7, 7, NULL, ARRAY['IN'],
    ARRAY['IELTS Coaching'], true, v_marcom
  ),
  (
    'a0140002-0002-4000-8000-000000000002', 'PH Demo · First payment 5% workflow',
    'workflow', 'percentage', 5, 3000, 0, 14, 'first_verified_payment', ARRAY['IN','CA'],
    ARRAY['IELTS Coaching','University Application'], true, v_marcom
  ),
  (
    'a0140003-0003-4000-8000-000000000003', 'PH Demo · Referral flat ₹2000 (paused)',
    'manual', 'flat', 2000, 2000, 0, 30, NULL, ARRAY['IN'],
    ARRAY[]::text[], false, v_marcom
  )
  ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;

  -- ── Client offers + tracking (promotions attribution) ────────────────────
  INSERT INTO public.client_offers (id, client_id, offer_id, status, used_at, attached_by, source)
  VALUES
  (
    'a0210001-0001-4000-8000-000000000001',
    'c1000001-0001-4000-8000-000000000001',
    'a0200001-0001-4000-8000-000000000001', 'active', NULL, v_priya, 'counselor'
  ),
  (
    'a0210002-0002-4000-8000-000000000002',
    'c1000003-0003-4000-8000-000000000003',
    'a0200001-0001-4000-8000-000000000001', 'used', '2026-06-06'::timestamptz, v_priya, 'counselor'
  ),
  (
    'a0210003-0003-4000-8000-000000000003',
    'c1000005-0005-4000-8000-000000000005',
    'a0200006-0006-4000-8000-000000000006', 'active', NULL, v_priya, 'auto'
  )
  ON CONFLICT (client_id, offer_id) DO UPDATE SET
    status = EXCLUDED.status,
    used_at = EXCLUDED.used_at,
    attached_by = EXCLUDED.attached_by,
    source = EXCLUDED.source;

  INSERT INTO public.offer_tracking_codes (id, offer_id, counselor_id, code)
  VALUES (
    'a0150001-0001-4000-8000-000000000001',
    'a0200001-0001-4000-8000-000000000001', v_priya, 'PHDEMO-PRIYA-IELTS'
  )
  ON CONFLICT (code) DO NOTHING;

  UPDATE public.clients SET date_of_birth = '1998-06-12'
   WHERE id = 'c1000001-0001-4000-8000-000000000001';

  -- ── Analytics ROI (invoices + offer_events) ──────────────────────────────
  UPDATE public.client_invoices
     SET applied_offer_id = 'a0200001-0001-4000-8000-000000000001',
         offer_discount_amount = 4500,
         attributed_counselor_id = v_priya
   WHERE id = 'a00c0001-0001-4000-8000-000000000001';

  UPDATE public.client_invoices
     SET applied_offer_id = 'a0200002-0002-4000-8000-000000000002',
         offer_discount_amount = 18000,
         attributed_counselor_id = v_priya
   WHERE id = 'a00c0002-0002-4000-8000-000000000002';

  INSERT INTO public.offer_events (
    id, offer_id, client_id, counselor_id, event_type, channel, revenue_amount, created_at
  ) VALUES
  ('a0220001-0001-4000-8000-000000000001', 'a0200001-0001-4000-8000-000000000001', 'c1000001-0001-4000-8000-000000000001', v_priya, 'viewed', 'ph-demo', 0, '2026-06-04'::timestamptz),
  ('a0220002-0002-4000-8000-000000000002', 'a0200001-0001-4000-8000-000000000001', 'c1000001-0001-4000-8000-000000000001', v_priya, 'viewed', 'ph-demo', 0, '2026-06-05'::timestamptz),
  ('a0220003-0003-4000-8000-000000000003', 'a0200001-0001-4000-8000-000000000001', 'c1000001-0001-4000-8000-000000000001', v_priya, 'claimed', 'ph-demo', 0, '2026-06-05'::timestamptz),
  ('a0220004-0004-4000-8000-000000000004', 'a0200002-0002-4000-8000-000000000002', 'c1000002-0002-4000-8000-000000000002', v_priya, 'viewed', 'email', 0, '2026-06-07'::timestamptz),
  ('a0220005-0005-4000-8000-000000000005', 'a0200002-0002-4000-8000-000000000002', 'c1000002-0002-4000-8000-000000000002', v_priya, 'claimed', 'email', 0, '2026-06-08'::timestamptz),
  ('a0220006-0006-4000-8000-000000000006', 'a0200002-0002-4000-8000-000000000002', 'c1000002-0002-4000-8000-000000000002', v_priya, 'redeemed', 'ph-demo', 120000, '2026-06-08'::timestamptz),
  ('a0220007-0007-4000-8000-000000000007', 'a0200013-0013-4000-8000-000000000013', 'c1000003-0003-4000-8000-000000000003', v_priya, 'sent', 'ph-demo', 0, '2026-06-09'::timestamptz),
  ('a0220008-0008-4000-8000-000000000008', 'a0200006-0006-4000-8000-000000000006', 'c1000005-0005-4000-8000-000000000005', v_priya, 'sent', 'ph-demo', 0, '2026-06-10'::timestamptz)
  ON CONFLICT (id) DO NOTHING;

  -- ── Team view + competitions (Rohit + Ajwa branch revenue) ───────────────
  INSERT INTO public.incentive_qualifying_events (
    id, event_type, event_date, period_key, counselor_id, client_id, branch_id,
    amount, currency, source_type, dimensions, source_table, source_id
  ) VALUES
  (
    'a00e0005-0005-4000-8000-000000000005', 'first_verified_payment', '2026-06-06', v_period,
    v_rohit, 'c1000003-0003-4000-8000-000000000003', v_branch_genda,
    95000, 'INR', 'service_revenue',
    jsonb_build_object('master_key','coaching_services','service_code','IELTS'),
    'ph-demo', 'a0180005-0005-4000-8000-000000000005'::uuid
  ),
  (
    'a00e0006-0006-4000-8000-000000000006', 'first_verified_payment', '2026-06-11', v_period,
    v_rohit, 'c1000003-0003-4000-8000-000000000003', v_branch_genda,
    42000, 'INR', 'service_revenue',
    jsonb_build_object('master_key','allied_services','service_code','FOREX'),
    'ph-demo', 'a0180006-0006-4000-8000-000000000006'::uuid
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_branch_ajwa IS NOT NULL THEN
    INSERT INTO public.incentive_qualifying_events (
      id, event_type, event_date, period_key, counselor_id, client_id, branch_id,
      amount, currency, source_type, dimensions, source_table, source_id
    ) VALUES
    (
      'a00e0007-0007-4000-8000-000000000007', 'first_verified_payment', '2026-06-04', v_period,
      v_admin, NULL, v_branch_ajwa,
      88000, 'INR', 'service_revenue',
      jsonb_build_object('master_key','admission_services','service_code','UNIV_APP'),
      'ph-demo', 'a0180007-0007-4000-8000-000000000007'::uuid
    ),
    (
      'a00e0008-0008-4000-8000-000000000008', 'first_verified_payment', '2026-06-09', v_period,
      v_admin, NULL, v_branch_ajwa,
      54000, 'INR', 'service_revenue',
      jsonb_build_object('master_key','coaching_services','service_code','IELTS'),
      'ph-demo', 'a0180008-0008-4000-8000-000000000008'::uuid
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF v_rohit IS DISTINCT FROM v_priya THEN
    INSERT INTO public.counselor_performance_scores (
      id, counselor_id, period_key,
      revenue_achievement, wallet_impact_revenue, wallet_used, wallet_roi,
      conversion_rate, client_satisfaction, collections_received, total_score
    ) VALUES (
      'a0100002-0002-4000-8000-000000000002', v_rohit, v_period,
      0, 52000, 3500, 14.9,
      58, 82, 137000, 62
    )
    ON CONFLICT (id) DO UPDATE SET
      counselor_id = EXCLUDED.counselor_id,
      period_key = EXCLUDED.period_key,
      revenue_achievement = EXCLUDED.revenue_achievement,
      wallet_impact_revenue = EXCLUDED.wallet_impact_revenue,
      wallet_used = EXCLUDED.wallet_used,
      wallet_roi = EXCLUDED.wallet_roi,
      conversion_rate = EXCLUDED.conversion_rate,
      client_satisfaction = EXCLUDED.client_satisfaction,
      collections_received = EXCLUDED.collections_received,
      total_score = EXCLUDED.total_score;
  END IF;

  INSERT INTO public.incentive_line_items (
    id, run_id, counselor_id, source_type, client_id,
    base_amount, base_currency, earned_amount, settlement_currency, note
  ) VALUES (
    'a0060003-0003-4000-8000-000000000003',
    'a0050001-0001-4000-8000-000000000001', v_rohit, 'service_revenue',
    'c1000003-0003-4000-8000-000000000003',
    95000, 'INR', 4750, 'INR', 'PH Demo Rohit line — team view'
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.incentive_targets
     SET plan_id = 'a0040001-0001-4000-8000-000000000001'
   WHERE id = 'a0030001-0001-4000-8000-000000000001';

  -- ── Incentive plan rules + slabs (Plans & rules screen) ────────────────────
  INSERT INTO public.incentive_rules (
    id, plan_id, name, sort_order, is_active, scope_preset, source_type, metric,
    rate_type, rate_value, stacking_mode, settlement_currency
  ) VALUES
  (
    'a0160001-0001-4000-8000-000000000001', 'a0040001-0001-4000-8000-000000000001',
    'PH Demo · Core revenue 5%', 1, true, 'coaching_admission',
    'service_revenue', 'net_revenue', 'percent', 5, 'additive', 'INR'
  ),
  (
    'a0160002-0002-4000-8000-000000000002', 'a0040001-0001-4000-8000-000000000001',
    'PH Demo · Allied slab bonus', 2, true, 'allied_only',
    'service_revenue', 'net_revenue', 'slab', 0, 'cap', 'INR'
  )
  ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;

  INSERT INTO public.incentive_slabs (
    id, plan_id, rule_id, source_type, metric, min_threshold, max_threshold,
    rate_type, rate_value, service_filter, sort_order
  ) VALUES
  (
    'a0170001-0001-4000-8000-000000000001', 'a0040001-0001-4000-8000-000000000001',
    'a0160002-0002-4000-8000-000000000002', 'service_revenue', 'net_revenue',
    0, 50000, 'percent', 3, 'allied_services', 1
  ),
  (
    'a0170002-0002-4000-8000-000000000002', 'a0040001-0001-4000-8000-000000000001',
    'a0160002-0002-4000-8000-000000000002', 'service_revenue', 'net_revenue',
    50000, NULL, 'percent', 5, 'allied_services', 2
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.fn_seed_performance_hub_demo() IS
  'Loads PH-DEMO-* clients, wallets, queues, offers studio, incentives for period 2026-06 (UAT).';

GRANT EXECUTE ON FUNCTION public.fn_seed_performance_hub_demo() TO authenticated, service_role;

SELECT public.fn_seed_performance_hub_demo();
