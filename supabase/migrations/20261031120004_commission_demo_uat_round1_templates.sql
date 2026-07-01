-- UAT Round 1: institution submission templates + expanded demo scenarios
-- Re-run: SELECT public.fn_seed_commission_direct_partner_demo();

CREATE OR REPLACE FUNCTION public.fn_apply_commission_demo_uat_templates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack constant text := 'crm-direct-uat-v1';
  v_seneca constant uuid := '11111111-1111-1111-1111-111111110001';
  v_conestoga constant uuid := '11111111-1111-1111-1111-111111110002';
  v_cyc_seneca constant uuid := 'd1e00701-0001-4000-8000-000000000001';
  v_cyc_humber constant uuid := 'd1e00703-0003-4000-8000-000000000003';
  v_cyc_sheridan constant uuid := 'd1e00704-0004-4000-8000-000000000004';
  v_humber uuid;
  v_sheridan uuid;
  v_route_seneca uuid;
  v_route_humber uuid;
  v_route_sheridan uuid;
  v_comm_seneca constant uuid := 'd1e00401-0001-4000-8000-000000000001';
  v_comm_humber constant uuid := 'd1e00403-0003-4000-8000-000000000003';
  v_comm_sheridan constant uuid := 'd1e00404-0004-4000-8000-000000000004';
  v_av_seneca constant uuid := 'd1e00311-0001-4000-8000-000000000011';
  v_av_humber constant uuid := 'd1e00313-0003-4000-8000-000000000013';
  v_av_sheridan constant uuid := 'd1e00314-0004-4000-8000-000000000014';
  v_ec_seneca constant uuid := 'd1e00601-0001-4000-8000-000000000001';
  v_ec_humber constant uuid := 'd1e00603-0003-4000-8000-000000000003';
  v_ec_sheridan constant uuid := 'd1e00604-0004-4000-8000-000000000004';
  v_bp_seneca constant uuid := 'd1e00501-0001-4000-8000-000000000001';
  v_bp_conestoga constant uuid := 'd1e00502-0002-4000-8000-000000000002';
  v_bp_humber constant uuid := 'd1e00503-0003-4000-8000-000000000003';
  v_bp_sheridan constant uuid := 'd1e00504-0004-4000-8000-000000000004';
  v_meta jsonb := jsonb_build_object('demo_pack', v_pack);
BEGIN
  SELECT id INTO v_humber FROM public.upi_institutions
  WHERE public.upi_institution_dedup_key(name, country_name) = public.upi_institution_dedup_key('Humber Polytechnic', 'Canada')
  ORDER BY is_partner DESC NULLS LAST LIMIT 1;
  SELECT id INTO v_sheridan FROM public.upi_institutions
  WHERE public.upi_institution_dedup_key(name, country_name) = public.upi_institution_dedup_key('Sheridan College', 'Canada')
  ORDER BY is_partner DESC NULLS LAST LIMIT 1;

  SELECT id INTO v_route_seneca FROM public.upi_partnership_routes WHERE institution_id = v_seneca AND channel_type = 'direct' LIMIT 1;
  SELECT id INTO v_route_humber FROM public.upi_partnership_routes WHERE institution_id = v_humber AND channel_type = 'direct' LIMIT 1;
  SELECT id INTO v_route_sheridan FROM public.upi_partnership_routes WHERE institution_id = v_sheridan AND channel_type = 'direct' LIMIT 1;

  -- Institution + billing submission templates (metadata-driven — no hardcoded UI logic)
  UPDATE public.upi_institutions SET metadata = metadata || jsonb_build_object(
    'claim_submission_template', jsonb_build_object(
      'label', 'Seneca Email + Excel Standard',
      'method', 'Email + Excel',
      'excel', true, 'word', false, 'portal', false,
      'tax', 'HST', 'academic_period', 'Semester', 'academic_terminology', 'Semester',
      'required_columns', jsonb_build_array('Student Name', 'Program', 'Level', 'Intake', 'Commission Amount'),
      'column_order', jsonb_build_array('Student Name', 'Program', 'Level', 'Intake', 'Gross Tuition', 'Scholarship', 'Commission Amount'),
      'invoice_numbering', 'FLC-{YYYY}-SEN-{SEQ}',
      'email_subject', 'Commission claim — Seneca Polytechnic — {period}',
      'attachments', jsonb_build_array('excel', 'student_schedule', 'cover_email'),
      'checklist', jsonb_build_array('Validate claim', 'Freeze snapshots', 'Export Excel', 'Send email')
    )
  ) WHERE id = v_seneca;

  UPDATE public.upi_billing_profiles SET metadata = metadata || jsonb_build_object(
    'tax_type', 'HST',
    'claim_submission_template', jsonb_build_object(
      'label', 'Conestoga Word + GST Package',
      'method', 'Email + Word document',
      'excel', false, 'word', true, 'portal', false,
      'tax', 'GST', 'academic_period', 'Term', 'academic_terminology', 'Term',
      'required_columns', jsonb_build_array('Student', 'Program', 'Term', 'Commissionable Tuition', 'Commission'),
      'column_order', jsonb_build_array('Student', 'Program', 'Level', 'Term', 'Outstanding Balance', 'Commission'),
      'invoice_numbering', 'FLC-{YYYY}-CON-{SEQ}',
      'attachments', jsonb_build_array('word_cover_letter', 'student_schedule'),
      'checklist', jsonb_build_array('Validate claim', 'Generate Word cover', 'Attach schedule', 'Email accounts payable')
    )
  ) WHERE id = v_bp_conestoga;

  UPDATE public.upi_billing_profiles SET metadata = metadata || jsonb_build_object(
    'tax_type', 'HST',
    'claim_submission_template', jsonb_build_object(
      'label', 'Humber Semester Excel Package',
      'method', 'Email + Excel',
      'excel', true, 'word', false, 'portal', false,
      'tax', 'HST', 'academic_period', 'Semester', 'academic_terminology', 'Semester',
      'required_columns', jsonb_build_array('Student Name', 'Program', 'Semester', 'Tuition Paid', 'Commission %', 'Commission Amount'),
      'column_order', jsonb_build_array('Student Name', 'Program', 'Semester', 'Tuition Paid', 'Commission %', 'Commission Amount'),
      'invoice_numbering', 'FLC-{YYYY}-HUM-{SEQ}',
      'attachments', jsonb_build_array('excel', 'semester_schedule'),
      'checklist', jsonb_build_array('Validate claim', 'Export semester Excel', 'Attach HST summary', 'Send email')
    )
  ) WHERE id = v_bp_humber;

  UPDATE public.upi_billing_profiles SET metadata = metadata || jsonb_build_object(
    'claim_submission_template', jsonb_build_object(
      'label', 'Sheridan Portal Direct Payment',
      'method', 'Portal submission only',
      'excel', false, 'word', false, 'portal', true,
      'requires_invoice', false, 'direct_payment_only', true,
      'portal_url', 'https://portal.sheridancollege.ca/agent-commissions',
      'tax', 'HST', 'academic_period', 'Trimester', 'academic_terminology', 'Trimester',
      'required_columns', jsonb_build_array('Student ID', 'Program', 'Trimester', 'Commission'),
      'column_order', jsonb_build_array('Student ID', 'Student Name', 'Program', 'Trimester', 'Commission'),
      'attachments', jsonb_build_array('portal_confirmation'),
      'checklist', jsonb_build_array('Validate claim', 'Enter portal', 'Save portal reference', 'Record direct payment')
    )
  ) WHERE id = v_bp_sheridan;

  UPDATE public.upi_institutions SET metadata = metadata || jsonb_build_object(
    'submission_method', 'Portal submission only'
  ) WHERE id = v_sheridan;

  -- Additional Seneca students (UAT Round 1 — 8 students on Seneca cycle)
  INSERT INTO public.upi_commission_students (
    id, claim_cycle_id, institution_id, partnership_route_id, channel_type,
    commission_id, agreement_version_id, eligibility_config_id, billing_profile_id,
    student_name, student_id_at_institution, nationality, country_of_origin,
    program_name, program_level, campus, intake_term, intake_year,
    study_permit_approved_date, enrollment_status, enrollment_confirmed_date,
    tuition_amount, tuition_currency, tuition_paid_amount, tuition_paid_date,
    eligibility_status, claim_status, payment_status,
    expected_amount, commission_amount, commission_rate_applied,
    hold_status, hold_reason, hold_notes,
    commission_period_code, commission_period_label,
    institution_validation_notes, metadata
  ) VALUES
    ('d1e00810-0010-4000-8000-000000000010', v_cyc_seneca, v_seneca, v_route_seneca, 'direct',
     v_comm_seneca, v_av_seneca, v_ec_seneca, v_bp_seneca,
     'Kavya Reddy', 'SEN-2026-1305', 'India', 'India',
     'Financial Services', 'Graduate Certificate', 'Newnham Campus', 'Fall 2026', 2026,
     DATE '2026-08-01', 'enrolled', DATE '2026-09-01',
     17800, 'CAD', 13350, DATE '2026-08-25',
     'eligible', 'ready', 'unpaid',
     2002.5, 2002.5, 15,
     'none', NULL, NULL,
     '2026-FALL-S1', 'Fall 2026 Semester 1',
     'Second scholarship scenario — CAD 4,450 entrance award',
     v_meta || '{"scenario":"scholarship_2","scholarship_amount":4450,"business_notes":"Entrance scholarship — verify net tuition"}'::jsonb),
    ('d1e00811-0011-4000-8000-000000000011', v_cyc_seneca, v_seneca, v_route_seneca, 'direct',
     v_comm_seneca, v_av_seneca, v_ec_seneca, v_bp_seneca,
     'Oluwaseun Adeyemi', 'SEN-2026-1312', 'Nigeria', 'Nigeria',
     'International Business', 'Diploma', 'Newnham Campus', 'Fall 2026', 2026,
     DATE '2026-07-28', 'enrolled', DATE '2026-08-22',
     17600, 'CAD', 6000, DATE '2026-08-10',
     'pending', 'not_ready', 'unpaid',
     2800, 2800, NULL,
     'active', 'tuition_pending', 'Outstanding tuition CAD 11,600 — payment plan in place',
     '2026-FALL-S1', 'Fall 2026 Semester 1',
     NULL,
     v_meta || '{"scenario":"outstanding_tuition","business_notes":"Follow up with student on Nov payment"}'::jsonb),
    ('d1e00812-0012-4000-8000-000000000012', v_cyc_seneca, v_seneca, v_route_seneca, 'direct',
     v_comm_seneca, v_av_seneca, v_ec_seneca, v_bp_seneca,
     'Yuki Tanaka', 'SEN-2026-1320', 'Japan', 'Japan',
     'Hospitality Management', 'Diploma', 'Newnham Campus', 'Fall 2026', 2026,
     DATE '2026-07-15', 'deferred', NULL,
     17400, 'CAD', 5000, DATE '2026-08-05',
     'eligible', 'not_ready', 'unpaid',
     3000, 3000, NULL,
     'active', 'other', 'Deferred to Winter 2027 — semester break',
     '2026-FALL-S1', 'Fall 2026 Semester 1',
     NULL,
     v_meta || '{"scenario":"deferred","expected_return":"Winter 2027"}'::jsonb),
    ('d1e00813-0013-4000-8000-000000000013', v_cyc_seneca, v_seneca, v_route_seneca, 'direct',
     v_comm_seneca, v_av_seneca, v_ec_seneca, v_bp_seneca,
     'Elena Petrova', 'SEN-2026-1333', 'Russia', 'Russia',
     'Business Administration', 'PG Diploma', 'Newnham Campus', 'Fall 2026', 2026,
     DATE '2026-08-10', 'enrolled', DATE '2026-09-05',
     18000, 'CAD', 18000, DATE '2026-08-28',
     'eligible', 'approved', 'unpaid',
     3500, 3500, NULL,
     'none', NULL, NULL,
     '2026-FALL-S1', 'Fall 2026 Semester 1',
     'Institution reduced from CAD 3,500 to CAD 3,200 — program fee adjustment',
     v_meta || '{"scenario":"institution_reduced_commission"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    metadata = EXCLUDED.metadata,
    institution_validation_notes = EXCLUDED.institution_validation_notes,
    hold_status = EXCLUDED.hold_status,
    hold_reason = EXCLUDED.hold_reason,
    hold_notes = EXCLUDED.hold_notes,
    expected_amount = EXCLUDED.expected_amount,
    approved_amount = 3200,
    commission_period_code = EXCLUDED.commission_period_code,
    commission_period_label = EXCLUDED.commission_period_label;

  UPDATE public.upi_commission_students SET approved_amount = 3200
  WHERE id = 'd1e00813-0013-4000-8000-000000000013';

  -- Humber: ready enrolled student for semester Excel claim
  INSERT INTO public.upi_commission_students (
    id, claim_cycle_id, institution_id, partnership_route_id, channel_type,
    commission_id, agreement_version_id, eligibility_config_id, billing_profile_id,
    student_name, student_id_at_institution, nationality, country_of_origin,
    program_name, program_level, campus, intake_term, intake_year,
    enrollment_status, enrollment_confirmed_date,
    tuition_amount, tuition_currency, tuition_paid_amount, tuition_paid_date,
    eligibility_status, claim_status, payment_status,
    expected_amount, commission_amount, commission_rate_applied,
    commission_period_code, commission_period_label, metadata
  ) VALUES
    ('d1e00820-0020-4000-8000-000000000020', v_cyc_humber, v_humber, v_route_humber, 'direct',
     v_comm_humber, v_av_humber, v_ec_humber, v_bp_humber,
     'Sarah Okafor', 'HUM-2026-5601', 'Nigeria', 'Nigeria',
     'Business Management', 'Diploma', 'North Campus', 'Fall 2026', 2026,
     'enrolled', DATE '2026-08-30',
     17500, 'CAD', 17500, DATE '2026-08-20',
     'eligible', 'ready', 'unpaid',
     2450, 2450, 14,
     '2026-FALL-S1', 'Fall 2026 Semester 1',
     v_meta || '{"scenario":"humber_semester_ready","business_notes":"HST applies — semester Excel submission"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Sheridan: portal direct payment received (no invoice)
  INSERT INTO public.upi_commission_students (
    id, claim_cycle_id, institution_id, partnership_route_id, channel_type,
    commission_id, agreement_version_id, eligibility_config_id, billing_profile_id,
    student_name, student_id_at_institution, nationality, country_of_origin,
    program_name, program_level, campus, intake_term, intake_year,
    enrollment_status, enrollment_confirmed_date,
    tuition_amount, tuition_currency, tuition_paid_amount, tuition_paid_date,
    eligibility_status, claim_status, payment_status,
    expected_amount, commission_amount, commission_rate_applied,
    amount_received, amount_outstanding,
    commission_period_code, commission_period_label,
    submitted_by_agency_date, metadata
  ) VALUES
    ('d1e00830-0030-4000-8000-000000000030', v_cyc_sheridan, v_sheridan, v_route_sheridan, 'direct',
     v_comm_sheridan, v_av_sheridan, v_ec_sheridan, v_bp_sheridan,
     'Lucas Ferreira', 'SHE-2026-3401', 'Brazil', 'Brazil',
     'Film and Television', 'Advanced Diploma', 'Trafalgar Road Campus', 'Fall 2026', 2026,
     'enrolled', DATE '2026-09-01',
     19200, 'CAD', 19200, DATE '2026-08-18',
     'eligible', 'approved', 'paid',
     2880, 2880, 15,
     2880, 0,
     '2026-FALL-T1', 'Fall 2026 Trimester 1',
     DATE '2026-09-10',
     v_meta || '{"scenario":"portal_direct_payment","portal_reference":"SHE-PORTAL-2026-8842","last_payment_date":"2026-10-05","business_notes":"Paid via Sheridan agent portal — no invoice"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_commission_demo_uat_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_apply_commission_demo_uat_templates() TO service_role;

COMMENT ON FUNCTION public.fn_apply_commission_demo_uat_templates IS
  'UAT Round 1: institution submission templates + expanded demo students. Idempotent.';
