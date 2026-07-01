-- Direct Institution Partner UAT demo seed (Ontario polytechnics/colleges)
-- Tag: metadata.demo_pack = 'crm-direct-uat-v1'
-- Idempotent: fn_seed_commission_direct_partner_demo() cleans and re-applies fixed UUID rows.

CREATE OR REPLACE FUNCTION public.fn_seed_commission_direct_partner_demo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack constant text := 'crm-direct-uat-v1';
  v_ca_country uuid;

  v_seneca constant uuid := '11111111-1111-1111-1111-111111110001';
  v_conestoga constant uuid := '11111111-1111-1111-1111-111111110002';
  v_humber constant uuid := '44444444-1111-1111-1111-111111110001';
  v_sheridan constant uuid := '44444444-1111-1111-1111-111111110002';

  v_route_seneca uuid;
  v_route_conestoga uuid;
  v_route_humber uuid;
  v_route_sheridan uuid;

  v_agr_seneca constant uuid := 'd1e00301-0001-4000-8000-000000000001';
  v_agr_conestoga constant uuid := 'd1e00302-0002-4000-8000-000000000002';
  v_agr_humber constant uuid := 'd1e00303-0003-4000-8000-000000000003';
  v_agr_sheridan constant uuid := 'd1e00304-0004-4000-8000-000000000004';

  v_av_seneca constant uuid := 'd1e00311-0001-4000-8000-000000000011';
  v_av_conestoga constant uuid := 'd1e00312-0002-4000-8000-000000000012';
  v_av_humber constant uuid := 'd1e00313-0003-4000-8000-000000000013';
  v_av_sheridan constant uuid := 'd1e00314-0004-4000-8000-000000000014';

  v_comm_seneca constant uuid := 'd1e00401-0001-4000-8000-000000000001';
  v_comm_conestoga constant uuid := 'd1e00402-0002-4000-8000-000000000002';
  v_comm_humber constant uuid := 'd1e00403-0003-4000-8000-000000000003';
  v_comm_sheridan constant uuid := 'd1e00404-0004-4000-8000-000000000004';

  v_rule_seneca_base constant uuid := 'd1e00411-0001-4000-8000-000000000011';
  v_rule_seneca_bonus constant uuid := 'd1e00412-0001-4000-8000-000000000012';
  v_rule_conestoga_base constant uuid := 'd1e00421-0002-4000-8000-000000000021';
  v_rule_humber_base constant uuid := 'd1e00431-0003-4000-8000-000000000031';
  v_rule_sheridan_base constant uuid := 'd1e00441-0004-4000-8000-000000000041';

  v_bp_seneca constant uuid := 'd1e00501-0001-4000-8000-000000000001';
  v_bp_conestoga constant uuid := 'd1e00502-0002-4000-8000-000000000002';
  v_bp_humber constant uuid := 'd1e00503-0003-4000-8000-000000000003';
  v_bp_sheridan constant uuid := 'd1e00504-0004-4000-8000-000000000004';

  v_ec_seneca constant uuid := 'd1e00601-0001-4000-8000-000000000001';
  v_ec_conestoga constant uuid := 'd1e00602-0002-4000-8000-000000000002';
  v_ec_humber constant uuid := 'd1e00603-0003-4000-8000-000000000003';
  v_ec_sheridan constant uuid := 'd1e00604-0004-4000-8000-000000000004';

  v_cyc_seneca constant uuid := 'd1e00701-0001-4000-8000-000000000001';
  v_cyc_conestoga constant uuid := 'd1e00702-0002-4000-8000-000000000002';
  v_cyc_humber constant uuid := 'd1e00703-0003-4000-8000-000000000003';
  v_cyc_sheridan constant uuid := 'd1e00704-0004-4000-8000-000000000004';

  v_stu_priya constant uuid := 'd1e00801-0001-4000-8000-000000000001';
  v_stu_ananya constant uuid := 'd1e00802-0002-4000-8000-000000000002';
  v_stu_rohan constant uuid := 'd1e00803-0003-4000-8000-000000000003';
  v_stu_james constant uuid := 'd1e00804-0004-4000-8000-000000000004';
  v_stu_fatima constant uuid := 'd1e00805-0005-4000-8000-000000000005';
  v_stu_daniel constant uuid := 'd1e00806-0006-4000-8000-000000000006';
  v_stu_maria constant uuid := 'd1e00807-0007-4000-8000-000000000007';
  v_stu_ahmed_src constant uuid := 'd1e00808-0008-4000-8000-000000000008';
  v_stu_ahmed_tgt constant uuid := 'd1e00809-0009-4000-8000-000000000009';

  v_snap_priya constant uuid := 'd1e00881-0001-4000-8000-000000000001';
  v_snap_ananya constant uuid := 'd1e00882-0002-4000-8000-000000000002';
  v_snap_fatima constant uuid := 'd1e00885-0005-4000-8000-000000000005';
  v_snap_ahmed_tgt constant uuid := 'd1e00889-0009-4000-8000-000000000009';

  v_inv_seneca constant uuid := 'd1e00901-0001-4000-8000-000000000001';
  v_inv_conestoga constant uuid := 'd1e00902-0002-4000-8000-000000000002';
  v_li_priya constant uuid := 'd1e00911-0001-4000-8000-000000000011';
  v_li_fatima constant uuid := 'd1e00921-0002-4000-8000-000000000021';

  v_rcpt_partial constant uuid := 'd1e00a01-0001-4000-8000-000000000001';
  v_rcpt_draft constant uuid := 'd1e00a02-0002-4000-8000-000000000002';
  v_rcpt_ia constant uuid := 'd1e00a11-0001-4000-8000-000000000011';
  v_rcpt_sa constant uuid := 'd1e00a21-0001-4000-8000-000000000021';

  v_xfer constant uuid := 'd1e00b01-0001-4000-8000-000000000001';

  v_meta jsonb := jsonb_build_object('demo_pack', v_pack, 'scenario', 'direct-institution-uat');
BEGIN
  SELECT id INTO v_ca_country FROM public.upi_countries WHERE iso_alpha2 = 'CA' LIMIT 1;

  -- ── Cleanup (reverse FK order) ───────────────────────────────────────────
  DELETE FROM public.upi_commission_receipt_student_allocations sa
  USING public.upi_commission_receipts r
  WHERE sa.receipt_id = r.id AND r.metadata->>'demo_pack' = v_pack;

  DELETE FROM public.upi_commission_receipt_invoice_allocations ia
  USING public.upi_commission_receipts r
  WHERE ia.receipt_id = r.id AND r.metadata->>'demo_pack' = v_pack;

  UPDATE public.upi_commission_invoices
  SET last_receipt_id = NULL
  WHERE metadata->>'demo_pack' = v_pack;

  UPDATE public.upi_commission_students
  SET last_receipt_id = NULL,
      commission_snapshot_id = NULL,
      invoice_id = NULL
  WHERE metadata->>'demo_pack' = v_pack;

  DELETE FROM public.upi_commission_receipts WHERE metadata->>'demo_pack' = v_pack;

  DELETE FROM public.upi_invoice_line_items
  WHERE invoice_id IN (SELECT id FROM public.upi_commission_invoices WHERE metadata->>'demo_pack' = v_pack);

  DELETE FROM public.upi_commission_invoices WHERE metadata->>'demo_pack' = v_pack;

  DELETE FROM public.upi_commission_transfer_events WHERE metadata->>'demo_pack' = v_pack;

  ALTER TABLE public.upi_commission_snapshots DISABLE TRIGGER trg_block_snapshot_update;
  DELETE FROM public.upi_commission_snapshots WHERE metadata->>'demo_pack' = v_pack;
  ALTER TABLE public.upi_commission_snapshots ENABLE TRIGGER trg_block_snapshot_update;

  DELETE FROM public.upi_commission_students WHERE metadata->>'demo_pack' = v_pack;
  DELETE FROM public.upi_claim_cycles WHERE metadata->>'demo_pack' = v_pack;
  DELETE FROM public.institution_fee_schedule WHERE notes LIKE '[crm-direct-uat-v1]%';

  DELETE FROM public.upi_commission_eligibility_configs WHERE metadata->>'demo_pack' = v_pack;
  DELETE FROM public.upi_billing_profiles WHERE metadata->>'demo_pack' = v_pack;

  DELETE FROM public.upi_commission_rules
  WHERE commission_id IN (
    v_comm_seneca, v_comm_conestoga, v_comm_humber, v_comm_sheridan
  );

  UPDATE public.upi_partnership_routes
  SET default_commission_id = NULL
  WHERE default_commission_id IN (
    v_comm_seneca, v_comm_conestoga, v_comm_humber, v_comm_sheridan
  );

  DELETE FROM public.upi_commissions
  WHERE id IN (v_comm_seneca, v_comm_conestoga, v_comm_humber, v_comm_sheridan);

  DELETE FROM public.upi_agreement_versions
  WHERE id IN (v_av_seneca, v_av_conestoga, v_av_humber, v_av_sheridan);

  DELETE FROM public.upi_agreements
  WHERE id IN (v_agr_seneca, v_agr_conestoga, v_agr_humber, v_agr_sheridan);

  -- ── Institutions (Seneca + Conestoga exist; upsert Humber + Sheridan) ───────
  UPDATE public.upi_institutions SET
    name = 'Seneca Polytechnic',
    slug = COALESCE(NULLIF(trim(slug), ''), 'seneca-polytechnic'),
    country_name = 'Canada',
    country_id = COALESCE(country_id, v_ca_country),
    city = COALESCE(NULLIF(trim(city), ''), 'Toronto'),
    state_province = 'Ontario',
    institution_type = COALESCE(institution_type, 'Polytechnic'),
    website_url = COALESCE(NULLIF(trim(website_url), ''), 'https://www.senecapolytechnic.ca'),
    is_partner = true,
    partner_since = COALESCE(partner_since, DATE '2023-09-01'),
    institution_status = 'Active',
    is_active = true,
    metadata = metadata || v_meta || jsonb_build_object('demo_institution', 'seneca')
  WHERE id = v_seneca;

  UPDATE public.upi_institutions SET
    name = 'Conestoga College',
    slug = COALESCE(NULLIF(trim(slug), ''), 'conestoga-college'),
    country_name = 'Canada',
    country_id = COALESCE(country_id, v_ca_country),
    city = COALESCE(NULLIF(trim(city), ''), 'Kitchener'),
    state_province = 'Ontario',
    institution_type = COALESCE(institution_type, 'Public College'),
    website_url = COALESCE(NULLIF(trim(website_url), ''), 'https://www.conestogac.on.ca'),
    is_partner = true,
    partner_since = COALESCE(partner_since, DATE '2023-06-01'),
    institution_status = 'Active',
    is_active = true,
    metadata = metadata || v_meta || jsonb_build_object('demo_institution', 'conestoga')
  WHERE id = v_conestoga;

  INSERT INTO public.upi_institutions (
    id, name, slug, country_id, country_name, city, state_province, institution_type,
    website_url, is_active, is_partner, partner_since, institution_status, metadata
  ) VALUES (
    v_humber, 'Humber Polytechnic', 'humber-polytechnic', v_ca_country, 'Canada',
    'Toronto', 'Ontario', 'Polytechnic', 'https://www.humber.ca',
    true, true, DATE '2024-01-15', 'Active', v_meta || jsonb_build_object('demo_institution', 'humber')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    country_name = EXCLUDED.country_name,
    city = EXCLUDED.city,
    state_province = EXCLUDED.state_province,
    institution_type = EXCLUDED.institution_type,
    website_url = EXCLUDED.website_url,
    is_partner = true,
    institution_status = 'Active',
    metadata = public.upi_institutions.metadata || EXCLUDED.metadata;

  INSERT INTO public.upi_institutions (
    id, name, slug, country_id, country_name, city, state_province, institution_type,
    website_url, is_active, is_partner, partner_since, institution_status, metadata
  ) VALUES (
    v_sheridan, 'Sheridan College', 'sheridan-college', v_ca_country, 'Canada',
    'Oakville', 'Ontario', 'Public College', 'https://www.sheridancollege.ca',
    true, true, DATE '2024-03-01', 'Active', v_meta || jsonb_build_object('demo_institution', 'sheridan')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    country_name = EXCLUDED.country_name,
    city = EXCLUDED.city,
    state_province = EXCLUDED.state_province,
    institution_type = EXCLUDED.institution_type,
    website_url = EXCLUDED.website_url,
    is_partner = true,
    institution_status = 'Active',
    metadata = public.upi_institutions.metadata || EXCLUDED.metadata;

  -- Campuses (upsert by institution + name)
  INSERT INTO public.upi_campuses (id, institution_id, name, city, state_province, country_name, is_main_campus)
  VALUES
    ('d1e00101-0001-4000-8000-000000000001', v_seneca, 'Newnham Campus', 'Toronto', 'Ontario', 'Canada', true),
    ('d1e00102-0002-4000-8000-000000000002', v_conestoga, 'Kitchener - Doon Campus', 'Kitchener', 'Ontario', 'Canada', true),
    ('d1e00103-0003-4000-8000-000000000003', v_humber, 'North Campus', 'Toronto', 'Ontario', 'Canada', true),
    ('d1e00104-0004-4000-8000-000000000004', v_sheridan, 'Trafalgar Road Campus', 'Oakville', 'Ontario', 'Canada', true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    city = EXCLUDED.city,
    is_main_campus = EXCLUDED.is_main_campus;

  -- ── Agreements + published versions ───────────────────────────────────────
  INSERT INTO public.upi_agreements (id, institution_id, title, agreement_type, valid_from, status, signed_date, notes, metadata)
  VALUES
    (v_agr_seneca, v_seneca, 'Seneca Direct Agency Agreement 2026', 'commission', DATE '2026-01-01', 'active', DATE '2025-11-15',
     'Direct partnership — Fall 2026 intake commission schedule', v_meta || '{"version":"2026-v1"}'::jsonb),
    (v_agr_conestoga, v_conestoga, 'Conestoga Direct Agency Agreement 2026', 'commission', DATE '2026-01-01', 'active', DATE '2025-10-20',
     'Direct partnership — business & technology programs', v_meta),
    (v_agr_humber, v_humber, 'Humber Direct Agency Agreement 2026', 'commission', DATE '2026-01-01', 'active', DATE '2025-12-01',
     'Direct partnership — hospitality & business', v_meta),
    (v_agr_sheridan, v_sheridan, 'Sheridan Direct Agency Agreement 2026', 'commission', DATE '2026-01-01', 'active', DATE '2025-12-10',
     'Direct partnership — media & animation programs', v_meta);

  INSERT INTO public.upi_agreement_versions (id, agreement_id, version_number, change_summary, effective_from, effective_to, status)
  VALUES
    (v_av_seneca, v_agr_seneca, 1, 'Initial published commission schedule', DATE '2026-01-01', NULL, 'published'),
    (v_av_conestoga, v_agr_conestoga, 1, 'Initial published commission schedule', DATE '2026-01-01', NULL, 'published'),
    (v_av_humber, v_agr_humber, 1, 'Initial published commission schedule', DATE '2026-01-01', NULL, 'published'),
    (v_av_sheridan, v_agr_sheridan, 1, 'Initial published commission schedule', DATE '2026-01-01', NULL, 'published');

  -- ── Direct partnership routes ─────────────────────────────────────────────
  SELECT id INTO v_route_seneca FROM public.upi_partnership_routes
  WHERE institution_id = v_seneca AND channel_type = 'direct' AND status = 'active' LIMIT 1;
  IF v_route_seneca IS NULL THEN
    INSERT INTO public.upi_partnership_routes (
      id, institution_id, channel_type, display_name, status, valid_from, is_default_route,
      priority_rank, agreement_id, commission_model, commission_rate, commission_currency, payment_terms, metadata
    ) VALUES (
      'd1e00201-0001-4000-8000-000000000001', v_seneca, 'direct', 'Seneca Direct Partnership', 'active',
      DATE '2026-01-01', true, 1, v_agr_seneca, 'hybrid', 16.67, 'CAD', 'Net 30', v_meta
    ) RETURNING id INTO v_route_seneca;
  ELSE
    UPDATE public.upi_partnership_routes SET
      display_name = 'Seneca Direct Partnership',
      agreement_id = v_agr_seneca,
      commission_model = 'hybrid',
      metadata = metadata || v_meta
    WHERE id = v_route_seneca;
  END IF;

  SELECT id INTO v_route_conestoga FROM public.upi_partnership_routes
  WHERE institution_id = v_conestoga AND channel_type = 'direct' AND status = 'active' LIMIT 1;
  IF v_route_conestoga IS NULL THEN
    INSERT INTO public.upi_partnership_routes (
      id, institution_id, channel_type, display_name, status, valid_from, is_default_route,
      priority_rank, agreement_id, commission_model, commission_rate, commission_currency, payment_terms, metadata
    ) VALUES (
      'd1e00202-0002-4000-8000-000000000002', v_conestoga, 'direct', 'Conestoga Direct Partnership', 'active',
      DATE '2026-01-01', true, 1, v_agr_conestoga, 'fixed', NULL, 'CAD', 'Net 45', v_meta
    ) RETURNING id INTO v_route_conestoga;
  ELSE
    UPDATE public.upi_partnership_routes SET
      display_name = 'Conestoga Direct Partnership',
      agreement_id = v_agr_conestoga,
      metadata = metadata || v_meta
    WHERE id = v_route_conestoga;
  END IF;

  SELECT id INTO v_route_humber FROM public.upi_partnership_routes
  WHERE institution_id = v_humber AND channel_type = 'direct' AND status = 'active' LIMIT 1;
  IF v_route_humber IS NULL THEN
    INSERT INTO public.upi_partnership_routes (
      id, institution_id, channel_type, display_name, status, valid_from, is_default_route,
      priority_rank, agreement_id, commission_model, commission_rate, commission_currency, payment_terms, metadata
    ) VALUES (
      'd1e00203-0003-4000-8000-000000000003', v_humber, 'direct', 'Humber Direct Partnership', 'active',
      DATE '2026-01-01', true, 1, v_agr_humber, 'percentage', 14.0, 'CAD', 'Net 30', v_meta
    ) RETURNING id INTO v_route_humber;
  ELSE
    UPDATE public.upi_partnership_routes SET agreement_id = v_agr_humber, metadata = metadata || v_meta
    WHERE id = v_route_humber;
  END IF;

  SELECT id INTO v_route_sheridan FROM public.upi_partnership_routes
  WHERE institution_id = v_sheridan AND channel_type = 'direct' AND status = 'active' LIMIT 1;
  IF v_route_sheridan IS NULL THEN
    INSERT INTO public.upi_partnership_routes (
      id, institution_id, channel_type, display_name, status, valid_from, is_default_route,
      priority_rank, agreement_id, commission_model, commission_rate, commission_currency, payment_terms, metadata
    ) VALUES (
      'd1e00204-0004-4000-8000-000000000004', v_sheridan, 'direct', 'Sheridan Direct Partnership', 'active',
      DATE '2026-01-01', true, 1, v_agr_sheridan, 'percentage', 15.0, 'CAD', 'Net 30', v_meta
    ) RETURNING id INTO v_route_sheridan;
  ELSE
    UPDATE public.upi_partnership_routes SET agreement_id = v_agr_sheridan, metadata = metadata || v_meta
    WHERE id = v_route_sheridan;
  END IF;

  -- ── Commission structures (published / active) ────────────────────────────
  INSERT INTO public.upi_commissions (
    id, institution_id, agreement_id, agreement_version_id, name, model_type, currency,
    description, is_active, is_proposed, effective_from, published_at, base_rate_percent, metadata
  ) VALUES
    (v_comm_seneca, v_seneca, v_agr_seneca, v_av_seneca, 'Seneca Fall 2026 Direct', 'hybrid', 'CAD',
     'CAD 3,000 base + CAD 500 India Business bonus', true, false, DATE '2026-01-01', now(), 16.67, v_meta),
    (v_comm_conestoga, v_conestoga, v_agr_conestoga, v_av_conestoga, 'Conestoga Fall 2026 Direct', 'fixed', 'CAD',
     'CAD 2,800 flat per eligible enrollment', true, false, DATE '2026-01-01', now(), NULL, v_meta),
    (v_comm_humber, v_humber, v_agr_humber, v_av_humber, 'Humber Fall 2026 Direct', 'percentage', 'CAD',
     '14% of tuition paid (commissionable base)', true, false, DATE '2026-01-01', now(), 14.0, v_meta),
    (v_comm_sheridan, v_sheridan, v_agr_sheridan, v_av_sheridan, 'Sheridan Fall 2026 Direct', 'percentage', 'CAD',
     '15% of tuition paid', true, false, DATE '2026-01-01', now(), 15.0, v_meta);

  INSERT INTO public.upi_commission_rules (
    id, commission_id, rule_name, rule_type, payout_amount, payout_type, payout_currency,
    scope_country, scope_program_category, scope_campus, sort_order, precedence_rank
  ) VALUES
    (v_rule_seneca_base, v_comm_seneca, 'Base enrollment commission', 'base', 3000, 'fixed', 'CAD', NULL, NULL, NULL, 1, 100),
    (v_rule_seneca_bonus, v_comm_seneca, 'India Business bonus', 'bonus', 500, 'fixed', 'CAD', 'India', 'Business', 'Newnham Campus', 2, 50),
    (v_rule_conestoga_base, v_comm_conestoga, 'Standard direct commission', 'base', 2800, 'fixed', 'CAD', NULL, NULL, NULL, 1, 100),
    (v_rule_humber_base, v_comm_humber, '14% tuition commission', 'base', 14, 'percentage', 'CAD', NULL, NULL, NULL, 1, 100),
    (v_rule_sheridan_base, v_comm_sheridan, '15% tuition commission', 'base', 15, 'percentage', 'CAD', NULL, NULL, NULL, 1, 100);

  UPDATE public.upi_partnership_routes SET default_commission_id = v_comm_seneca WHERE id = v_route_seneca;
  UPDATE public.upi_partnership_routes SET default_commission_id = v_comm_conestoga WHERE id = v_route_conestoga;
  UPDATE public.upi_partnership_routes SET default_commission_id = v_comm_humber WHERE id = v_route_humber;
  UPDATE public.upi_partnership_routes SET default_commission_id = v_comm_sheridan WHERE id = v_route_sheridan;

  -- ── Billing profiles ──────────────────────────────────────────────────────
  INSERT INTO public.upi_billing_profiles (
    id, institution_id, profile_name, legal_entity_name, billing_address, billing_email,
    default_invoice_currency, default_receipt_currency, payment_terms_days,
    remittance_instructions, is_default, status, metadata
  ) VALUES
    (v_bp_seneca, v_seneca, 'FLC — Seneca Direct', 'Future Link Consultants Inc.',
     '5 Vandorf Street, Toronto, ON M1B 4Y3', 'overseasrelations@futurelinkconsultants.com',
     'CAD', 'CAD', 30, 'Wire to FLC CAD operating account — ref: Seneca commission', true, 'active', v_meta),
    (v_bp_conestoga, v_conestoga, 'FLC — Conestoga Direct', 'Future Link Consultants Inc.',
     '5 Vandorf Street, Toronto, ON M1B 4Y3', 'overseasrelations@futurelinkconsultants.com',
     'CAD', 'CAD', 45, 'Wire to FLC CAD operating account — ref: Conestoga commission', true, 'active', v_meta),
    (v_bp_humber, v_humber, 'FLC — Humber Direct', 'Future Link Consultants Inc.',
     '5 Vandorf Street, Toronto, ON M1B 4Y3', 'overseasrelations@futurelinkconsultants.com',
     'CAD', 'CAD', 30, 'Wire to FLC CAD operating account — ref: Humber commission', true, 'active', v_meta),
    (v_bp_sheridan, v_sheridan, 'FLC — Sheridan Direct', 'Future Link Consultants Inc.',
     '5 Vandorf Street, Toronto, ON M1B 4Y3', 'overseasrelations@futurelinkconsultants.com',
     'CAD', 'CAD', 30, 'Wire to FLC CAD operating account — ref: Sheridan commission', true, 'active', v_meta);

  -- ── Eligibility configs (published) ───────────────────────────────────────
  INSERT INTO public.upi_commission_eligibility_configs (
    id, institution_id, partnership_route_id, agreement_version_id, config_name, version_number,
    effective_from, status, trigger_type, notes, metadata
  ) VALUES
    (v_ec_seneca, v_seneca, v_route_seneca, v_av_seneca, 'Seneca Direct — Visa + Enrollment', 1,
     DATE '2026-01-01', 'published', 'visa', 'Study permit approved required before eligibility', v_meta),
    (v_ec_conestoga, v_conestoga, v_route_conestoga, v_av_conestoga, 'Conestoga Direct — Deposit', 1,
     DATE '2026-01-01', 'published', 'deposit', 'Minimum deposit confirmed on student row', v_meta),
    (v_ec_humber, v_humber, v_route_humber, v_av_humber, 'Humber Direct — Enrollment', 1,
     DATE '2026-01-01', 'published', 'enrolled', 'Enrollment confirmed by institution', v_meta),
    (v_ec_sheridan, v_sheridan, v_route_sheridan, v_av_sheridan, 'Sheridan Direct — Deposit', 1,
     DATE '2026-01-01', 'published', 'deposit', 'Deposit paid — deferrals may use hold + expected claim date', v_meta);

  -- ── Fee schedules (ACTIVE) ────────────────────────────────────────────────
  INSERT INTO public.institution_fee_schedule (
    id, upi_institution_id, fee_type, amount, currency, fee_accuracy, verification_method,
    effective_from, status, notes
  ) VALUES
    ('d1e0c01-0001-4000-8000-000000000001', v_seneca, 'APPLICATION', 90, 'CAD', 'EXACT', 'WEBSITE', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Seneca international application fee'),
    ('d1e0c02-0001-4000-8000-000000000002', v_seneca, 'TUITION', 18000, 'CAD', 'APPROXIMATE', 'AGREEMENT', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Business PG Diploma — annual tuition guide'),
    ('d1e0c03-0001-4000-8000-000000000003', v_seneca, 'DEPOSIT', 5000, 'CAD', 'EXACT', 'LOA', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Seneca deposit to secure seat'),
    ('d1e0c04-0002-4000-8000-000000000004', v_conestoga, 'APPLICATION', 100, 'CAD', 'EXACT', 'WEBSITE', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Conestoga application fee'),
    ('d1e0c05-0002-4000-8000-000000000005', v_conestoga, 'TUITION', 16800, 'CAD', 'APPROXIMATE', 'AGREEMENT', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Business diploma tuition guide'),
    ('d1e0c06-0003-4000-8000-000000000006', v_humber, 'APPLICATION', 100, 'CAD', 'EXACT', 'WEBSITE', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Humber application fee'),
    ('d1e0c07-0003-4000-8000-000000000007', v_humber, 'TUITION', 17500, 'CAD', 'APPROXIMATE', 'WEBSITE', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Hospitality Management tuition guide'),
    ('d1e0c08-0004-4000-8000-000000000008', v_sheridan, 'APPLICATION', 95, 'CAD', 'EXACT', 'WEBSITE', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Sheridan application fee'),
    ('d1e0c09-0004-4000-8000-000000000009', v_sheridan, 'TUITION', 19200, 'CAD', 'APPROXIMATE', 'AGREEMENT', DATE '2026-01-01', 'ACTIVE', '[crm-direct-uat-v1] Animation Advanced Diploma tuition guide');

  -- ── Claim cycles Fall 2026 ────────────────────────────────────────────────
  INSERT INTO public.upi_claim_cycles (
    id, institution_id, partnership_route_id, payer_type, period_label, intake, status,
    claim_due_date, invoice_due_date, total_expected, currency, notes, metadata
  ) VALUES
    (v_cyc_seneca, v_seneca, v_route_seneca, 'institution', 'Fall 2026', 'Fall 2026', 'submitted',
     DATE '2026-11-30', DATE '2027-01-15', 5555, 'CAD', 'Seneca direct UAT — includes partial payment demo', v_meta),
    (v_cyc_conestoga, v_conestoga, v_route_conestoga, 'institution', 'Fall 2026', 'Fall 2026', 'submitted',
     DATE '2026-11-30', DATE '2027-01-31', 2400, 'CAD', 'Conestoga — institution-reduced commission scenario', v_meta),
    (v_cyc_humber, v_humber, v_route_humber, 'institution', 'Fall 2026', 'Fall 2026', 'open',
     DATE '2026-12-15', DATE '2027-02-01', 0, 'CAD', 'Humber — withdrawn student reference row', v_meta),
    (v_cyc_sheridan, v_sheridan, v_route_sheridan, 'institution', 'Fall 2026', 'Fall 2026', 'open',
     DATE '2026-12-15', DATE '2027-02-01', 0, 'CAD', 'Sheridan — deferral scenario', v_meta);

  -- ── Students ──────────────────────────────────────────────────────────────
  INSERT INTO public.upi_commission_students (
    id, claim_cycle_id, institution_id, partnership_route_id, channel_type,
    commission_id, agreement_version_id, eligibility_config_id, billing_profile_id,
    matched_rule_id, student_name, student_id_at_institution, nationality, country_of_origin,
    program_name, program_level, campus, intake_term, intake_year,
    study_permit_approved_date, enrollment_status, enrollment_confirmed_date,
    tuition_amount, tuition_currency, tuition_paid_amount, tuition_paid_date,
    eligibility_status, claim_status, payment_status,
    expected_amount, commission_amount, commission_rate_applied,
    commission_snapshot_id, invoice_id,
    hold_status, hold_reason, hold_notes, expected_claim_date,
    approved_amount, institution_validation_notes,
    submitted_by_agency_date, eligibility_date,
    amount_received, amount_outstanding,
    metadata
  ) VALUES
    -- S1 Priya: fully commissionable, submitted, partial payment received
    (v_stu_priya, v_cyc_seneca, v_seneca, v_route_seneca, 'direct',
     v_comm_seneca, v_av_seneca, v_ec_seneca, v_bp_seneca, v_rule_seneca_base,
     'Priya Sharma', 'SEN-2026-1042', 'India', 'India',
     'Business Administration (International)', 'PG Diploma', 'Newnham Campus', 'Fall 2026', 2026,
     DATE '2026-07-20', 'enrolled', DATE '2026-08-28',
     18000, 'CAD', 18000, DATE '2026-08-15',
     'eligible', 'submitted', 'partially_paid',
     3500, 3500, NULL,
     v_snap_priya, v_inv_seneca,
     'none', NULL, NULL, NULL,
     NULL, NULL,
     DATE '2026-09-15', DATE '2026-08-28',
     2000, 1500,
     v_meta || '{"scenario":"fully_commissionable_partial_payment","demo_student":"priya"}'::jsonb),

    -- S2 Ananya: scholarship reduces commissionable base
    (v_stu_ananya, v_cyc_seneca, v_seneca, v_route_seneca, 'direct',
     v_comm_seneca, v_av_seneca, v_ec_seneca, v_bp_seneca, v_rule_seneca_base,
     'Ananya Kapoor', 'SEN-2026-1188', 'India', 'India',
     'Computer Programming (International)', 'Diploma', 'Newnham Campus', 'Fall 2026', 2026,
     DATE '2026-07-25', 'enrolled', DATE '2026-08-30',
     18200, 'CAD', 13700, DATE '2026-08-20',
     'eligible', 'submitted', 'unpaid',
     2055, 2055, 15,
     v_snap_ananya, NULL,
     'none', NULL, NULL, NULL,
     NULL, 'Scholarship CAD 4,500 applied — commission on net tuition CAD 13,700',
     DATE '2026-09-15', DATE '2026-08-30',
     0, 2055,
     v_meta || '{"scenario":"scholarship","scholarship_amount":4500,"commissionable_tuition":13700}'::jsonb),

    -- S3 Rohan: pending — exercise Mark Eligible in UI
    (v_stu_rohan, v_cyc_seneca, v_seneca, v_route_seneca, 'direct',
     v_comm_seneca, v_av_seneca, v_ec_seneca, v_bp_seneca, NULL,
     'Rohan Mehta', 'SEN-2026-1201', 'India', 'India',
     'Marketing Management', 'Graduate Certificate', 'Newnham Campus', 'Fall 2026', 2026,
     DATE '2026-08-05', 'enrolled', DATE '2026-09-02',
     17500, 'CAD', 5000, DATE '2026-08-28',
     'pending', 'not_ready', 'unpaid',
     NULL, NULL, NULL,
     NULL, NULL,
     'none', NULL, NULL, NULL,
     NULL, NULL,
     NULL, NULL,
     0, NULL,
     v_meta || '{"scenario":"interactive_mark_eligible"}'::jsonb),

    -- S4 James: commission hold — outstanding tuition
    (v_stu_james, v_cyc_conestoga, v_conestoga, v_route_conestoga, 'direct',
     v_comm_conestoga, v_av_conestoga, v_ec_conestoga, v_bp_conestoga, v_rule_conestoga_base,
     'James Okonkwo', 'CON-2026-8834', 'Nigeria', 'Nigeria',
     'Business Diploma', 'Diploma', 'Kitchener - Doon Campus', 'Fall 2026', 2026,
     DATE '2026-07-10', 'enrolled', DATE '2026-08-20',
     16800, 'CAD', 4000, DATE '2026-08-01',
     'pending', 'not_ready', 'unpaid',
     2800, 2800, NULL,
     NULL, NULL,
     'active', 'tuition_pending', 'Outstanding tuition balance CAD 12,800 — commission on hold', NULL,
     NULL, NULL,
     NULL, NULL,
     0, 2800,
     v_meta || '{"scenario":"hold_outstanding_tuition"}'::jsonb),

    -- S5 Fatima: institution reduced approved commission
    (v_stu_fatima, v_cyc_conestoga, v_conestoga, v_route_conestoga, 'direct',
     v_comm_conestoga, v_av_conestoga, v_ec_conestoga, v_bp_conestoga, v_rule_conestoga_base,
     'Fatima Hassan', 'CON-2026-9012', 'Pakistan', 'Pakistan',
     'Software Engineering Technology', 'Advanced Diploma', 'Kitchener - Doon Campus', 'Fall 2026', 2026,
     DATE '2026-06-28', 'enrolled', DATE '2026-08-18',
     17200, 'CAD', 17200, DATE '2026-08-10',
     'eligible', 'approved', 'unpaid',
     2800, 2800, NULL,
     v_snap_fatima, v_inv_conestoga,
     'none', NULL, NULL, NULL,
     2400, 'Institution adjusted commission from CAD 2,800 to CAD 2,400 — program fee revision',
     DATE '2026-09-20', DATE '2026-08-18',
     0, 2400,
     v_meta || '{"scenario":"institution_reduced_commission"}'::jsonb),

    -- S6 Daniel: withdrawn
    (v_stu_daniel, v_cyc_humber, v_humber, v_route_humber, 'direct',
     v_comm_humber, v_av_humber, v_ec_humber, v_bp_humber, v_rule_humber_base,
     'Daniel Chen', 'HUM-2026-5521', 'China', 'China',
     'Hospitality Management', 'Diploma', 'North Campus', 'Fall 2026', 2026,
     DATE '2026-07-01', 'withdrawn', DATE '2026-08-05',
     17500, 'CAD', 5000, DATE '2026-07-15',
     'cancelled', 'rejected', 'unpaid',
     2450, 2450, 14,
     NULL, NULL,
     'none', NULL, 'Student withdrew before census — commission cancelled', NULL,
     NULL, 'Withdrawn 2026-09-01 — no commission payable',
     NULL, NULL,
     0, 0,
     v_meta || '{"scenario":"withdrawn","withdrawal_date":"2026-09-01"}'::jsonb),

    -- S7 Maria: deferred
    (v_stu_maria, v_cyc_sheridan, v_sheridan, v_route_sheridan, 'direct',
     v_comm_sheridan, v_av_sheridan, v_ec_sheridan, v_bp_sheridan, v_rule_sheridan_base,
     'Maria Santos', 'SHE-2026-3310', 'Philippines', 'Philippines',
     'Animation (Advanced)', 'Advanced Diploma', 'Trafalgar Road Campus', 'Fall 2026', 2026,
     DATE '2026-07-18', 'deferred', NULL,
     19200, 'CAD', 5000, DATE '2026-08-12',
     'eligible', 'not_ready', 'unpaid',
     2880, 2880, 15,
     NULL, NULL,
     'active', 'other', 'Semester break — return Winter 2027', DATE '2027-01-15',
     NULL, NULL,
     NULL, DATE '2026-08-25',
     0, 2880,
     v_meta || '{"scenario":"deferred","expected_return":"Winter 2027"}'::jsonb),

    -- S8 Ahmed source (Seneca) — transfer out
    (v_stu_ahmed_src, v_cyc_seneca, v_seneca, v_route_seneca, 'direct',
     v_comm_seneca, v_av_seneca, v_ec_seneca, v_bp_seneca, v_rule_seneca_base,
     'Ahmed Khan', 'SEN-2026-0991', 'Bangladesh', 'Bangladesh',
     'Business', 'Diploma', 'Newnham Campus', 'Fall 2026', 2026,
     DATE '2026-06-15', 'withdrawn', DATE '2026-07-30',
     17000, 'CAD', 8000, DATE '2026-07-01',
     'cancelled', 'carried_forward', 'unpaid',
     2800, 2800, NULL,
     NULL, NULL,
     'none', NULL, 'Transferred to Conestoga — source row closed', NULL,
     NULL, 'Transfer to Conestoga College — Fall 2026',
     DATE '2026-08-01', DATE '2026-07-30',
     0, 0,
     v_meta || '{"scenario":"transfer_source"}'::jsonb),

    -- S9 Ahmed replacement (Conestoga)
    (v_stu_ahmed_tgt, v_cyc_conestoga, v_conestoga, v_route_conestoga, 'direct',
     v_comm_conestoga, v_av_conestoga, v_ec_conestoga, v_bp_conestoga, v_rule_conestoga_base,
     'Ahmed Khan', 'CON-2026-7744', 'Bangladesh', 'Bangladesh',
     'Business', 'Diploma', 'Kitchener - Doon Campus', 'Fall 2026', 2026,
     DATE '2026-07-05', 'enrolled', DATE '2026-08-22',
     16800, 'CAD', 16800, DATE '2026-08-05',
     'eligible', 'ready', 'unpaid',
     3100, 3100, NULL,
     v_snap_ahmed_tgt, NULL,
     'none', NULL, 'Replacement row after transfer from Seneca', NULL,
     NULL, NULL,
     NULL, DATE '2026-08-22',
     0, 3100,
     v_meta || '{"scenario":"transfer_target","prior_institution":"Seneca Polytechnic"}'::jsonb);

  -- ── Snapshots (immutable audit) ───────────────────────────────────────────
  INSERT INTO public.upi_commission_snapshots (
    id, partnership_route_id, commission_id, institution_id, channel_type,
    student_commission_id, agreement_version_id, matched_rule_id,
    country, campus, program_name, program_category, intake_term,
    expected_amount, eligibility_date, currency, total_amount,
    rules_json, input_json, breakdown_json, snapshot_payload, metadata
  ) VALUES
    (v_snap_priya, v_route_seneca, v_comm_seneca, v_seneca, 'direct',
     v_stu_priya, v_av_seneca, v_rule_seneca_base,
     'India', 'Newnham Campus', 'Business Administration (International)', 'Business', 'Fall 2026',
     3500, DATE '2026-08-28', 'CAD', 3500,
     '[{"rule":"base","amount":3000},{"rule":"bonus","amount":500}]'::jsonb,
     '{"tuition":18000,"tuition_paid":18000}'::jsonb,
     '{"base":3000,"bonus":500,"total":3500}'::jsonb,
     jsonb_build_object('student_commission_id', v_stu_priya, 'expected_amount', 3500),
     v_meta || '{"student":"priya"}'::jsonb),
    (v_snap_ananya, v_route_seneca, v_comm_seneca, v_seneca, 'direct',
     v_stu_ananya, v_av_seneca, v_rule_seneca_base,
     'India', 'Newnham Campus', 'Computer Programming (International)', 'Technology', 'Fall 2026',
     2055, DATE '2026-08-30', 'CAD', 2055,
     '[{"rule":"percentage","rate":15,"base":13700}]'::jsonb,
     '{"tuition_gross":18200,"scholarship":4500,"commissionable_tuition":13700}'::jsonb,
     '{"scholarship":4500,"commissionable":13700,"commission":2055}'::jsonb,
     jsonb_build_object('student_commission_id', v_stu_ananya, 'expected_amount', 2055),
     v_meta || '{"student":"ananya","scenario":"scholarship"}'::jsonb),
    (v_snap_fatima, v_route_conestoga, v_comm_conestoga, v_conestoga, 'direct',
     v_stu_fatima, v_av_conestoga, v_rule_conestoga_base,
     'Pakistan', 'Kitchener - Doon Campus', 'Software Engineering Technology', 'Technology', 'Fall 2026',
     2800, DATE '2026-08-18', 'CAD', 2800,
     '[{"rule":"base","amount":2800}]'::jsonb,
     '{"tuition":17200}'::jsonb,
     '{"submitted":2800,"approved":2400}'::jsonb,
     jsonb_build_object('student_commission_id', v_stu_fatima, 'expected_amount', 2800, 'approved_amount', 2400),
     v_meta || '{"student":"fatima","scenario":"institution_reduced"}'::jsonb),
    (v_snap_ahmed_tgt, v_route_conestoga, v_comm_conestoga, v_conestoga, 'direct',
     v_stu_ahmed_tgt, v_av_conestoga, v_rule_conestoga_base,
     'Bangladesh', 'Kitchener - Doon Campus', 'Business', 'Business', 'Fall 2026',
     3100, DATE '2026-08-22', 'CAD', 3100,
     '[{"rule":"transfer_recalc","amount":3100}]'::jsonb,
     '{"transfer_from":"Seneca Polytechnic","original_expected":2800}'::jsonb,
     '{"replacement":3100}'::jsonb,
     jsonb_build_object('student_commission_id', v_stu_ahmed_tgt, 'expected_amount', 3100),
     v_meta || '{"student":"ahmed","scenario":"transfer_target"}'::jsonb);

  -- ── Transfer event ────────────────────────────────────────────────────────
  INSERT INTO public.upi_commission_transfer_events (
    id, institution_id, source_student_commission_id, replacement_student_commission_id,
    from_route_id, to_route_id, from_institution_id, to_institution_id,
    event_status, outcome, transfer_reason, notes, metadata
  ) VALUES (
    v_xfer, v_seneca, v_stu_ahmed_src, v_stu_ahmed_tgt,
    v_route_seneca, v_route_conestoga, v_seneca, v_conestoga,
    'resolved', 'replaced', 'Program transfer',
    'Ahmed Khan transferred Seneca Business → Conestoga Business. Source commission cancelled; replacement recalculated CAD 3,100.',
    v_meta || '{"scenario":"transfer"}'::jsonb
  );

  -- ── Invoices ──────────────────────────────────────────────────────────────
  INSERT INTO public.upi_commission_invoices (
    id, institution_id, claim_cycle_id, commission_id, billing_profile_id,
    invoice_number, invoice_date, due_date,
    institution_name, subtotal, total_amount, currency, invoice_currency,
    total_students, eligible_students, status,
    amount_received, amount_outstanding, last_receipt_id,
    submitted_date, approved_date, metadata
  ) VALUES
    (v_inv_seneca, v_seneca, v_cyc_seneca, v_comm_seneca, v_bp_seneca,
     'FLC-2026-SEN-DEMO-001', DATE '2026-09-20', DATE '2026-11-30',
     'Seneca Polytechnic', 3500, 3500, 'CAD', 'CAD',
     1, 1, 'partially_paid',
     2000, 1500, v_rcpt_partial,
     DATE '2026-09-15', DATE '2026-09-25', v_meta || '{"scenario":"partial_payment"}'::jsonb),
    (v_inv_conestoga, v_conestoga, v_cyc_conestoga, v_comm_conestoga, v_bp_conestoga,
     'FLC-2026-CON-DEMO-001', DATE '2026-09-22', DATE '2026-12-15',
     'Conestoga College', 2400, 2400, 'CAD', 'CAD',
     1, 1, 'submitted',
     0, 2400, NULL,
     DATE '2026-09-20', DATE '2026-09-28', v_meta || '{"scenario":"institution_reduced"}'::jsonb);

  INSERT INTO public.upi_invoice_line_items (
    id, invoice_id, student_id, description, student_name, program_name, intake_term,
    tuition_amount, commission_rate, line_amount, amount_received, line_outstanding, sort_order
  ) VALUES
    (v_li_priya, v_inv_seneca, v_stu_priya,
     'Commission — Priya Sharma (base CAD 3,000 + bonus CAD 500)',
     'Priya Sharma', 'Business Administration (International)', 'Fall 2026',
     18000, NULL, 3500, 2000, 1500, 1),
    (v_li_fatima, v_inv_conestoga, v_stu_fatima,
     'Commission — Fatima Hassan (institution approved CAD 2,400)',
     'Fatima Hassan', 'Software Engineering Technology', 'Fall 2026',
     17200, NULL, 2400, 0, 2400, 1);

  -- ── Receipts: posted partial (Seneca) + draft (Conestoga wizard exercise) ─
  INSERT INTO public.upi_commission_receipts (
    id, receipt_number, status, payer_type, payer_id, payer_name_snapshot,
    institution_id, context_institution_id,
    remittance_reference, bank_reference, receipt_date, posting_date,
    receipt_currency, receipt_amount, exchange_rate, base_currency,
    amount_allocated, unallocated_amount, fx_review_status, payment_method, notes, metadata,
    posted_at
  ) VALUES
    (v_rcpt_partial, 'RCPT-2026-SEN-DEMO-001', 'posted', 'institution', v_seneca, 'Seneca Polytechnic',
     v_seneca, v_seneca,
     'SEN-EFT-20260925-A', 'TD-WIRE-88421', DATE '2026-09-25', DATE '2026-09-25',
     'CAD', 2000, 1, 'CAD',
     2000, 0, 'not_required', 'wire',
     'Partial commission remittance — balance CAD 1,500 outstanding on Priya Sharma',
     v_meta || '{"scenario":"partial_payment"}'::jsonb, now()),
    (v_rcpt_draft, 'RCPT-2026-CON-DRAFT-001', 'draft', 'institution', v_conestoga, 'Conestoga College',
     v_conestoga, v_conestoga,
     NULL, NULL, DATE '2026-09-30', NULL,
     'CAD', 2400, 1, 'CAD',
     0, 2400, 'not_required', NULL,
     'Draft receipt for UAT — allocate to Fatima Hassan invoice in Receipt Wizard',
     v_meta || '{"scenario":"receipt_wizard_uat"}'::jsonb, NULL);

  INSERT INTO public.upi_commission_receipt_invoice_allocations (
    id, receipt_id, invoice_id, amount_allocated, currency
  ) VALUES (
    v_rcpt_ia, v_rcpt_partial, v_inv_seneca, 2000, 'CAD'
  );

  INSERT INTO public.upi_commission_receipt_student_allocations (
    id, receipt_id, invoice_allocation_id, student_commission_id, invoice_line_item_id,
    snapshot_id, amount_allocated, currency, allocation_method
  ) VALUES (
    v_rcpt_sa, v_rcpt_partial, v_rcpt_ia, v_stu_priya, v_li_priya,
    v_snap_priya, 2000, 'CAD', 'full_line'
  );

  RAISE NOTICE 'Commission Direct Partner demo seed applied (pack=%)', v_pack;
END;
$$;

COMMENT ON FUNCTION public.fn_seed_commission_direct_partner_demo IS
  'Idempotent UAT demo: Seneca, Conestoga, Humber, Sheridan direct institution commission workflows.';

SELECT public.fn_seed_commission_direct_partner_demo();
